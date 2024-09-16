import Color from 'color';
import { StaticPool } from 'node-worker-threads-pool';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

import Image from './v1/managers/Image.js';

const THREAD_COUNT = 4;
const pool = new StaticPool({
    size: THREAD_COUNT,
    task: fileURLToPath(new URL('replaceColorWorker.js', import.meta.url))
});

interface ColourSpaceBuffers {
    labBuffer: Buffer;
    rgbBuffer: Buffer;
}

function* getChunks(obj: ColourSpaceBuffers, chunkCount: number): IterableIterator<ColourSpaceBuffers> {
    if (chunkCount === 1)
        yield obj;
    else {
        const chunkSize = Math.ceil(obj.labBuffer.length / chunkCount);
        for (let i = 0; i < obj.labBuffer.length; i += chunkSize)
            yield { labBuffer: obj.labBuffer.subarray(i, i + chunkSize), rgbBuffer: obj.rgbBuffer.subarray(i, i + chunkSize) };
    }
}
function* runPools(buffers: ColourSpaceBuffers, replaceData: ReplaceDataObject, chunkCount: number): IterableIterator<Promise<Buffer>> {
    for (const chunk of getChunks(buffers, chunkCount))
        yield pool.exec({ ...replaceData, ...chunk });
}
interface ColorObject {
    target: string;
    replace: string;
    delta?: number;
}
type ColourArray = [number, number, number];
interface ReplaceDataObject {
    targetLab: ColourArray;
    replaceWithRgb: ColourArray;
    deltaE: number;
    channels: number;
}
export default async function replaceColor(image: Image, { target, replace, delta = 2.3 }: ColorObject): Promise<void> {
    const targetLabColor = Color(target, 'hex').lab().array() as ColourArray;
    const replaceRgbColor = Color(replace, 'hex').rgb().array() as ColourArray;
    const rgbBuffer = await image.sharp.raw().toBuffer();
    const { data: labBuffer, info } = await image.sharp.clone().toColourspace('lab').raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    const replacedBuffer = await Promise.all(runPools({
        rgbBuffer,
        labBuffer
    }, {
        targetLab: targetLabColor,
        replaceWithRgb: replaceRgbColor,
        deltaE: delta,
        channels
    }, THREAD_COUNT));
    image.sharp = sharp(Buffer.concat(replacedBuffer), { raw: { channels, width, height } }).png();
}
