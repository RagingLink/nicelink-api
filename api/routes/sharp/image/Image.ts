import sizeOf from 'buffer-image-size';
import { fileTypeFromBuffer } from 'file-type';
import sharp, { Sharp } from 'sharp';
import replaceColor from '../../../modules/replaceColor.js';

import { CropOption, InputBody, ReplaceColorBody } from '../../../types/index.js';

export default class Image {
    #sharpImage?: Sharp;
    #width: number;
    #height: number;
    public readonly operations: Array<{action: keyof InputBody; data: InputBody[keyof InputBody];}>;
    public edited : boolean;
    public constructor(public readonly buffer: Buffer, public readonly preEdited = false) {
        const {width, height} = sizeOf(buffer);
        this.#width = width;
        this.#height = height;
        this.operations = [];
        this.edited = false;
    }
    public async format(): Promise<string> {
        return (this.edited ? (await this.sharp.metadata()).format : (await fileTypeFromBuffer(this.buffer))?.ext)  ?? 'png' ;
    }

    //* Getters and setters
    public get sharp(): Sharp {
        this.edited = true;
        if (this.#sharpImage === undefined)
            return this.#sharpImage = sharp(this.buffer);
        return this.#sharpImage;
    }
    public set sharp(sharp: Sharp) {
        this.edited = true;
        this.#sharpImage = sharp;
    }
    public get width(): number {
        return this.#width;
    }
    public set width(width: number) {
        this.#width = Math.round(width);
    }
    public get height(): number {
        return this.#height;
    }
    public set height(height: number) {
        this.#height = Math.round(height);
    }
    //* Methods
    public resize(width?: number, height?: number): this {
        // Don't resize if the dimensions are the same!!!!!!
        if (this.width === (width ?? this.width) && this.height === (height ?? this.height))
            return this;
        if (width !== undefined && height !== undefined) {
            this.width = width;
            this.height = height;
            this.sharp.resize(this.width, this.height, {fit: 'fill'});
            this.addAction('resize', {width: this.width, height: this.height});
        } else {
            let scaledWidth: number;
            let scaledHeight: number;
            if (height === undefined && width !== undefined) {
                scaledHeight = width / this.width * this.height;
                this.height = scaledHeight;
                this.width = width;
            } else if (width === undefined && height !== undefined) {
                scaledWidth = height / this.height * this.width;
                this.width = scaledWidth;
                this.height = height;
            }
            this.sharp.resize(this.width, this.height);
            this.addAction('resize', {width, height});
        }
        return this
    }
    public crop(cropOptions: CropOption): void {
        this.addAction('crop', cropOptions);
        if (typeof cropOptions === 'number') {
            this.sharp.extract({
                left: 0,
                top: 0,
                width: cropOptions,
                height: cropOptions
            });
            this.width = cropOptions;
            this.height = cropOptions;
        } else if (cropOptions === 'auto') {
            this.sharp.trim();
        } else {
            this.sharp.extract({
                left: cropOptions.x ?? 0,
                top: cropOptions.y ?? 0,
                width: cropOptions.width ?? this.width,
                height: cropOptions.height ?? this.height
            });
            this.height = (cropOptions.y ?? 0) + (cropOptions.height ?? this.height);
            this.width = (cropOptions.x ?? 0) + (cropOptions.width ?? this.width);
        }
    }
    public opacity(opacity = 0): void {
        this.sharp.removeAlpha().ensureAlpha(opacity > 1 ? opacity / 100 : opacity);
        this.addAction('opacity', opacity);
    }
    public rotate(rotate = 0): void {
        this.sharp.rotate(rotate, {background: '#00000000'});
        this.addAction('rotate', rotate);
    }
    public flip(flip: 1 | 2 | 3): void {
        switch (flip) {
            case 1:
                this.sharp.flip();
                break;
            case 2:
                this.sharp.flop();
                break;
            case 3:
                this.sharp.flip().flop()
                break;
        }
    }
    public async replaceColor(replaceOptions: ReplaceColorBody): Promise<this> {
        await replaceColor(this, replaceOptions);
        return this;
    }
    private addAction <T extends keyof InputBody, K extends InputBody[T]>(action: T, data: K): void {
        this.operations.push({
            action,
            data
        });
    }
}
