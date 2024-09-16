import chalk from 'chalk';

import { hrtime } from 'node:process';

export default class Timer {
    private startTime?: bigint;
    private stopTime?: bigint;
    public constructor(start = true) {
        if (start)
            this.start();
    }

    public start(): this {
        this.startTime = hrtime.bigint();
        return this;
    }

    public stop(): this {
        this.stopTime = hrtime.bigint();
        return this;
    }

    public reset(): this {
        this.stopTime = undefined;
        this.start();
        return this;
    }

    public get elapsedNanoSeconds(): bigint {
        return (this.stopTime ?? hrtime.bigint()) - (this.startTime ?? BigInt(0));
    }

    public get elapsedMicroSeconds(): bigint {
        return this.elapsedNanoSeconds / BigInt(1000);
    }

    public get elapsedMS(): bigint {
        return this.elapsedNanoSeconds / BigInt(1000_000);
    }

    public get elapsedBlueStr(): string {
        return chalk.hex('#00F9FF')(`(${Math.round(Number(this.elapsedMS) * 1000) / 1000}ms)`);
    }
}
