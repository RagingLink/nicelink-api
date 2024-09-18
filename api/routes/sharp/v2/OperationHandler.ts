import chalk from 'chalk';
import _ from 'lodash';

import fs from 'fs';
import { fileURLToPath } from 'url';

import Context, { CompletedOperationObject } from './Context.js';
import Image from './Image.js';
import Operation, { IGeneralOperation, IOperation } from './Operation.js';
import { CachedOperation } from './services/ImageEditor.js';
import { ValidInputObject } from './validateInput.js';
import OperationSummary from './OperationSummary.js';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';

interface ExportObj {
    default: unknown;
}
const operationPath = fileURLToPath(new URL('.', import.meta.url)) + '/operations/';

export default class OperationHandler {
    private readonly cache: Record<string, CachedOperation[]> = {};
    private readonly operations = new Map<string, IOperation>();

    public constructor(public readonly logger: DefaultLogger) {
        void this.initOperations();
    }

    public getOperation(context: Context, inputOperation: JObject): IOperation | undefined {
        // Maybe remove the errors from this
        if (!('type' in inputOperation) || typeof inputOperation.type !== 'string') {
            this.logger.log.operation(chalk.red('Invalid operation object:'), chalk.red.bold(JSON.stringify(inputOperation)));
            // Create stubby summary objecy for the invalid object
            const invalidOperationSummary = this.createHaltedSummary(context, `Invalid operation object: ${JSON.stringify(inputOperation)}`);
            context.addOperation(invalidOperationSummary);
            return;
        }
        const operation = this.operations.get(inputOperation.type);
        if (operation === undefined) {
            this.logger.log.operation(chalk.red('Invalid operation type:'), chalk.red.bold(inputOperation.type));
            const invalidTypeSummary = this.createHaltedSummary(context, 'Invalid operation type', { type: inputOperation.type, data: inputOperation.data });
            context.addOperation(invalidTypeSummary);
            return;
        }
        return operation;
    }

    public getCachedBuffer(image: Image, input: ValidInputObject): { buffer: Buffer; remainingOperations: JObject[]; } | undefined {
        if (!(input.background in this.cache))
            return;
        let remainingOperations: JObject[] = input.operations;
        // The cached operation that it's currently using
        let currentOperation: CachedOperation | undefined;
        // The array of operations that are cached
        let cachedOperations = this.cache[input.background];
        let cachedUntilOperation = 0;
        mainOperationLoop:
        for (let i = 0; i < input.operations.length; i++) {
            const operation = this.getOperation(image.context, input.operations[i]);
            if (operation === undefined)
                continue;

            const operationData = operation.validateData(image.context, input.operations[i].data);
            if (operationData === undefined)
                continue; //TODO error/warning

            const validOperationObject = {
                type: operation.name,
                data: operationData as JToken
            };

            for (const cachedOperation of cachedOperations) {
                if (this.isEqual(validOperationObject, cachedOperation)) {
                    const cachedSummary = new OperationSummary(cachedOperation.type, cachedOperation.data, image);
                    image.context.addOperation(cachedSummary, cachedOperation.buffer);
                    currentOperation = cachedOperation;
                    cachedUntilOperation = i + 1;
                    this.logger.log.operation(operation.name, 'Using cache');
                    if (cachedOperation.nextOperations === undefined) {
                        break mainOperationLoop;
                    }
                    cachedOperations = cachedOperation.nextOperations;
                    continue mainOperationLoop;
                }
            }
            cachedUntilOperation = i;
            break mainOperationLoop;
        }
        remainingOperations = input.operations.slice(cachedUntilOperation);

        return currentOperation !== undefined ? {
            buffer: currentOperation.buffer,
            remainingOperations
        } : undefined;
    }

    public cacheOperations(image: Image): void {
        const appliedOperations = image.context.getAppliedOperations();
        if (!(image.background in this.cache))
            this.cache[image.background] = [];

        // The cached operation that it's currently using
        let currentOperation: CachedOperation | undefined;
        // The array of operations that are cached
        let cachedOperations = this.cache[image.background];
        let newOperations = 0;

        mainOperationLoop:
        for (const operation of appliedOperations) {
            if (cachedOperations.length !== 0) {
                for (const cachedOperation of cachedOperations)
                    if (this.isEqual(operation, cachedOperation)) {
                        currentOperation = cachedOperation;
                        cachedOperations = cachedOperation.nextOperations ?? [];
                        continue mainOperationLoop;
                    }
            }
            newOperations++;
            if (currentOperation !== undefined) {
                cachedOperations = [];
                if (currentOperation.nextOperations === undefined)
                    currentOperation.nextOperations = [];
                currentOperation.nextOperations.push(operation);

                // Update currentOperation
                currentOperation = currentOperation.nextOperations[currentOperation.nextOperations.length - 1];
                continue;
            }
            this.cache[image.background].push(operation);
            currentOperation = operation;
        }
        this.logger.log.operation('OperationHandler', `Added ${newOperations} operations`);
    }

    private async initOperations(): Promise<void> {
        let operationCount = 0;
        const operations = await this.loadOperations();
        for (const operationClass of operations) {
            const operation = new operationClass(this.logger);
            if (this.operations.has(operation.name)) {
                this.logger.log.error('OPERATION:', operation.name, 'already exists');
                this.logger.log.error('Cancelled loading of operations');
                break;
            }
            this.operations.set(operation.name, operation);
            operationCount++;
            if (operation.aliases.length > 0)
                aliasloop:
                for (const alias of operation.aliases) {
                    if (this.operations.has(alias)) {
                        this.logger.log.error(`Alias ${alias} of operation ${operation.name} already exists`);
                        continue aliasloop;
                    }

                    this.operations.set(alias, operation);
                }
        }
        this.logger.log.operation(`Initialized ${operationCount} operations`);
    }

    private async loadOperations(): Promise<IGeneralOperation[]> {
        const operations: IGeneralOperation[] = [];
        const operationFiles = fs.readdirSync(operationPath);

        for (const fileName of operationFiles) {
            if (!fileName.endsWith('.js'))
                continue;

            await import(operationPath + fileName).then((contents: unknown) => {
                //? Check if it's an object with a 'default' property
                if (this.isExportObject(contents)) {
                    if (this.isOperation(contents)) {
                        this.logger.log.operation('yes');
                        // The infamous as unknown as 'type' moment
                        operations.push(contents.default as unknown as IGeneralOperation);
                    }
                }
            }).catch((err) => {
                this.logger.log.error(err);
            });
        }
        return operations;
    }

    private isExportObject(contents: unknown): contents is ExportObj {
        if (typeof contents === 'object' && !Array.isArray(contents) && contents !== null) {
            return 'default' in contents;
        }
        return false;
    }

    private isOperation(contents: ExportObj): boolean {
        if (typeof contents.default !== 'function')
            return false;
        return Operation.prototype.isPrototypeOf(contents.default.prototype);
    }

    private createHaltedSummary(context: Context, error: string, info?: { type?: string; data?: unknown; }): OperationSummary {
        const unknownOperationSummary = new OperationSummary(info?.type ?? '', info?.data ?? undefined, context.image);
        unknownOperationSummary.addError(error).halt();
        return unknownOperationSummary;
    };

    private isEqual(operation: JObject | CompletedOperationObject, cachedOperation: CachedOperation): boolean {
        return _.isEqual(this.removeCacheKeys(operation), this.removeCacheKeys(cachedOperation));
    }

    private removeCacheKeys(object: JObject | CachedOperation | CompletedOperationObject, include = ['type', 'data']): JObject {
        return _.omit(object, Object.keys(object).filter((e) => !include.includes(e)));
    }
}
