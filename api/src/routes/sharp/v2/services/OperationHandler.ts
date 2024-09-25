import chalk from 'chalk';
import _ from 'lodash';

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import { CachedOperation, CachedOperationMap } from './ImageEditor.js';

import Context, { CompletedOperationObject } from '../Context.js';
import Image from '../Image.js';
import Operation, { IGeneralOperation, IOperation } from '../Operation.js';
import { ValidInputObject } from '../validateInput.js';
import OperationMeta from '../OperationMeta.js';
import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import { GenericRecordType } from '../../../../utils/typebox/index.js';

interface ExportObj {
    default: unknown;
}
const operationPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', 'operations');

export default class OperationHandler {
    private readonly cache: Record<string, CachedOperationMap> = {};
    private readonly operations = new Map<string, IOperation>();

    public constructor(public readonly logger: DefaultLogger) {
        void this.initOperations();
    }

    public getOperation(context: Context, inputOperation: GenericRecordType): IOperation | undefined {
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

    public getCachedBuffer(image: Image, input: ValidInputObject): { buffer: Buffer; remainingOperations: GenericRecordType[]; } | undefined {
        if (!(input.background in this.cache))
            return;
        let remainingOperations: GenericRecordType[] = input.operations;
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

            const isValid = operation.isValidData(input.operations[i].data);
            if (!isValid) {
                image.context.addDebug('error', `[${operation.name}:${i}]: Invalid data`);
                continue;
            }
            const validOperationObject = {
                type: operation.name,
                data: input.operations[i].data
            };

            if (validOperationObject.type in cachedOperations) {
                for (const cachedOperation of cachedOperations[validOperationObject.type]) {
                    if (this.isEqual(validOperationObject, cachedOperation)) {
                        const cachedSummary = new OperationMeta(cachedOperation.type, cachedOperation.data, image);
                        image.context.addOperation(cachedSummary, cachedOperation.buffer);

                        currentOperation = cachedOperation;
                        cachedUntilOperation = i + 1;

                        if (cachedOperation.nextOperationMap === undefined) {
                            break mainOperationLoop;
                        }
                        cachedOperations = cachedOperation.nextOperationMap;
                        continue mainOperationLoop;
                    }
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
            this.cache[image.background] = {};

        let currentBranch = this.cache[image.background];

        appliedOperationloop:
        for (const appliedOperation of appliedOperations) {
            const type = appliedOperation.type;
            // Check if the same operation has been applied before
            if (type in currentBranch) {
                for (const cachedOperation of currentBranch[type]) {
                    if (this.isEqual(appliedOperation, cachedOperation)) {
                        if (cachedOperation.nextOperationMap === undefined)
                            cachedOperation.nextOperationMap = {};
                        currentBranch = cachedOperation.nextOperationMap;
                        continue appliedOperationloop;
                    }
                }
            }

            if (!(type in currentBranch))
                currentBranch[type] = [];
            const nextBranch: CachedOperation = { ...appliedOperation, nextOperationMap: {} };
            currentBranch[type].push(nextBranch);
            currentBranch = nextBranch.nextOperationMap!;
        }
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

            await import(path.join(operationPath, fileName)).then((contents: unknown) => {
                //? Check if it's an object with a 'default' property
                if (this.isExportObject(contents)) {
                    if (this.isOperation(contents)) {
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

    private createHaltedSummary(context: Context, error: string, info?: { type?: string; data?: unknown; }): OperationMeta {
        const unknownOperationMeta = new OperationMeta(info?.type ?? '', info?.data ?? undefined, context.image);
        unknownOperationMeta.addError(error).halt();
        return unknownOperationMeta;
    };

    private isEqual(operation: GenericRecordType | CompletedOperationObject, cachedOperation: CachedOperation): boolean {
        return _.isEqual(this.removeCacheKeys(operation), this.removeCacheKeys(cachedOperation));
    }

    private removeCacheKeys(object: GenericRecordType | CachedOperation | CompletedOperationObject, include = ['type', 'data']): GenericRecordType {
        return _.omit(object, Object.keys(object).filter((e) => !include.includes(e)));
    }
}
