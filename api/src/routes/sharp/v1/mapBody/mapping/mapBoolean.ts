import { createMapping } from './createMapping.js';
import { result } from './result.js';

export const mapBoolean = createMapping<boolean>((value) => {
    return typeof value === 'boolean' ?
        result.success(value) :
        result.failed;
});
