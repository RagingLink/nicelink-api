import chalk, { ChalkInstance } from 'chalk';
import * as winston from 'winston';
import { AbstractConfigSetLevels } from 'winston/lib/winston/config';

export type LevelsType = Record<string, ChalkInstance>;

interface LevelsConfig {
    levels: Record<keyof LevelsType, number>;
    colors: Record<string, ChalkInstance>;
}

//winston.addColors(config.colors);

type CreateWinstonLoggerReturn<T> = winston.Logger & Record<keyof T, winston.LeveledLogMethod>;

function createWinstonLogger<T extends AbstractConfigSetLevels>(options?: Pick<winston.LoggerOptions, Exclude<keyof winston.LoggerOptions, 'levels'>> & { levels: T }): CreateWinstonLoggerReturn<T> {
    return winston.createLogger(options) as CreateWinstonLoggerReturn<T>;
}

interface LoggerOptions {
     levels: LevelsType;
     level: string
}

export function createLogger(options: LoggerOptions): CreateWinstonLoggerReturn<LoggerOptions['levels']> {
    const config = Object.keys(options.levels).reduce((a, c, i) => {
        const level = c;
        a.levels[level] = i;
        a.colors[level] = options.levels[level];
        return a;
    }, { levels: {}, colors: {} } as LevelsConfig);
    const padForLevel: Record<string, string> = {};
    const maxLength = Object.keys(options.levels).sort((a, b) => b.length - a.length)[0].length + 2;

    for (const level of Object.keys(config.levels)) {
        padForLevel[level] = levelPadding(level);
    }

    function levelPadding(str: string): string {
        return str.padStart(str.length + Math.ceil((maxLength - str.length) / 2), ' ')
            .padEnd(maxLength, ' ');
    }

    function padTimestamp(str: string, padLength = 2): string {
        const padding = ' '.repeat(padLength);
        return padding + str + padding;
    }
    function timestampLevelFormat(info: winston.Logform.TransformableInfo): string {
        return `${chalk.bgWhite.black(padTimestamp((info.timestamp as string)))}${config.colors[info.level](levelPadding(info.level))}`;
    }
    return createWinstonLogger({
        level: options.level,
        levels: config.levels,
        format: winston.format.combine(
            winston.format.errors({ stack: true }),
            //winston.format.colorize(),
            winston.format.timestamp({ format: 'YY-MM-DD HH:mm:ss' }),
            winston.format.printf((info) => {
                if (info.level === 'error') {
                    if ('stack' in info)
                        return `${(info.timestamp)}${info.stack}}`;
                }
                return `${timestampLevelFormat(info)} ${info.message}`;
            })
        ),
        transports: [new winston.transports.Console()]
    });
}
