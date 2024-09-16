import Image from './Image.js';
import { GenericOperation, UnknownOperation } from './Operation.js';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';

export type CompletedOperation = SuccessOperation | ErrorOperation | WarningOperation;

export type SuccessOperation = GenericOperation<string, unknown> & {
    duration?: number;
    buffer: Buffer;
};
export type ErrorOperation = Omit<SuccessOperation, 'buffer'> & {
    error: string;
};
export type WarningOperation = SuccessOperation & {
    warning: string;
};

interface ContextObject {
    ops: Omit<CompletedOperation, 'buffer'>[];
    warnings: Omit<WarningOperation, 'buffer'>[];
    errors: ErrorOperation[];
}
export default class Context {
    public operations: CompletedOperation[] = [];
    public constructor(public readonly logger: DefaultLogger, public readonly image: Image) {

    }

    public addOperationError(operation: UnknownOperation, error: string, duration = 0): void {
        this.operations.push({
            ...operation,
            duration,
            error
        });
    }

    public addOperationWarning(operation: UnknownOperation, buffer: Buffer, warning: string, duration = 0): void {
        this.operations.push({
            ...operation,
            buffer,
            duration,
            warning
        });
    }

    public addOperation(operation: UnknownOperation, buffer: Buffer, duration: number): void {
        this.operations.push({ ...operation, buffer, duration });
    }

    public toJSON(): ContextObject {
        const warnings = this.operations.filter((e): e is WarningOperation => 'warning' in e).map((e) => {
            return {
                type: e.type,
                data: e.data,
                warning: e.warning
            };
        });
        const errors = this.operations.filter((e): e is ErrorOperation => 'error' in e).map((e) => {
            return {
                type: e.type,
                data: e.data,
                error: e.error
            };
        });
        return {
            ops: this.operations.map((e) => Object.assign({}, e, { buffer: undefined })),
            warnings: warnings,
            errors: errors
        };
    }

    public getAppliedOperations(): (SuccessOperation)[] {
        return this.operations.filter((e): e is SuccessOperation => !('error' in e));
    }
}
