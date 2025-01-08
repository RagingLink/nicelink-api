import Image from './Image.js';
import { OperationSummaryObject } from './OperationMeta.js';
import OperationSummary from './OperationMeta.js';

import API from '../../../api.js';

// after at least a week of not looking at this code I was confused why I did it like this,
// but an operation can be 'completed' without a buffer (error), so that's why buffer is optional
// buffer not being optional is for operations that have been applied, maybe there is a neater way to do this
export type CompletedOperationObject = OperationSummaryObject & { buffer?: Buffer };
export type CompletedWithBuffer = OperationSummaryObject & { buffer: Buffer };

interface ContextObject {
    background: {
        src: string;
        duration: number;
    }
    operations: CompletedOperationObject[];
    warnings: string[];
    errors: string[];
}

export default class ImageContext {
    public operations: CompletedOperationObject[] = [];
    public parentContext?: ImageContext;

    private generalWarnings: string[] = [];
    private generalErrors: string[] = [];

    public constructor(public readonly logger: API['logger'], public readonly image: Image, parent?: ImageContext) {
        if (parent !== undefined)
            this.parentContext = parent;
    }

    public addOperation(operationSummary: OperationSummary, buffer?: Buffer): void {
        this.operations.push({
            ...operationSummary.toJSON(),
            buffer
        });
    };

    // Get all operations that changed the image (buffer)
    public getAppliedOperations(): (CompletedWithBuffer)[] {
        return this.operations.filter((e): e is CompletedWithBuffer => !e.halted && e.buffer !== undefined);
    }

    public addDebug(type: 'warn' | 'error', str: string): void {
        switch (type) {
            case 'warn':
                this.generalWarnings.push(str);
                break;
            case 'error':
                this.generalErrors.push(str);
                break;
        }
    }

    public toJSON(): ContextObject {
        return {
            background: {
                src: this.image.background,
                duration: this.image.fetchDuration
            },
            operations: this.operations.map((e) => this.omitBuffer(e)),
            warnings: this.generalWarnings.concat(...this.formatOperationsDebug('warnings')),
            errors: this.generalErrors.concat(...this.formatOperationsDebug('errors'))
        };
    }

    private formatOperationsDebug(type: 'warnings' | 'errors'): string[] {
        return this.operations.reduce<string[]>((a, c, index) => {
            if (c.debug[type].length === 0)
                return a;
            a.push(...c.debug[type].map((str) => `[${c.type}:${index}]: ${str}`));
            return a;
        }, []);
    }

    private omitBuffer(opObject: CompletedOperationObject): OperationSummaryObject {
        const { buffer: _, ...obj } = opObject;
        return obj;
    }
}
