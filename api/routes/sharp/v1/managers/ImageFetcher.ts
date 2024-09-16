import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import * as url from 'url';

import CacheManager from '../../../../utils/CacheManager.js';
import { NiceLogger } from '../../../../utils/logging/NiceLogger.js';

const assetsPath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..', 'assets', 'img');
const transparentImagePath = path.join(assetsPath, 'transparent.png');
const circleImagePath = path.join(assetsPath, 'circle-image.png');
const blackImagePath = path.join(assetsPath, 'black.png');

export class ImageFetcher {
    public readonly retention: number;
    public readonly cache: CacheManager<{ buffer: Buffer; }>;

    private readonly _defaultImageBuffer = fs.readFileSync(transparentImagePath);
    private readonly _circleImageBuffer = fs.readFileSync(circleImagePath);
    private readonly _blackImageBuffer = fs.readFileSync(blackImagePath);

    public constructor(public readonly logger: NiceLogger, retention = 3600) {
        this.retention = retention;
        this.cache = new CacheManager({});
    }

    public async get(src?: string): Promise<Buffer> {
        if (src === undefined || src === '') {
            return this.defaultImageBuffer;
        }
        const cachedImage = this.cache.get(src);
        if (cachedImage !== undefined) {
            this.cache.refreshTimestamp(src);
            return cachedImage.buffer;
        }
        const buffer = await this.load(src);
        this.store(src, buffer);
        return buffer;
    }

    private store(src: string, buffer: Buffer): void {
        this.cache.set(src, { buffer });
    }

    public async load(src: string): Promise<Buffer> {
        try {
            const arrayBuffer = await (await fetch(src)).arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (e: unknown) {
            throw Error('Invalid image');
        }
    }

    public get defaultImageBuffer(): Buffer {
        return this._defaultImageBuffer;
    }

    public get circleMaskImage(): Buffer {
        return this._circleImageBuffer;
    }

    public get blackImage(): Buffer {
        return this._blackImageBuffer;
    }
}
