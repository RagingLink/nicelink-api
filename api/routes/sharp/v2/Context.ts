import Image from './Image.js';
import { OperationSummaryObject } from './OperationSummary.js';
import OperationSummary from './OperationSummary.js';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';

export type CompletedOperationObject = OperationSummaryObject & { buffer?: Buffer };
export type CompletedWithBuffer = OperationSummaryObject & { buffer: Buffer };

type CompletedWithoutBuffer = Omit<CompletedOperationObject, 'buffer'>;

interface ContextObject {
    operations: CompletedWithoutBuffer[];
    warnings: CompletedWithoutBuffer[];
    errors: CompletedWithoutBuffer[]
}

export default class ImageContext {
    public operations: CompletedOperationObject[] = [];
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

    public toJSON(): ContextObject {
        return {
            operations: this.operations.map((e) => this.omitBuffer(e)),
            warnings: this.operations.filter((e) => e.debug.warnings.length > 0).map((e) => this.omitBuffer(e)),
            errors: this.operations.filter((e) => e.halted || e.debug.errors.length > 0).map((e) => this.omitBuffer(e))
        };
    }

    private omitBuffer(opObject: CompletedOperationObject): CompletedWithoutBuffer {
        return Object.assign(opObject, { buffer: undefined });
    }
}
