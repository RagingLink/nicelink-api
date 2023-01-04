import chalk from 'chalk';

import CatLoggr, { LogLevel as CatLogLevel } from './utils/logging/CatLoggr.js';

export type LoggerMethods = { [P in LogTypes]: (...args: unknown[]) => void; }

export interface Logger extends CatLoggr, LoggerMethods {
}

type LogLevels = typeof logLevels[number];
type LogTypes =
    | LogLevels['name']
    | Extract<LogLevels, { aliases: unknown; }>['aliases'][number];

export function createLogger(): Logger {
    const logger = new CatLoggr({
        levels: logLevels.map(l => {
            const level = new CatLogLevel(l.name, l.color);
            if ('aliases' in l)
                level.aliases = [...l.aliases];
            if ('isError' in l)
                level.err = l.isError;
            return level;
        })
    }).meta().addArgHook(({ arg, level }) => {
        switch (level.replace(/\u200b/, '')) {
            case '📢':
                return chalk.red(arg);
            case '❓':
                return chalk.yellow(arg);
            default:
                return chalk.magenta(arg);
        }
    });

    return <Logger>logger;
}

export class NiceLogger {
    public readonly logger: Logger;
    public constructor() {
        this.logger = createLogger();
    }
    public log(level: LogTypes, str: unknown): void;
    public log(level: LogTypes, scope: string, ...args: unknown[]): void;
    public log(level: LogTypes, ...args: unknown[]): void {
        if (args.length === 1)
            this.logger[level](...args);
        else
            this.logger[level](chalk.bold.hex('#6E00FF')(args[0]), ...args.slice(1));
    }

}

// A ZWS character is used to fix cases where there is too much padding
const logLevels = [
    { name: '📢', color: CatLoggr._chalk.black.bgBlack, aliases: ['error'], isError: true },
    { name: '❓', color: CatLoggr._chalk.black.bgYellow, aliases: ['warning'], isError: true },
    { name: '✅', color: CatLoggr._chalk.bgGreenBright, aliases: ['info'] },
    { name: '📸', color: CatLoggr._chalk.bgCyan, aliases: ['image'] },
    { name: '💾', color: CatLoggr._chalk.white.bgCyanBright, aliases: ['prisma', 'db'] },
    { name: '⌛', color: CatLoggr._chalk.white.bgBlueBright, aliases: ['time', 'stopwatch', 'sw'] },
    { name: '📬', color: CatLoggr._chalk.white.bgMagenta, aliases: ['endpoint'] }
] as const;
