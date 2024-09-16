import sizeOf from 'buffer-image-size';
import sharp, { Sharp } from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';
import Context from './Context.js';

export default class Image {
    public readonly context: Context;
    public readonly id: string;

    #sharp: Sharp;
    #width: number;
    #height: number;

    public constructor(public readonly logger: DefaultLogger, buffer: Buffer, public readonly background: string) {

        this.context = new Context(logger, this);
        this.id = uuidv4();

        const { width, height } = sizeOf(buffer);
        this.#width = width;
        this.#height = height;

        this.#sharp = sharp(buffer);
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

    public async updateBuffer(): Promise<Buffer> {
        const newBuffer = await this.#sharp.toBuffer();
        this.#sharp = sharp(newBuffer);
        return newBuffer;
    }

    public setBuffer(buffer: Buffer): void {
        this.#sharp = sharp(buffer);
        // Update dimensions
        this.setDimensions(buffer);
    }

    private setDimensions(buffer: Buffer): void {
        const { width, height } = sizeOf(buffer);
        this.#width = width;
        this.#height = height;
    }

    public async getFormat(defaultFormat = 'png'): Promise<string> {
        return (await this.#sharp.metadata()).format ?? defaultFormat;
    }
}
