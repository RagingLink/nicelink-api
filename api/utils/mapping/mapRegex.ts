import { createMapping } from './createMapping.js';
import { result } from './result.js';
import { TypeMapping } from './types.js';

export function mapRegex<T extends string>(regex: RegExp): TypeMapping<T> {
    return createMapping((value) => {
        if (typeof value === 'string' && regex.test(value))
            return result.success((value as T));
        return result.failed;
    });
}
