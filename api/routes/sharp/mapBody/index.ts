import { ChildBody, CropOption, InputBody, MetaBody, ResizeOption, TextBody } from '../../../types/index.js';
import { guard } from '../../../utils/guard/index.js';
import * as propertyMapping from './bodyMappings.js';

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

export default function mapBody(inputBody: JObject, meta: MetaBody, isChild = false): InputBody {
    const mappedBody: InputBody = {};
    inputBody = convertAliases(inputBody);

    const keys = Object.keys(inputBody);
    for (const key of keys) {
        let value = inputBody[key];
        switch (key) {
            case 'text': {
                if (typeof value === 'object' && value !== null) {
                    const mappedTextBody = mapTextBody(value, meta);
                    mappedBody.text = mappedTextBody;
                } else {
                    meta.errors.push('"text" is not an array or object');
                    continue;
                }
                break;
            }
            case 'images': {
                if (Array.isArray(value)) {
                    const mappedImagesBody = mapImagesBody(value, meta);
                    mappedBody.images = mappedImagesBody;
                }
                break;
            }
            case 'crop': {
                mappedBody.crop = mapCropBody(value, meta);
                break;
            }
            case 'resize': {
                mappedBody.resize = mapResizeBody(value, meta);
                break;
            }
            default: {
                const bodyMapping = !isChild ? propertyMapping.body : propertyMapping.child;
                if (!guard.hasProperty(bodyMapping, key)) {
                    meta.warnings.push(`"${key}" is not a valid key`);
                    continue;
                }
                let mappedValue = bodyMapping[key](value);
                if (!mappedValue.valid) {
                    try {
                        if (typeof value === 'string')
                            value = JSON.parse(value);
                        mappedValue = bodyMapping[key](value);
                        if (mappedValue.valid) {
                            meta.warnings.push(`"${key}" was converted to ${typeof mappedValue.value}`);
                        } else {
                            meta.errors.push(`"${key}" doesn't have the right type`);
                            continue;
                        }
                    } catch (e: unknown) {
                        meta.errors.push(`"${key}" doesn't have the right type`);
                        continue;
                    }
                }
                createProperty(mappedBody, key, mappedValue.value);
                //no-op
            }
        }
    }
    return mappedBody;
}
// Custom bodies
function mapTextBody(textArray: JObject | JArray, meta: MetaBody): TextBody[] {
    if (!Array.isArray(textArray))
        textArray = [textArray];
    const mappedBody: TextBody[] = [];

    textArray.forEach((textObject, i) => {
        mappedBody[i] = {};
        if (typeof textObject === 'object' && !Array.isArray(textObject) && textObject !== null) {
            textObject = convertAliases(textObject);
            const keys = Object.keys(textObject);
            for (const key of keys) {
                let value = textObject[key];
                if (!guard.hasProperty(propertyMapping.text, key)) {
                    meta.warnings.push(`"${key}" is not a valid key`);
                    continue;
                }
                let mappedValue = propertyMapping.text[key](value);
                if (!mappedValue.valid) {
                    try {
                        if (typeof value === 'string')
                            value = JSON.parse(value);
                        mappedValue = propertyMapping.text[key](value);
                        if (mappedValue.valid) {
                            meta.warnings.push(`"${key}" was converted to ${typeof mappedValue.value}`);
                        } else {
                            meta.errors.push(`"${key}" doesn't have the right type`);
                            continue;
                        }
                    } catch (e: unknown) {
                        meta.errors.push(`"${key}" doesn't have the right type`);
                        continue;
                    }
                }
                createProperty(mappedBody[i], key, mappedValue.value);
            }
        } else {
            meta.errors.push(`"text" element ${i} is not an object`);
        }
    });
    return mappedBody;
}
function mapCropBody(cropOption: JToken, meta: MetaBody): CropOption | undefined {
    let mappedCropOption: CropOption | undefined = undefined;
    if (cropOption === 'auto')
        mappedCropOption = 'auto';
    else if (typeof cropOption === 'number')
        mappedCropOption = cropOption;
    else if (typeof cropOption === 'string') {
        try {
            cropOption = JSON.parse(cropOption);
            if (typeof cropOption === 'number') {
                meta.warnings.push('"crop" was converted to number');
                mappedCropOption = cropOption;
            }
        } catch (e: unknown) {
            meta.errors.push('"crop" doesn\'t have the right type');
        }
    } else if (typeof cropOption === 'object' && !Array.isArray(cropOption) && cropOption !== null) {
        mappedCropOption = {};
        cropOption = convertAliases(cropOption);
        for (const key of Object.keys(cropOption)) {
            if (!guard.hasProperty(propertyMapping.crop, key))
                continue;
            let value = cropOption[key];
            let mappedValue = propertyMapping.crop[key](value);
            if (!mappedValue.valid) {
                try {
                    if (typeof value === 'string')
                        value = JSON.parse(value);
                    mappedValue = propertyMapping.crop[key](value);
                    if (mappedValue.valid) {
                        meta.warnings.push(`"${key}" was converted to ${typeof mappedValue.value}`);
                        mappedCropOption[key] = mappedValue.value;
                    } else {
                        meta.errors.push(`"${key}" doesn't have the right type`);
                        continue;
                    }
                } catch (e: unknown) {
                    meta.errors.push(`"${key}" doesn't have the right type`);
                    continue;
                }
            } else {
                mappedCropOption[key] = mappedValue.value;
            }
        }
    }
    return mappedCropOption;
}
function mapImagesBody(imagesArray: JArray, meta: MetaBody): ChildBody[] {
    const mappedBody: ChildBody[] = [];

    imagesArray.forEach((imageObject, i) => {
        mappedBody[i] = {};
        meta.children[i] = {
            errors: [],
            warnings: [],
            children: []
        };
        if (typeof imageObject === 'object' && !Array.isArray(imageObject) && imageObject !== null) {
            mappedBody[i] = mapBody(imageObject, meta.children[i], true);
        } else {
            meta.errors.push(`"image" element ${i} is not an object`);
        }
    });
    return mappedBody;
}
function mapResizeBody(resizeOption: JToken, meta: MetaBody): ResizeOption | undefined {
    if (typeof resizeOption !== 'object' || Array.isArray(resizeOption) || resizeOption === null)
        return;
    const mappedObject: ResizeOption = {};
    resizeOption = convertAliases(resizeOption);
    for (const key of Object.keys(resizeOption)) {
        let value = resizeOption[key];
        if (!guard.hasProperty(propertyMapping.resize, key)) {
            meta.warnings.push(`"${key}" is not a valid key`);
            continue;
        }
        let mappedValue = propertyMapping.resize[key](value);
        if (!mappedValue.valid) {
            try {
                if (typeof value === 'string')
                    value = JSON.parse(value);
                mappedValue = propertyMapping.resize[key](value);
                if (mappedValue.valid) {
                    meta.warnings.push(`"${key}" was converted to ${typeof mappedValue.value}`);
                } else {
                    meta.errors.push(`"${key}" doesn't have the right type`);
                    continue;
                }
            } catch (e: unknown) {
                meta.errors.push(`"${key}" doesn't have the right type`);
                continue;
            }
        }
        createProperty(mappedObject, key, mappedValue.value);
    }
    return mappedObject;
}
function createProperty<B, K extends keyof B, V extends B[K]>(mappedObject: B, key: K, value: V): void {
    mappedObject[key] = value;
}
function convertAliases(inputBody: JObject): JObject {
    const newInputBody: JObject = {};
    const keys = Object.keys(inputBody);
    for (const key of keys) {
        if (guard.hasProperty(propertyAliases, key) && guard.hasProperty(inputBody, propertyAliases[key])) {
            continue;
        } else if (guard.hasProperty(propertyAliases, key)) {
            newInputBody[propertyAliases[key]] = JSON.parse(JSON.stringify(inputBody[key]));
        } else {
            newInputBody[key] = JSON.parse(JSON.stringify(inputBody[key]));
        }
    }
    return newInputBody;
}
