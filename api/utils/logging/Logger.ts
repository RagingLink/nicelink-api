import CatLoggr, {LogLevel as CatLogLevel} from './CatLoggr.js';

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
    }).meta();

    return <Logger>logger;
}

const logLevels = [
    { name: process.env.NODE_ENV === 'dev' ? ' ❌ ': 'error', color: CatLoggr._chalk.black.bgBlack, aliases: ['error'], isError: true },
    { name: process.env.NODE_ENV === 'dev' ?' ⚠️ ' : 'warn', color: CatLoggr._chalk.black.bgYellow, aliases: ['warning'], isError: true },
    { name: process.env.NODE_ENV === 'dev' ?' ✅ ' : 'info', color: CatLoggr._chalk.white.bgGreenBright, aliases: ['info'] },
    { name: process.env.NODE_ENV === 'dev' ?' 💾 ' : 'prisma', color: CatLoggr._chalk.white.bgCyanBright, aliases: ['prisma', 'db']},
    { name: process.env.NODE_ENV === 'dev' ?' ⌛ ' : 'time', color: CatLoggr._chalk.white.bgBlueBright, aliases: ['time', 'stopwatch', 'sw'] }
] as const;