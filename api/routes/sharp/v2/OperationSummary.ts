import Image from './Image';

import Timer from '../../../utils/Timer.js';

// The whole error state success state, error: true seems a bit tedious to me but I am just leaving it here for now due to lack of better idea
export type OperationSummaryObject = {
    type: string;
    data: unknown;
    halted: boolean;
    debug: OperationDebugObject;
};

export type OperationDebugObject = {
    duration: number;
    warnings: string[];
    errors: string[];
};

// I'm not sure about the naming of this class, but oh well!
export default class OperationSummary {
    private errors: string[] = [];
    private warnings: string[] = [];
    private halted: boolean = false;
    private timer: Timer;

    public constructor(private readonly type: string, private readonly data: unknown, public readonly image: Image) {
        this.timer = new Timer(true);
    }

    public addError(error: string): this {
        this.errors.push(error);
        return this;
    };

    public addWarning(warning: string): this {
        this.warnings.push(warning);
        return this;
    }

    public halt(): this {
        this.halted = true;
        return this;
    }

    public toJSON(): OperationSummaryObject {
        return {
            type: this.type,
            data: this.data,
            halted: this.halted,
            debug: {
                errors: this.errors,
                warnings: this.warnings,
                duration: Number(this.timer.elapsedMS)
            }
        };
    };
}
