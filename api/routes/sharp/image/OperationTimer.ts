import { Logger } from '../../../utils/logging/Logger.js';

export default class OperationTimer {
    private operationTime: {
        [index: string]: {
            start: number;
            end: number;
        }
    }
    public constructor (public readonly logger: Logger) {
        this.operationTime = {};
    }
    public start(operation: string): void {
        this.operationTime[operation] = {
            start: Date.now(),
            end: Date.now()
        }
    }
    public stop(operation: string, returnDifference?: false): void;
    public stop(operation: string, returnDifference: true): number;
    public stop(operation: string, returnDifference = false): number | void {
        if (this.operationTime[operation] === undefined)
            return;
        this.operationTime[operation].end = Date.now();
        if (returnDifference === true)
            return this.difference(operation);
    }
    public difference(operation: string): number {
        return this.operationTime[operation].end - this.operationTime[operation].start;
    }
    public reset(operation?: string): void {
        if (operation === undefined)
            return void (this.operationTime = {});
        this.start(operation);
    }
}
