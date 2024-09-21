import chalk from 'chalk';
import { Static, TSchema, Type } from '@sinclair/typebox';
import { TypeCheck, TypeCompiler } from '@sinclair/typebox/compiler';

import Image from './Image.js';
import OperationDetails from './OperationSummary.js';
import OperationSummary from './OperationSummary.js';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';

export type IGeneralOperation = new (logger: DefaultLogger) => IOperation;

export interface IOperation {
    name: string;
    aliases: string[];
    execute: (image: Image, data: unknown) => Promise<Image>;
    isValidData: (data: unknown) => boolean;
}

export interface OperationInfo<D extends TSchema> {
    name: string;
    aliases?: string[];
    schema: D;
    execute: (image: Image, data: Static<D>, summary?: OperationSummary) => Promise<Image> | Image;
    dataPropertyAliases?: Record<string, string>;
}

export interface GenericOperation<T extends string, D> {
    type: T;
    data: D;
}

export default class Operation<D extends TSchema> implements IOperation {
    public readonly name: string;
    public readonly aliases: string[];
    public readonly dataPropertyAliases?: Record<string, string>;
    public readonly schema: D;

    private compiler: TypeCheck<D>;

    #genericObject = TypeCompiler.Compile(Type.Record(Type.String(), Type.Unknown()));

    #execute: (image: Image, data: Static<D>, details: OperationDetails) => Promise<Image> | Image;

    public constructor(public readonly logger: DefaultLogger, info: OperationInfo<D>) {
        this.name = info.name;
        this.dataPropertyAliases = info.dataPropertyAliases;
        this.aliases = info.aliases ?? [];

        this.schema = info.schema;
        this.compiler = TypeCompiler.Compile(this.schema);

        this.#execute = info.execute;
    }

    private convertAliases(data: unknown): unknown {
        if (this.dataPropertyAliases !== undefined) {
            if (this.#genericObject.Check(data)) {
                for (const key of Object.keys(data)) {
                    if (key in this.dataPropertyAliases) {
                        data[this.dataPropertyAliases[key]] = data[key];
                        delete data[key];
                    }
                }
            }
        }
        return data;
    }

    public async execute(image: Image, data: unknown): Promise<Image> {
        const summary = new OperationSummary(this.name, data, image);

        if (!this.isValidData(data)) {
            const errorIterables = this.compiler.Errors(data);
            const errors: string[] = [];
            for (const error of errorIterables) {
                // Properties have a leading / in front, I'm not sure if this has any negative effects so this is still W.I.P
                const valuePath = error.path.slice(1);
                errors.push(`${valuePath} ${error.message}`.trimStart());
            }
            this.error(summary, `Invalid data: ${errors.join(', ')}`);
            return image;
        }

        try {
            const imageAfter = await this.#execute(image, data, summary);
            const newBuffer = await image.updateBuffer();
            image.context.addOperation(summary, newBuffer);

            /*
                Currently nothing actually requires execute() to return anything, so....
                (and no operation changes the image class either)
            */
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
        this.logger.log.error(error);
    }

    public isValidData(data: unknown): data is Static<D> {
        try {
            data = this.convertAliases(data);
            return this.compiler.Check(data);
        } catch (err: unknown) {
            this.logger.log.error('isValidData', err);
            return false;
        }
    }

}
