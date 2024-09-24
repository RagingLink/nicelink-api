/* eslint-disable no-console */

import { BodyType, BodyTypeCheck } from './bodyMappings.js';

import { MetaBody } from '../../../../types/ImageTypes.js';
import { GenericArrayType, GenericObjectType, GenericRecordType, GenericRecordTypeCheck } from '../../../../utils/typebox/index.js';

const propertyAliases = {
    bg: 'background',
    h: 'height',
    w: 'width',
    txt: 'text',
    o: 'opacity',
    r: 'rotate',
    s: 'shape',
    align: 'alignment',
    children: 'images'
};

export default function mapBody(inputBody: GenericObjectType, meta: MetaBody): BodyType {
    convertAliases(inputBody);
    console.log(inputBody);
    if (BodyTypeCheck.Check(inputBody))
        return inputBody;
    const errors = [...BodyTypeCheck.Errors(inputBody)].map((err) => {
        return err.message;
    });
    meta.errors.push(...errors);
    return {};
}

/**
 *  Mutates input array
 * @param inputBody
 * @returns
 */
function convertAliases(inputBody: GenericRecordType | GenericArrayType): void {
    if (Array.isArray(inputBody)) {
        for (const element of inputBody) {
            if (GenericRecordTypeCheck.Check(element))
                convertAliases(element);
        }
        return;
    }
    const keys = Object.keys(inputBody);
    for (const key of keys) {
        if (GenericRecordTypeCheck.Check(inputBody[key]))
            convertAliases(inputBody[key]);
        if (!(key in propertyAliases))
            continue;

        const fullKey = propertyAliases[<keyof typeof propertyAliases>key];
        // Discards the 'alias' property in favour of the full property
        if (fullKey in inputBody) {
            delete inputBody[key];
            continue;
        }
        inputBody[fullKey] = inputBody[key];

        delete inputBody[key];
    }
}
