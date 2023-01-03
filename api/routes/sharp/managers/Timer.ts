import chalk from 'chalk';

export default class Timer {
    private startTime?: number;
    private stopTime?: number;
    public constructor(start = true) {
        if (start)
            this.start();
    }

    public start(): this {
        this.startTime = Date.now();
        return this;
    }
    public stop(): this {
        this.stopTime = Date.now();
        return this;
    }
    public reset(): this {
        this.stopTime = 0;
        this.start();
        return this;
    }
    public get elapsedMS(): number {
        return (this.stopTime ?? Date.now()) - (this.startTime ?? 0);
    }
    public get elapsedBlueStr(): string {
        return chalk.blue(`(${this.elapsedMS}ms)`);
    }
}
