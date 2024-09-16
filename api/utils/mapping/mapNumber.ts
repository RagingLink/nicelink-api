import { createMapping } from './createMapping.js';
import { result } from './result.js';
import { TypeMapping } from './types.js';

export const mapNumber: TypeMapping<number> = createMapping((value) => {
    return typeof value === 'number' ?
        result.success(value) :
        result.failed;
});
