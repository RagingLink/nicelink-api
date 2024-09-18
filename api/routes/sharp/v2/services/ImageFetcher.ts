import fetch from 'node-fetch';

import fs from 'fs';
import path from 'path';
import url from 'url';

import CacheManager from '../../../../utils/CacheManager.js';
import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Timer from '../../../../utils/Timer.js';

const transparentImagePath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..', 'assets', 'img', 'transparent.png');

export default class ImageFetcher {
    public cache: CacheManager<{ buffer: Buffer; }>;
    public readonly defaultImageBuffer = fs.readFileSync(transparentImagePath);

    public constructor(public readonly logger: DefaultLogger) {
        this.cache = new CacheManager({ refresh: 0.5, hours: 48 });
    }

    public async fetchImage(src?: string): Promise<Buffer | void> {
        const timer = new Timer(true);
        if (src === undefined || src === '')
            return this.defaultImageBuffer;

        const cachedImage = this.cache.get(src);
        if (cachedImage !== undefined)
            return cachedImage.buffer;

        try {
            const arrayBuffer = await (await fetch(src)).arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            this.logger.log.time('Fetched image', timer.stop().elapsedBlueStr);
            return this.cache.set(src, { buffer }).buffer;
        } catch (e: unknown) {
            //throw Error('Invalid image');
            this.logger.log.error(e);
        }
    }
}
