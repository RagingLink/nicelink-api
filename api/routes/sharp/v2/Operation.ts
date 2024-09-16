import chalk from 'chalk';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../utils/mapping/index.js';
import Timer from '../../../utils/Timer.js';
import { TypeMappingResult } from '../../../utils/types.js';
import Context from './Context.js';
import Image from './Image.js';

type DataMap<T> = (value: unknown) => TypeMappingResult<T>

export type IGeneralOperation = new (logger: DefaultLogger) => IOperation;

export interface IOperation {
    name: string;
    aliases: string[];
    execute: (image: Image, data: unknown) => Promise<Image>;
    validateData: (ctx: Context, data: unknown) => unknown;
}

interface OperationInfo<T> {
    name: string;
    aliases?: string[];
    mapping: DataMap<T>;
    execute: (image: Image, data: T) => Promise<Image> | Image;
    dataPropertyAliases?: Record<string, string>;
}

export interface GenericOperation<T extends string, D> {
    type: T;
    data: D;
}

export interface UnknownOperation {
    type: string;
    data: unknown;
}

export default class Operation<OpData> implements IOperation {
    public readonly name: string;
    public readonly aliases: string[];
    public readonly dataPropertyAliases?: Record<string, string>;
    public readonly mapping: DataMap<OpData>;

    #execute: (image: Image, data: OpData) => Promise<Image> | Image;

    public constructor(public readonly logger: DefaultLogger, operation: OperationInfo<OpData>) {
        this.name = operation.name;
        this.dataPropertyAliases = operation.dataPropertyAliases;
        this.aliases = operation.aliases ?? [];

        this.mapping = operation.mapping;
        this.#execute = operation.execute;
    }

    private convertAliases(_: Context, data: unknown, aliases: Record<string, string> | undefined): unknown {
        if (aliases !== undefined) {
            const objectMapping = mapping.jObject(data);
            if (objectMapping.valid) {
                for (const key of Object.keys(objectMapping.value)) {
                    if (key in aliases) {
                        objectMapping.value[aliases[key]] = objectMapping.value[key];
                        delete objectMapping.value[key];
                    }
                }
                return objectMapping.value;
            }
        }
        return data;
    }

    public validateData(_: Context, data: unknown): OpData | void {
        const validatedData = this.mapping(this.convertAliases(_, data, this.dataPropertyAliases));

        if (!validatedData.valid)
            return;
        return validatedData.value;
    }

    public async execute(image: Image, data: unknown): Promise<Image> {
        const opTimer = new Timer(true);
        const validatedData = this.validateData(image.context, data);
        if (validatedData === undefined) {
            image.context.addOperationError({ type: this.name, data }, 'Invalid data', 0);
            return image;
        }

        try {
            const imageAfter = await this.#execute(image, validatedData);
            const newBuffer = await image.updateBuffer();
            image.context.addOperation({
                type: this.name,
                data: validatedData
            }, newBuffer, Number(opTimer.elapsedMS));
            return imageAfter;
        } catch (err: unknown) {
            this.logger.log.operation(chalk.red(`${this.name} UNCAUGHT ERROR:`), err);
            return image;
        }
    }
}
