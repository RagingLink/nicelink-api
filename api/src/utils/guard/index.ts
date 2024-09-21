import * as hasProperty from './hasProperty.js';
import * as hasValue from './hasValue.js';

export const guard = {
    ...hasProperty,
    ...hasValue
};
