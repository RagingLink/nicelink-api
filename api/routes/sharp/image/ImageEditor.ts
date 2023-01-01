import sizeOf from 'buffer-image-size';
import sharp, { Blend, OverlayOptions } from 'sharp';
import getUuidByString from 'uuid-by-string';

import { AlignmentModes, ChildBody, InputBody, MetaBody, OutputBody, TextBody } from '../../../types/index.js';
import { Logger } from '../../../utils/logging/Logger.js';
import txt2png from '../../../modules/text2png.js';
import mapBody from '../mapBody/index.js';
import Image from './Image.js';
import { ImageFetcher } from './ImageFetcher.js';
import OperationTimer from './OperationTimer.js';

export class ImageEditor {
    private readonly imageFetcher: ImageFetcher;
    private readonly timer: OperationTimer;
    private imageCount = 0;
    private readonly cache: Map<string, {
        buffer: Buffer;
        time: number;
        lastAccessed: number;
        inputBody?: InputBody;
        meta?: MetaBody
    }> = new Map()

    public constructor(public readonly logger: Logger) {
        this.imageFetcher = new ImageFetcher(logger, 100000);
        this.timer = new OperationTimer(logger);

        this.startSweepInterval();
    }

    public async generateImage(inputBody: JObject): Promise<OutputBody> {
        const count = this.imageCount++
        this.timer.start('generation' + count.toString());
        const meta: MetaBody = {
            errors: [],
            warnings: [],
            children: []
        };
        const body = mapBody(inputBody, meta);
        const fetchedImage = await this.fetchImage(body.background, body, meta)
        if (fetchedImage.preEdited)
            return {
                image: fetchedImage,
                meta,
                body
            };
        try {
            await this.editImage(fetchedImage, body, meta, this.imageCount++);
        } catch (e: unknown) {
            this.logger.error(e);
            meta.errors.push('Unexpected error during image editing');
            fetchedImage.sharp = sharp(this.imageFetcher.defaultImageBuffer);
        }
        return {
            image: fetchedImage,
            meta,
            body,
        };
    }

    public async fetchImage(src = '', inputBody: InputBody, meta: MetaBody): Promise<Image> {
        try {
            const cachedBuffer = this.cache.get(this.getBodyStr(inputBody));
            const buffer = cachedBuffer?.buffer
                ?? await this.imageFetcher.get(src);

            return new Image(buffer, this.cache.has(this.getBodyStr(inputBody)));
        } catch (e: unknown) {
            meta.errors.push('Invalid background image');
            return new Image(this.imageFetcher.defaultImageBuffer)
        }
    }

    public async editImage(image: Image, body: InputBody, meta: MetaBody, count: number): Promise<Image> {
        this.timer.start('edit' + count.toString());
        let resized = false;
        const compositeOptions: OverlayOptions[] = [];

        //? If you don't make any changes to the image itself with sharp, you can keep the original Buffer
        //? This cuts out the time needed to go from sharp -> buffer (buffer -> sharp is negligible)
        for (const property of Object.keys(body)) {
            switch (property) {
                case 'width':
                case 'height':
                    if (resized)
                        continue;
                    resized = true;
                    image.resize(body.width, body.height);
                    break;
                case 'opacity': {
                    image.opacity(body.opacity);
                    break;
                }
                case 'rotate':
                    image.rotate(body.rotate);
                    break;
                case 'flip':
                    image.flip(body.flip!);
                    break;
                case 'crop': {
                    image.crop(body.crop!);
                    break;
                }
                case 'text': {
                    image.sharp = sharp(await image.sharp.composite(this.addTextImages(image, body.text!)).toBuffer());
                    break;
                }
                case 'images': {
                    image.sharp = sharp(await image.sharp.composite(await this.addChildImages(image, body.images!, meta, count)).toBuffer())
                    break;
                }
                case 'shape': {
                    switch (body.shape) {
                        case 'circle':
                            void await this.cropCircle(image);
                    }
                    break;
                }
                case 'replaceColor': {
                    await image.replaceColor(body.replaceColor!);
                    break;
                }
            }
        }
        if (compositeOptions.length > 0) {
            this.compositeImages(image, compositeOptions);
        }       
        if (image.edited) {
            void image.sharp.toBuffer().then((buffer) => {
                this.logger.stopwatch(`Image generation: ${this.timer.stop('edit' + count.toString(), true)}ms`);
                this.cache.set(this.getBodyStr(body), {
                    buffer,
                    time: Date.now(),
                    lastAccessed: Date.now(),
                    inputBody: body,
                    meta
                })
            });
        } else {
            this.logger.stopwatch(`Image generation: ${this.timer.stop('edit' + count.toString(), true)}ms`);
            this.cache.set(this.getBodyStr(body), {
                buffer: image.buffer,
                time: Date.now(),
                lastAccessed: Date.now(),
                inputBody: body,
                meta
            })
        }
        return image;
    }
    //* Operations
    private async cropCircle(image: Image): Promise<void> {
        const { width, height } = image;
        const smallest = width > height ? height : width;
        let circleBuffer: Buffer;

        let cachedCircleImage = this.cache.get(this.getBodyStr({ background: 'circleImage', width: smallest, height: smallest }));
        if (cachedCircleImage === undefined) {
            const circleImage = sharp(this.imageFetcher.circleMaskImage);
            circleImage.resize(smallest, smallest);
            circleBuffer = await circleImage.toBuffer();
            this.cache.set(this.getBodyStr({ background: 'circleImage', width: smallest, height: smallest }), {
                buffer: circleBuffer,
                time: Date.now(),
                lastAccessed: Date.now()
            })
        } else {
            circleBuffer = cachedCircleImage.buffer;
            this.cache.set(this.getBodyStr({ background: 'circleImage', width: smallest, height: smallest }), {
                ...cachedCircleImage,
                lastAccessed: Date.now()
            });
        }

        image.sharp.extract({
            top: Math.round((height - smallest) / 2),
            left: Math.round((width - smallest) / 2),
            width: smallest,
            height: smallest
        });
        // This feels kind of hacky
        image.sharp.composite([{
            input: circleBuffer,
            blend: 'dest-in'
        }]);
    }
    private addTextImages(image: Image, textObjects: TextBody[]): OverlayOptions[] {
        const textArray: Array<{ buffer: Buffer; body: TextBody; }> = [];
        for (const textObject of textObjects) {
            const textObjectMaxWidth = { ...textObject, maxWidth: textObject.maxWidth ?? image.width };
            const cachedBuffer = this.cache.get(this.getBodyStr(textObject));
            const textBuffer = cachedBuffer?.buffer
                ?? txt2png(textObject.text ?? '', textObjectMaxWidth);

            this.cache.set(this.getBodyStr(textObject), {
                buffer: textBuffer,
                time: cachedBuffer?.time ?? Date.now(),
                lastAccessed: Date.now()
            })
            textArray.push({
                buffer: textBuffer,
                body: textObject
            });

        }
        const compositeOptions = textArray.map(text => {
            let [x, y] = [text.body.x ?? 0, text.body.y ?? 0];
            if (text.body.alignment !== undefined) {
                const { width, height } = sizeOf(text.buffer);
                const alignCoords = this.getAlignCoords({ width: image.width, height: image.height }, { width, height }, text.body.alignment);
                x += alignCoords.x;
                y += alignCoords.y;
            }
            return {
                input: text.buffer,
                left: x,
                top: y
            };
        });
        return compositeOptions;
    }
    private async addChildImages(image: Image, childObjects: ChildBody[], meta: MetaBody, count: number): Promise<OverlayOptions[]> {
        const childArray: Array<{ buffer: Buffer; body: ChildBody; }> = [];
        for (const childObject of childObjects) {
            meta.children[meta.children.length] = {
                errors: [],
                warnings: [],
                children: []
            };
            const childImage = await this.fetchImage(childObject.background, childObject, meta.children[meta.children.length - 1]);
            try {
                if (!childImage.preEdited)
                    await this.editImage(childImage, childObject, meta.children[meta.children.length - 1], count);
            } catch (e: unknown) {
                this.logger.error(e);
                meta.errors.push('Unexpected error during image generation');
                childImage.sharp = sharp(this.imageFetcher.defaultImageBuffer);
            }

            switch (childObject.size) {
                case 'contain': {
                    const resizeFactor = childImage.width / image.width > childImage.height / image.height ? childImage.width / image.width : childImage.height / image.height;
                    if (resizeFactor > 1) {
                        childImage.resize(childImage.width / resizeFactor, childImage.height / resizeFactor);
                    }
                    break;
                }
                default:
                    if (childImage.width > image.width || childImage.height > image.height) {
                        childImage.crop({
                            width: childImage.width > image.width ? image.width : childImage.width,
                            height: childImage.height > image.height ? image.height : childImage.height
                        });
                    }
            }
            childArray.push({
                buffer: childImage.edited ? await childImage.sharp.toBuffer() : childImage.buffer,
                body: childObject
            });
        }
        return childArray.map(({ buffer, body: childBody }) => {
            let [x, y] = [childBody.x ?? 0, childBody.y ?? 0];
            if (childBody.alignment !== undefined) {
                const { width, height } = sizeOf(buffer);
                const alignCoords = this.getAlignCoords({ width: image.width, height: image.height }, { width, height }, childBody.alignment);
                x += alignCoords.x;
                y += alignCoords.y;
            }
            return {
                input: buffer,
                top: y,
                left: x,
                blend: this.getBlendMode(childBody.blendMode)
            };
        });
    }
    private compositeImages(image: Image, compositeOptions: OverlayOptions[]): void {
        image.sharp.composite(compositeOptions);
    }
    private getAlignCoords(parentSize: { width: number; height: number; }, childSize: { width: number; height: number; }, alignment: AlignmentModes): { x: number; y: number; } {
        const alignCoords = {
            x: 0,
            y: 0
        };
        switch (alignment) {
            case 'top-left':
                break;
            case 'top-middle':
                alignCoords.x = Math.round(parentSize.width / 2 - childSize.width / 2);
                break;
            case 'top-right':
                alignCoords.x = parentSize.width - childSize.width;
                break;
            case 'left':
                alignCoords.y = Math.round(parentSize.height / 2 - childSize.height / 2);
                break;
            case 'center':
                alignCoords.x = Math.round(parentSize.width / 2 - childSize.width / 2);
                alignCoords.y = Math.round(parentSize.height / 2 - childSize.height / 2);
                break;
            case 'right':
                alignCoords.x = parentSize.width - childSize.width;
                alignCoords.y = Math.round(parentSize.height / 2 - childSize.height / 2);
                break;
            case 'bot-left':
                alignCoords.y = parentSize.height - childSize.height;
                break;
            case 'bot-middle':
                alignCoords.x = Math.round(parentSize.width / 2 - childSize.width / 2);
                alignCoords.y = parentSize.height - childSize.height;
                break;
            case 'bot-right':
                alignCoords.x = parentSize.width - childSize.width;
                alignCoords.y = parentSize.height - childSize.height;
                break;
        }
        return alignCoords;
    }
    private getBlendMode(blendMode?: string): Blend {
        /* SHARP
            clear, source, over, in, out, atop, dest, dest-over, dest-in, dest-out,
            dest-atop, xor, add, saturate, multiply, screen, overlay, darken, lighten,
            colour-dodge, color-dodge, colour-burn,color-burn, hard-light, soft-light, difference, exclusion.
        */

        /* JIMP
            'srcOver' | 'dstOver' | 'multiply' | 'add' | 'screen' | 'overlay' | 'darken' | 'lighten' |
            'hardLight' | 'difference' | 'exclusion'
        */
        switch (blendMode) {
            case 'add':
            case 'screen':
            case 'overlay':
            case 'lighten':
            case 'darken':
            case 'multiply':
            case 'difference':
            case 'exclusion':
            case 'clear':
            case 'source':
            case 'saturate':
            case 'xor':
            case 'dest':
                return blendMode;
            case 'srcOver':
                return 'over';
            case 'srcIn':
                return 'in';
            case 'srcOut':
                return 'out';
            case 'srcAtop':
                return 'atop';
            case 'dstIn':
                return 'dest-in';
            case 'dstOut':
                return 'dest-out';
            case 'dstAtop':
                return 'dest-atop';
            case 'dstOver':
                return 'dest-over';
            case 'hardLight':
                return 'hard-light';
            case 'softLight':
                return 'soft-light';
            case 'colourDodge':
            case 'colorDodge':
                return 'colour-dodge';
            case 'colourBurn':
            case 'colorBurn':
                return 'colour-burn';
            default:
                return 'over';
        }
    }
    private getBodyStr(body: InputBody | TextBody): string {
        return getUuidByString(JSON.stringify(
            Object.assign({ ...body }, { cacheDuration: undefined, alignment: undefined, x: undefined, y: undefined, blendMode: undefined, size: undefined })
        ));
    }

    private startSweepInterval() {
        setInterval(() => this.sweepCache(), 6 * 3600 * 1000);
    }
    private sweepCache() {
        for (const [bodyStr, value] of this.cache) {
            if (Date.now() - value.time > 25 * 3600 * 1000) {
                if (Date.now() - value.lastAccessed > 25 * 3600 * 1000) {
                    this.cache.delete(bodyStr);
                    continue
                }
                this.cache.delete(bodyStr);
                const body = value.inputBody;
                if (body === undefined) continue;
                const meta = value.meta ?? {
                    errors: [],
                    warnings: [],
                    children: []
                }
                try {
                   this.fetchImage(body.background, body, meta).then(image => {
                        this.editImage(image, body, meta, this.imageCount++).then(() => {
                            this.logger.info('Refreshed edited image')
                        });
                    });
                } catch (e: unknown) {
                    this.logger.error(e);
                }
            }
        }
    }
}
