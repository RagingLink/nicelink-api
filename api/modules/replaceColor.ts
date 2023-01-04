import Color from 'color';
import deltaE from 'delta-e';
import sharp from 'sharp';

import Image from '../routes/sharp/managers/Image.js';

interface ColorObject {
    target: string;
    replace: string;
    delta?: number;
}

export default async function replaceColor(image: Image, { target, replace, delta = 2.3 }: ColorObject): Promise<void> {
    const targetColor = Color(target, 'hex').lab().array();
    const replaceColor = Color(replace, 'hex').rgb().array();
    const rgbImage = image.sharp.clone();
    const { data, info } = await rgbImage.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    const cloneArray = new Uint8ClampedArray(data.buffer);

    for (let i = 0; i < info.size; i += info.channels) {
        if (isSmallerDelta([cloneArray[i], cloneArray[i + 1], cloneArray[i + 2]], targetColor, delta, 'E00')) {
            cloneArray[i] = replaceColor[0];
            cloneArray[i + 1] = replaceColor[1];
            cloneArray[i + 2] = replaceColor[2];
        }
    }
    image.sharp = sharp(await sharp(cloneArray, { raw: { width, height, channels } }).png({ force: true }).toBuffer());
}
const deltaCache: Record<string, boolean> = {};
function isSmallerDelta(rgb: number[], lab2: number[], delta: number, formula: 'E00' | 'E76' | 'E94'): boolean {
    const rgbStr = rgb.toString();
    if (rgbStr in deltaCache)
        return deltaCache[rgbStr];

    const lab1 = rgbToLab(rgb);
    const labArray = [
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { L: lab1[0], A: lab1[1], B: lab1[2] },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { L: lab2[0], A: lab2[1], B: lab2[2] }
    ];
    let isSmaller;
    switch (formula) {
        case 'E00':
            isSmaller = deltaE.getDeltaE00(labArray[0], labArray[1]) <= delta;
            break;
        case 'E76':
            isSmaller = deltaE.getDeltaE76(labArray[0], labArray[1]) <= delta;
            break;
        case 'E94':
            isSmaller = deltaE.getDeltaE94(labArray[0], labArray[1]) <= delta;
            break;
        default:
            isSmaller = false;
    }
    return deltaCache[rgbStr] = isSmaller;
}
const LAB_FT = Math.pow(6 / 29, 3);
function rgbToLab(rgb: number[]): number[] {

    const xyz = rgbToXyz(rgb);
    let x = xyz[0];
    let y = xyz[1];
    let z = xyz[2];

    x /= 95.047;
    y /= 100;
    z /= 108.883;

    x = x > LAB_FT ? x ** (1 / 3) : 7.787 * x + 16 / 116;
    y = y > LAB_FT ? y ** (1 / 3) : 7.787 * y + 16 / 116;
    z = z > LAB_FT ? z ** (1 / 3) : 7.787 * z + 16 / 116;

    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);
    return [l, a, b];
}
function rgbToXyz(rgb: number[]): number[] {
    let r = rgb[0] / 255;
    let g = rgb[1] / 255;
    let b = rgb[2] / 255;

    // Assume sRGB
    r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
    g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
    b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;

    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
    const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

    return [x * 100, y * 100, z * 100];
}
