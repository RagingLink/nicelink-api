import chalk, { ChalkInstance } from 'chalk';

import { createLogger } from './WinstonLogger.js';

type LoggerFunction = (...args: unknown[]) => void;

export const defaultLogLevels = {
    error: chalk.black.bgRed,
    warning: chalk.white.bgYellow,
    info: chalk.bgGreenBright,
    image: chalk.bgCyan,
    operation: chalk.bgGray,
    prisma: chalk.white.bgCyanBright,
    time: chalk.white.bgBlueBright,
    endpoint: chalk.white.bgMagenta,
    verbose: chalk.gray
};

export type DefaultLogLevels = typeof defaultLogLevels;

// I hate this so much I hate this so much I hate this so much I hate this so much
export class NiceLogger<L extends Record<string, ChalkInstance>> {
    #logger: ReturnType<typeof createLogger>;
    public readonly log: Record<keyof L, LoggerFunction>;
    private logHistory: { level: keyof L; log: unknown[]; timestamp: number }[] = [];

    public constructor({ defaultLevel, levels }: { defaultLevel?: keyof typeof levels; levels: L }) {
        this.#logger = createLogger({
            level: String(defaultLevel) ?? 'verbose',
            levels
        });
        const logger: Record<string, LoggerFunction> = {};
        for (const level of Object.keys(levels)) {
            logger[level] = (...args: unknown[]) => {
                this.logHistory.push({ level, log: args, timestamp: Date.now() });
                (this.#logger[level] as LoggerFunction)(...args);
            };
        }
        this.log = logger as Record<keyof L, LoggerFunction>;
    }
}

export type DefaultLogger = NiceLogger<DefaultLogLevels>;

// const logLevels = [
//     { name: '❌', color: CatLoggr._chalk.black.bgBlack, aliases: ['error'], isError: true },
//     { name: '❓', color: CatLoggr._chalk.black.bgYellow, aliases: ['warning'], isError: true },
//     { name: '✅', color: CatLoggr._chalk.bgGreenBright, aliases: ['info'] },
//     { name: '📸', color: CatLoggr._chalk.bgCyan, aliases: ['image'] },
//     { name: '🔧', color: CatLoggr._chalk.bgGray, aliases: ['operation', 'op'] },
//     { name: '💾', color: CatLoggr._chalk.white.bgCyanBright, aliases: ['prisma', 'db'] },
//     { name: '⌛', color: CatLoggr._chalk.white.bgBlueBright, aliases: ['time', 'stopwatch', 'sw'] },
//     { name: '📬', color: CatLoggr._chalk.white.bgMagenta, aliases: ['endpoint'] }
// ] as const;

// type LogLevels = typeof logLevels[number];
// type LogTypes =
//     | LogLevels['name']
//      ;
