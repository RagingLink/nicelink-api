import Image from './Image.js';
import { CompletedOperationObject } from './Context.js';

import Timer from '../../../utils/Timer.js';

// The whole error state success state, error: true seems a bit tedious to me but I am just leaving it here for now due to lack of better idea
export type OperationSummaryObject = {
    type: string;
    data: unknown;
    halted: boolean;
    debug: OperationDebugObject;
    subOperations?: OperationSummaryObject[];
};

export type OperationDebugObject = {
    duration: number;
    warnings: string[];
    errors: string[];
};

// I'm not sure about the naming of this class, but oh well!
export default class dOperationMeta {
    private errors: string[] = [];
    private warnings: string[] = [];
    private subOperations: OperationSummaryObject[] = [];
    private halted: boolean = false;

    private timer: Timer;

    public constructor(private readonly type: string, private data: unknown, public readonly image: Image) {
        this.timer = new Timer(true);
    }

    /**
     * I added this specifically for the DynamicNumber stuff since I wanted to use the 'resolved' numbers in the cache instead of the string,
     * Since I think you can have the same string resolve to two different numbers if something changes in another image
     */
    public changeData(data: unknown): void {
        this.data = data;
    }

    public addError(error: string): this {
        this.errors.push(error);
        return this;
    };

    public addWarning(warning: string): this {
        this.warnings.push(warning);
        return this;
    }

    public addSubOperations(...subOperations: CompletedOperationObject[]): void {
        for (const subOperation of subOperations) {
            this.subOperations.push(this.omitBuffer(subOperation));
        }
    }

    public halt(): this {
        this.halted = true;
        return this;
    }

    private omitBuffer(opObject: CompletedOperationObject): OperationSummaryObject {
        const { buffer: _, ...obj } = opObject;
        return obj;
    }

    public toJSON(): OperationSummaryObject {
        return {
            type: this.type,
            data: this.data,
            halted: this.halted,
            subOperations: this.subOperations.length > 0 ? this.subOperations : undefined,
            debug: {
                errors: this.errors,
                warnings: this.warnings,
                duration: Number(this.timer.elapsedMS)
            }
        };
    };
}
