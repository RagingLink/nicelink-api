export * as mapping from './mapping/index.js';

export function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
    if (e instanceof Error)
        if ('code' in e) return true;
    return false;
}
