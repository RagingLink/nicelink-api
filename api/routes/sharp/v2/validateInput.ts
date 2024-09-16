import { guard } from '../../../utils/guard/index.js';
import { mapping } from '../../../utils/mapping/index.js';

export interface ValidInputObject {
    background: string;
    cacheDuration?: number;
    operations: JObject[];
}

// Aliases on base object or
const propertyAliases = {
    bg: 'background',
    h: 'height',
    w: 'width',
    t: 'type',
    d: 'data',
    // txt: 'text',
    // o: 'opacity',
    // r: 'rotate',
    // s: 'shape',
    align: 'alignment',
    // children: 'images',
    ops: 'operations'
};

/* const imageMapping = mapping.object({
    background: mapping.string.optional,
    x: mapping.number.optional,
    y: mapping.number.optional,
    alignment: mapping.string.optional,
    size: mapping.string.optional,
    blendMode: mapping.string.optional
}); */

const inputObjectMapping = mapping.object({
    background: mapping.string.optional,
    cacheDuration: mapping.number.optional,
    responseType: mapping.string.optional,
    operations: mapping.array(mapping.unknown).optional
});

export function validateRootInput(input: JObject): ValidInputObject | undefined {
    convertAliases(input);
    const mappedInputObject = inputObjectMapping(input);
    if (!mappedInputObject.valid)
        return;

    const rootImageInput = mappedInputObject.value;

    const operations = [];

    if (guard.hasProperty(rootImageInput, 'operations') && Array.isArray(rootImageInput.operations)) {
        for (const element of rootImageInput.operations) {
            const mappedOperation = mapping.jObject(element);
            if (!mappedOperation.valid)
                operations.push(generateInvalidOperation(element));
            else
                operations.push(convertAliases(mappedOperation.value));
        }
    }
    return { background: rootImageInput.background ?? '', operations };
}

function convertAliases(input: JObject): JObject {
    for (const key of Object.keys(input))
        if (guard.hasProperty(propertyAliases, key)) {
            input[propertyAliases[key]] = input[key];
            delete input[key];
        }
    return input;
}

function generateInvalidOperation(operation: unknown): JObject {
    const mappedJtoken = mapping.jToken(operation);
    if (mappedJtoken.valid)
        return {
            type: 'invalid_operation',
            data: mappedJtoken.value
        };
    return {
        type: 'invalid_operation',
        data: 'undefined'
    };
}
