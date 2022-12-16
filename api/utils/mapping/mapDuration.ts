import momentTimezone from 'moment-timezone';

import { createMapping } from './createMapping.js';
import { result } from './result.js';
import { TypeMapping } from './types.js';

const { duration } = momentTimezone;

export const mapDuration: TypeMapping<momentTimezone.Duration> = createMapping(value => {
    try {
        switch (typeof value) {
            case 'string':
            case 'object':
            case 'number': {
                const mapped = duration(value);
                if (mapped.isValid())
                    return result.success(mapped);
            }
        }
    } catch {
        // NOOP
    }
    return result.failed;
});
