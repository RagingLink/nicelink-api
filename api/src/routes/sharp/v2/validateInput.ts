import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import { GenericObjectType, GenericRecordType } from '../../../utils/typebox/index.js';

export interface ValidInputObject {
    background: string;
    cacheDuration?: number;
    operations: GenericRecordType[];
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

// const inputObjectMapping = mapping.object({
//     background: mapping.string.optional,
//     cacheDuration: mapping.number.optional,
//     responseType: mapping.string.optional,
//     operations: mapping.array(mapping.unknown).optional
// });

const RootInputBox = Type.Object({
    background: Type.Optional(Type.String()),
    cacheDuration: Type.Optional(Type.Number()),
    responseType: Type.Optional(Type.Union([
        Type.Literal('image'),
        Type.Literal('link')
    ], {})),
    operations: Type.Optional(Type.Array(Type.Unknown()))
});

export function validateRootInput(input: GenericObjectType): ValidInputObject | undefined {
    convertAliases(input);

    try {
        const rootImageInput = Value.Parse(RootInputBox, input);
        const operations = [];

        if ('operations' in rootImageInput && Array.isArray(rootImageInput.operations)) {
            for (const element of rootImageInput.operations) {
                if (!Value.Check(Type.Object({}, { additionalProperties: true }), element))
                    operations.push(generateInvalidOperation(element));
                else
                    operations.push(convertAliases(element));
            }
        }
        return { background: rootImageInput.background ?? '', operations };
    } catch (_: unknown) {
        return;
    }
}

function convertAliases(input: GenericRecordType): GenericRecordType {
    for (const key of Object.keys(input))
        if (key in propertyAliases) {
            input[propertyAliases[key as keyof typeof propertyAliases]] = input[key];
            delete input[key];
        }
    return input;
}

function generateInvalidOperation(operation: unknown): GenericRecordType {
    return {
        type: 'invalid_operation',
        data: operation
    };
}
