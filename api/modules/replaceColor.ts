import Color from 'color';
import deltaE from 'delta-e';
import Image from '../routes/sharp/image/Image.js';
import sharp from 'sharp';

interface ColorObject {
    target: string;
    replace: string;
    delta?: number;
}
export default async function replaceColor (image: Image, {target, replace, delta = 2.3}: ColorObject): Promise<void> {
    const targetColor = Color(target, 'hex').lab().array();
    const replaceColor = Color(replace, 'hex').rgb().array();
    const rgbImage = image.sharp.clone();
    const clonedImage = image.sharp.clone();

    const { data, info } = await clonedImage.toColorspace('lab')
        .raw()
        .toBuffer({resolveWithObject: true});

    const labArray = new Uint8ClampedArray(data.buffer);
    const { width, height, channels } = info;

    const cloneArray = new Uint8ClampedArray(await rgbImage.raw().toBuffer());

    for (let i = 0; i < info.size; i += info.channels) {
        if (getDelta([labArray[i], labArray[i+1], labArray[i+2]], targetColor, 'E00') <= delta) {
            cloneArray[i] = replaceColor[0];
            cloneArray[i+1] = replaceColor[1];
            cloneArray[i+2] = replaceColor[2];
        }
    }
    image.sharp = sharp(await sharp(cloneArray, {raw: {width, height, channels}}).png({force: true}).toBuffer());
}

function getDelta(lab1: number[], lab2: number[], formula: 'E00' | 'E76' | 'E94'): number {
    const labArray = [
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { L: lab1[0], A: lab1[1], B: lab1[2] },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { L: lab2[0], A: lab2[1], B: lab2[2] }
    ];
    switch(formula) {
        case 'E00':
            return deltaE.getDeltaE00(labArray[0], labArray[1]);
        case 'E76':
            return deltaE.getDeltaE76(labArray[0], labArray[1]);
        case 'E94':
            return deltaE.getDeltaE94(labArray[0], labArray[1]);
        default:
            return 0;
    }
}
