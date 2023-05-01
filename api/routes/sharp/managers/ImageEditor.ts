import sizeOf from 'buffer-image-size';
import chalk from 'chalk';
import sharp, { Blend, OverlayOptions } from 'sharp';
import getUuidByString from 'uuid-by-string';

import { NiceLogger } from '../../../Logger.js';
import { AlignmentModes, ChildBody, InputBody, MetaBody, OutputBody, TextBody } from '../../../types/index.js';
import mapBody from '../mapBody/index.js';
import CacheManager from './CacheManager.js';
import Image from './Image.js';
import { ImageFetcher } from './ImageFetcher.js';
import TextManager from './TextManager.js';
import Timer from './Timer.js';

interface SizeObject {
    width: number;
    height: number;
}
interface Coords {
    x: number;
    y: number;
}
export class ImageEditor {
    private readonly imageFetcher: ImageFetcher;
    private readonly cache: CacheManager<{
        buffer: Buffer;
        inputBody?: InputBody;
        meta?: MetaBody;
    }>;
    public constructor(public readonly logger: NiceLogger, public readonly textManager: TextManager) {
        this.imageFetcher = new ImageFetcher(logger, 100000);
        //? Refresh every half hour and keep edited images cached for 6 hours
        this.cache = new CacheManager({hours: 6, refresh: 0.5});
    }

    public async generateImage(inputBody: JObject): Promise<OutputBody> {
        const timer = new Timer();
        const meta: MetaBody = {
            errors: [],
            warnings: [],
            children: []
        };
        const body = mapBody(inputBody, meta);
        const fetchedImage = await this.fetchImage(body.background, body, meta);
        if (fetchedImage.preEdited)
            return {
                image: fetchedImage,
                meta,
                body
            };
        try {
            await this.editImage(fetchedImage, body, meta, timer);
        } catch (e: unknown) {
            this.logger.log('error', 'Editor', e);
            meta.errors.push('Unexpected error during image editing');
            fetchedImage.sharp = sharp(this.imageFetcher.defaultImageBuffer);
        }
        return {
            image: fetchedImage,
            meta,
            body
        };
    }

    public async fetchImage(src = '', inputBody: InputBody, meta: MetaBody): Promise<Image> {
        try {
            const cachedBuffer = this.cache.get(this.getBodyStr(inputBody));
            const buffer = cachedBuffer?.buffer
                ?? await this.imageFetcher.get(src);
            return new Image(buffer, this.cache.get(this.getBodyStr(inputBody)) !== undefined);
        } catch (e: unknown) {
            meta.errors.push('Invalid background image');
            return new Image(this.imageFetcher.defaultImageBuffer);
        }
    }

    public async editImage(image: Image, body: InputBody, meta: MetaBody, timer?: Timer): Promise<Image> {
        let resized = false;
        const compositeOptions: OverlayOptions[] = [];

        //? If you don't make any changes to the image itself with sharp, you can keep the original Buffer
        //? This cuts out the time needed to go from sharp -> buffer (buffer -> sharp is negligible)
        for (const property of Object.keys(body)) {
            const operationTimer = new Timer();
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
                    image.flip(body.flip);
                    break;
                case 'crop': {
                    image.crop(body.crop);
                    break;
                }
                case 'text': {
                    if (body.text !== undefined)
                        image.sharp.composite(await this.addTextImages(image, body.text));
                    break;
                }
                case 'images': {
                    if (body.images !== undefined)
                        image.sharp.composite(await this.addChildImages(image, body.images, meta));
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
                    await image.replaceColor(body.replaceColor);
                    break;
                }
            }
            image.sharp = sharp(await image.sharp.toBuffer());
            if (operationTimer.elapsedMS > 500 && property !== 'images')
                this.logger.log('image', 'EditOperation', chalk.white(property), operationTimer.elapsedBlueStr);
        }
        if (compositeOptions.length > 0) {
            this.compositeImages(image, compositeOptions);
        }
        if (image.edited) {
            void image.sharp.toBuffer().then((buffer) => {
                if (timer !== undefined)
                    this.logger.log('image', 'Editor', 'Generated image', timer.elapsedBlueStr);
                this.cache.set(this.getBodyStr(body), {
                    buffer,
                    inputBody: body,
                    meta
                });
            });
        } else {
            if (timer !== undefined)
                this.logger.log('image', 'Editor', 'Generated image', timer.elapsedBlueStr);
            this.cache.set(this.getBodyStr(body), {
                buffer: image.buffer,
                inputBody: body,
                meta
            });
        }
        return image;
    }
    //* Operations
    private async cropCircle(image: Image): Promise<void> {
        const { width, height } = image;
        const smallest = width > height ? height : width;
        let circleBuffer: Buffer;

        const cachedCircleImage = this.cache.get(this.getBodyStr({ background: 'circleImage', width: smallest, height: smallest }));
        if (cachedCircleImage === undefined) {
            const circleImage = sharp(this.imageFetcher.circleMaskImage);
            circleImage.resize(smallest, smallest);
            circleBuffer = await circleImage.toBuffer();
            this.cache.set(this.getBodyStr({ background: 'circleImage', width: smallest, height: smallest }), {
                buffer: circleBuffer
            });
        } else {
            circleBuffer = cachedCircleImage.buffer;
            this.cache.set(this.getBodyStr({ background: 'circleImage', width: smallest, height: smallest }), {
                ...cachedCircleImage
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
    private async addTextImages(image: Image, textObjects: TextBody[]): Promise<sharp.OverlayOptions[]> {
        const textArray: Array<{ buffer: Buffer; body: TextBody; }> = [];
        for (const textObject of textObjects) {
            const textObjectMaxWidth = { ...textObject, maxWidth: textObject.maxWidth ?? image.width };
            const cachedBuffer = this.cache.get(this.getBodyStr(textObjectMaxWidth, 'text'));
            const textBuffer = cachedBuffer?.buffer
                ?? this.textManager.text2png(textObject.text ?? '', textObjectMaxWidth);

            this.cache.set(this.getBodyStr(textObjectMaxWidth), {
                buffer: textBuffer
            });
            textArray.push({
                buffer: textBuffer,
                body: textObjectMaxWidth
            });

        }
        const overlayOptions = await Promise.all(textArray.map(async text => {
            const overlayOption = {
                input: text.buffer,
                left: 0,
                top: 0
            };
            const { width, height } = sizeOf(text.buffer);
            const alignCoords = this.getAlignCoords(image, { width, height }, text.body.alignment ?? 'top-left');
            const coords = { x: text.body.x ?? 0, y: text.body.y ?? 0 };
            const [leftOffset, topOffset] = [alignCoords.x + coords.x, alignCoords.y + coords.y];
            const parentDimensions = { width: image.width, height: image.height };
            const textDimensions = { width, height };

            if (!this.canImageFit(parentDimensions, textDimensions)) {
                text.buffer = await this.fitImage(parentDimensions, new Image(text.buffer), coords, alignCoords).sharp.toBuffer();
                if (leftOffset > 0)
                    overlayOption.left += leftOffset;
                if (topOffset > 0)
                    overlayOption.top += topOffset;
            } else {
                overlayOption.left = leftOffset;
                overlayOption.top = topOffset;
            }
            return overlayOption;
        }));
        return overlayOptions;
    }
    private async addChildImages(image: Image, childObjects: ChildBody[], meta: MetaBody): Promise<OverlayOptions[]> {
        const childArray: OverlayOptions[] = [];
        for (const childObject of childObjects) {
            meta.children[meta.children.length] = {
                errors: [],
                warnings: [],
                children: []
            };
            const childImage = await this.fetchImage(childObject.background, childObject, meta.children[meta.children.length - 1]);
            try {
                if (!childImage.preEdited)
                    await this.editImage(childImage, childObject, meta.children[meta.children.length - 1]);
            } catch (e: unknown) {
                this.logger.log('error', 'Editor', e);
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
            }
            const childDimensions = { width: childImage.width, height: childImage.height };
            const parentDimensions = { width: image.width, height: image.height };
            const alignCoords = this.getAlignCoords(image, childDimensions, childObject.alignment ?? 'top-left');
            const coords = { x: childObject.x ?? 0, y: childObject.y ?? 0 };

            let leftOffset = coords.x + alignCoords.x;
            let topOffset = coords.y + alignCoords.y;
            if (!this.canImageFit(parentDimensions, childDimensions)) {
                this.fitImage(parentDimensions, childImage, coords, alignCoords);
                leftOffset = leftOffset > 0 ? leftOffset : 0;
                topOffset = topOffset > 0 ? topOffset : 0;
            }

            childArray.push({
                input: childImage.edited ? await childImage.sharp.toBuffer() : childImage.buffer,
                blend: this.getBlendMode(childObject.blendMode),
                top: topOffset,
                left: leftOffset
            });
        }
        return childArray;
    }
    private compositeImages(image: Image, compositeOptions: OverlayOptions[]): void {
        image.sharp.composite(compositeOptions);
    }

    private getAlignCoords(parentImage: Image, childSize: SizeObject, alignment: AlignmentModes): Coords {
        const alignCoords = {
            x: 0,
            y: 0
        };
        switch (alignment) {
            case 'top-left':
                break;
            case 'top-middle':
                alignCoords.x = Math.round(parentImage.width / 2 - childSize.width / 2);
                break;
            case 'top-right':
                alignCoords.x = parentImage.width - childSize.width;
                break;
            case 'left':
                alignCoords.y = Math.round(parentImage.height / 2 - childSize.height / 2);
                break;
            case 'center':
                alignCoords.x = Math.round(parentImage.width / 2 - childSize.width / 2);
                alignCoords.y = Math.round(parentImage.height / 2 - childSize.height / 2);
                break;
            case 'right':
                alignCoords.x = parentImage.width - childSize.width;
                alignCoords.y = Math.round(parentImage.height / 2 - childSize.height / 2);
                break;
            case 'bot-left':
                alignCoords.y = parentImage.height - childSize.height;
                break;
            case 'bot-middle':
                alignCoords.x = Math.round(parentImage.width / 2 - childSize.width / 2);
                alignCoords.y = parentImage.height - childSize.height;
                break;
            case 'bot-right':
                alignCoords.x = parentImage.width - childSize.width;
                alignCoords.y = parentImage.height - childSize.height;
                break;
        }
        return alignCoords;
    }
    // can fit without the child image being outside the parent in any way
    private canImageFit(parentDimensions: SizeObject, childDimensions: SizeObject): boolean {
        if (childDimensions.width > parentDimensions.width)
            return false;
        if (childDimensions.height > parentDimensions.height)
            return false;
        return true;
    }
    private fitImage(fitDimensions: SizeObject, image: Image, offset: Coords, alignOffset: Coords): Image {
        const [left, top] = [alignOffset.x + offset.x, alignOffset.y + offset.y];
        const cropRegion = {
            width: image.width,
            height: image.height,
            x: 0,
            y: 0
        };
        if (image.width > fitDimensions.width) {
            cropRegion.width = Math.min(fitDimensions.width, image.width - Math.abs(left));
            if (left < 0)
                cropRegion.x = -left;
        }
        if (image.height > fitDimensions.height) {
            cropRegion.height = Math.min(fitDimensions.height, image.height - Math.abs(top));
            if (top < 0)
                cropRegion.y = -top;
        }
        return image.crop(cropRegion);
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
    private getBodyStr(body: InputBody | TextBody, type?: 'text'): string {
        const ignoreProps = { cacheDuration: undefined, alignment: undefined, x: undefined, y: undefined, blendMode: undefined, size: undefined };
        switch (type) {
            case 'text':
                delete ignoreProps.size;
                break;
            case undefined:
                break;
        }
        return getUuidByString(JSON.stringify(
            Object.assign({ ...body }, ignoreProps)
        ));
    }

}
