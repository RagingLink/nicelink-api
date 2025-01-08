import sizeOf from 'buffer-image-size';
import sharp, { Sharp } from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import Context from './Context.js';

import { getImageMimeType } from '../../../utils/constants/MimeTypes.js';
import API from '../../../api.js';

interface ImageOptions {
    buffer: Buffer;
    background: string;
    fetchDuration?: number
    parent?: Image
}

export default class Image {
    public readonly context: Context;
    public readonly id: string;
    public readonly background: string;
    public fetchDuration: number;
    public parentImage?: Image;

    #sharp: Sharp;
    #width: number;
    #height: number;
    #buffer: Buffer;

    public constructor(public readonly logger: API['logger'], { buffer, background, fetchDuration = 0, parent }: ImageOptions) {

        this.context = new Context(logger, this, parent?.context);
        this.id = uuidv4();

        this.background = background;
        this.fetchDuration = fetchDuration;

        const { width, height } = sizeOf(buffer);
        this.#width = width;
        this.#height = height;

        this.#sharp = sharp(buffer);
        this.#buffer = buffer;
        if (parent !== undefined)
            this.parentImage = parent;
    }

    public get sharp(): Sharp {
        return this.#sharp;
    }

    public set sharp(newSharp: Sharp) {
        this.#sharp = newSharp;
    }

    public get width(): number {
        return this.#width;
    }

    public set width(width: number) {
        this.#width = width;
    }

    public get height(): number {
        return this.#height;
    }

    public set height(height: number) {
        this.#height = height;
    }

    public get buffer(): Buffer {
        return this.#buffer;
    }

    public async updateBuffer(): Promise<Buffer> {
        const newBuffer = await this.#sharp.toBuffer();
        return this.setBuffer(newBuffer);
    }

    public setBuffer(buffer: Buffer): Buffer {
        if (this.#buffer === buffer)
            return buffer;
        this.#buffer = buffer;
        this.#sharp = sharp(buffer);
        // Update dimensions
        this.setDimensions(buffer);
        return buffer;
    }

    public async getFormat(): Promise<string> {
        return (await this.#sharp.metadata()).format ?? '';
    }

    public async getMimeType(): Promise<string> {
        const imageFormat = await this.getFormat();
        return getImageMimeType(imageFormat) ?? 'image/png';
    }

    private setDimensions(buffer: Buffer): void {
        const { width, height } = sizeOf(buffer);
        this.#width = width;
        this.#height = height;
    }

}
