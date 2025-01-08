import chalk from 'chalk';
import _ from 'lodash';

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import { CachedOperation, CachedOperationMap, ImageEditor } from './ImageEditor.js';

import { CompletedOperationObject } from '../Context.js';
import Image from '../Image.js';
import Operation, { IGeneralOperation, IOperation } from '../Operation.js';
import { ValidInputObject } from '../validateInput.js';
import OperationMeta from '../OperationMeta.js';
import { GenericRecordType } from '../../../../utils/typebox/index.js';
import SharpRoute from '../SharpRoute.js';

const operationAliases = {
    t: 'type',
    d: 'data'
};

interface ExportObj {
    default: unknown;
}

export type OperationReturn = { instance: IOperation } | { error: string };

const operationPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', 'operations');

export default class OperationHandler {
    public readonly logger: SharpRoute['logger'];
    private readonly cache: Record<string, CachedOperationMap> = {};
    private readonly operations = new Map<string, IOperation>();

    public constructor(public readonly editor: ImageEditor) {
        this.logger = editor.logger;
        void this.initOperations();
    }

    public getOperation(inputOperation: GenericRecordType): OperationReturn {
        // Convert any aliases
        for (const key of Object.keys(inputOperation)) {
            if (!(key in operationAliases))
                continue;
            inputOperation[operationAliases[key as keyof typeof operationAliases]] = inputOperation[key];
            delete inputOperation[key];
        }
        // Maybe remove the error logging from this
        if (!('type' in inputOperation) || typeof inputOperation.type !== 'string') {
            this.logger.log.operation(chalk.red('Invalid operation object:'), chalk.red.bold(JSON.stringify(inputOperation)));
            return { error: `Invalid operation object: ${JSON.stringify(inputOperation)}` };
        }
        const operation = this.operations.get(inputOperation.type);
        if (operation === undefined) {
            this.logger.log.operation(chalk.red('Invalid operation type:'), chalk.red.bold(inputOperation.type));
            return { error: `Invalid operation type: ${inputOperation.type}` };
        }
        return { instance: operation };
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
            const operation = this.getOperation(input.operations[i]);
            if ('error' in operation) {
                continue;
            }

            const isValid = operation.instance.isValidData(input.operations[i].data);
            if (!isValid) {
                image.context.addDebug('error', `[${operation.instance.name}:${i}]: Invalid data`);
                continue;
            }
            const validOperationObject = {
                type: operation.instance.name,
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
            const operation = new operationClass(this.editor);
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
                        operations.push(contents.default as IGeneralOperation);
                    }
                }
            }).catch((err) => {
                this.logger.log.error(err);
            });
        }
        return operations;
    }

    // private createHaltedSummary(context: Context, error: string, info?: { type?: string; data?: unknown; }): OperationMeta {
    //     const unknownOperationMeta = new OperationMeta(info?.type ?? '', info?.data ?? undefined, context.image);
    //     unknownOperationMeta.addError(error).halt();
    //     return unknownOperationMeta;
    // };

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

    private isEqual(operation: GenericRecordType | CompletedOperationObject, cachedOperation: CachedOperation): boolean {
        return _.isEqual(this.removeCacheKeys(operation), this.removeCacheKeys(cachedOperation));
    }

    private removeCacheKeys(object: GenericRecordType | CachedOperation | CompletedOperationObject, include = ['type', 'data']): GenericRecordType {
        return _.omit(object, Object.keys(object).filter((e) => !include.includes(e)));
    }
}
