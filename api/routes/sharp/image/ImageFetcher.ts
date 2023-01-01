import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import * as url from 'url';

import { Logger } from '../../../utils/logging/Logger.js';

const assetsPath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', 'assets');
const transparentImagePath = path.join(assetsPath, 'transparent.png');
const circleImagePath = path.join(assetsPath, 'circle-image.png');
const blackImagePath = path.join(assetsPath, 'black.png');

export class ImageFetcher {
    public readonly retention: number;
    public readonly cache: Map<string, {buffer: Buffer; time: number; lastAccessed: number}>;

    private readonly _defaultImageBuffer = fs.readFileSync(transparentImagePath);
    private readonly _circleImageBuffer = fs.readFileSync(circleImagePath);
    private readonly _blackImageBuffer = fs.readFileSync(blackImagePath);

    public constructor (public readonly logger: Logger, retention = 3600) {
        this.retention = retention;
        this.cache = new Map();
        this.startSweepInterval();
    }

    public async get(src?: string): Promise<Buffer> {
        if (src === undefined || src === '') {
            return this.defaultImageBuffer;
        }
        const cachedImage = this.cache.get(src);
        if (cachedImage !== undefined) {
            this.cache.set(src, {
                ...cachedImage,
                lastAccessed: Date.now()
            })
            return cachedImage.buffer
        }
        const buffer = await this.load(src);
        this.store(src, buffer);
        return buffer;
    }
    private store(src: string, buffer: Buffer): void {
        this.cache.set(src, {
            buffer,
            time: Date.now(),
            lastAccessed: Date.now()
        })
    }
    public async load(src: string): Promise<Buffer> {
        try {
            const arrayBuffer = await (await fetch(src)).arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (e: unknown) {
            throw Error('Invalid image');
        }
    }
    private async startSweepInterval() {
        setInterval(() => this.sweepCache, 6 * 3600 * 1000);
    }
    private async sweepCache() {
        for (const [src, value] of this.cache) {
            if (Date.now() - value.time > 24 * 3600 * 1000) {
                if (Date.now() - value.lastAccessed > 24 * 3600 * 1000) {
                    this.cache.delete(src);
                    continue
                }
                this.load(src).then(buffer => {
                    this.cache.set(src, {
                        ...value,
                        buffer
                    })
                })
            }
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
