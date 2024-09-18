import chalk from 'chalk';
//import { duration } from 'moment-timezone';

import Context from './Context.js';
import Image from './Image.js';
import OperationDetails from './OperationSummary.js';
import ImageContext from './Context.js';
import OperationSummary from './OperationSummary.js';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../utils/mapping/index.js';
import { TypeMappingResult } from '../../../utils/types.js';

type DataMap<T> = (value: unknown) => TypeMappingResult<T>;

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
    execute: (image: Image, data: T, summary?: OperationSummary) => Promise<Image> | Image;
    dataPropertyAliases?: Record<string, string>;
}

export interface GenericOperation<T extends string, D> {
    type: T;
    data: D;
}

export default class Operation<OpData> implements IOperation {
    public readonly name: string;
    public readonly aliases: string[];
    public readonly dataPropertyAliases?: Record<string, string>;
    public readonly mapping: DataMap<OpData>;

    #execute: (image: Image, data: OpData, details: OperationDetails) => Promise<Image> | Image;

    public constructor(public readonly logger: DefaultLogger, info: OperationInfo<OpData>) {
        this.name = info.name;
        this.dataPropertyAliases = info.dataPropertyAliases;
        this.aliases = info.aliases ?? [];

        this.mapping = info.mapping;
        this.#execute = info.execute;
    }

    private convertAliases(_: ImageContext, data: unknown, aliases: Record<string, string> | undefined): unknown {
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
        const summary = new OperationSummary(this.name, data, image);

        const validatedData = this.validateData(image.context, data);
        if (validatedData === undefined) {
            this.error(summary, 'Invalid data');
            return image;
        }

        try {
            const imageAfter = await this.#execute(image, validatedData, summary);
            const newBuffer = await image.updateBuffer();
            image.context.addOperation(summary, newBuffer);

            return imageAfter;
        } catch (err: unknown) {
            this.logger.log.operation(chalk.red.bold(`${this.name}`, err));

            this.error(summary, String(err));
            return image;
        }
    }

    protected error(summary: OperationSummary, error: string, halt = true): void {
        summary.addError(error);
        if (halt) {
            summary.halt();
            summary.image.context.addOperation(summary);
        }
        this.logger.log.verbose(error);
    }
}
