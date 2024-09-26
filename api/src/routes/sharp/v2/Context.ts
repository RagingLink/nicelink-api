import Image from './Image.js';
import { OperationSummaryObject } from './OperationMeta.js';
import OperationSummary from './OperationMeta.js';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';

export type CompletedOperationObject = OperationSummaryObject & { buffer?: Buffer };
export type CompletedWithBuffer = OperationSummaryObject & { buffer: Buffer };

type CompletedWithoutBuffer = Omit<CompletedOperationObject, 'buffer'>;

interface ContextObject {
    background: {
        src: string;
        duration: number;
    }
    operations: CompletedWithoutBuffer[];
    warnings: string[];
    errors: string[]
}

export default class ImageContext {
    public operations: CompletedOperationObject[] = [];
    private generalWarnings: string[] = [];
    private generalErrors: string[] = [];

    public constructor(public readonly logger: DefaultLogger, public readonly image: Image) {
    }

    // public addOperationError(operation: UnknownOperation, error: string, duration = 0): void {
    //     this.operations.push({
    //         ...operation,
    //         duration,
    //         error
    //     });
    // }

    // public addOperationWarning(operation: UnknownOperation, buffer: Buffer, warning: string | string [], duration = 0): void {
    //     this.operations.push({
    //         ...operation,
    //         buffer,
    //         duration,
    //         Array.isArray(warning) ? warning : warning
    //     });
    // }

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

    private omitBuffer(opObject: CompletedOperationObject): CompletedWithoutBuffer {
        const { buffer: _, ...obj } = opObject;
        return obj;
    }
}
