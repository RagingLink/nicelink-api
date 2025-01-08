import { Static, Type } from '@sinclair/typebox';
import { OverlayOptions } from 'sharp';

import Operation from '../Operation.js';
import { RootInputSchema } from '../validateInput.js';
import Image from '../Image.js';
import OperationMeta, { OperationSummaryObject } from '../OperationMeta.js';
import { ImageEditor } from '../services/ImageEditor.js';

// interface SizeObject {
//     width: number;
//     height: number;
// }
interface Coords {
    top: number;
    left: number;
}
const imageSchema = Type.Partial(Type.Object({
    ...RootInputSchema.properties,
    left: Type.Number(),
    top: Type.Number(),
    size: Type.Union([Type.Literal('contain')]),
    blendMode: Type.Union([
        Type.Literal('srcOver'),
        Type.Literal('srcIn'),
        Type.Literal('srcOut'),
        Type.Literal('srcAtop'),
        Type.Literal('dstIn'),
        Type.Literal('dstOut'),
        Type.Literal('dstAtop'),
        Type.Literal('dstOver'),
        Type.Literal('hardLight'),
        Type.Literal('softLight'),
        Type.Literal('colourDodge'),
        Type.Literal('colourBurn'),
        Type.Literal('add'),
        Type.Literal('screen'),
        Type.Literal('overlay'),
        Type.Literal('lighten'),
        Type.Literal('darken'),
        Type.Literal('multiply'),
        Type.Literal('difference'),
        Type.Literal('exclusion'),
        Type.Literal('clear'),
        Type.Literal('source'),
        Type.Literal('saturate'),
        Type.Literal('xor'),
        Type.Literal('dest')
    ]),
    alignment: Type.Union([
        Type.Literal('top-left'),
        Type.Literal('top-middle'),
        Type.Literal('top-right'),
        Type.Literal('left'),
        Type.Literal('center'),
        Type.Literal('right'),
        Type.Literal('bot-left'),
        Type.Literal('bot-middle'),
        Type.Literal('bot-right')
    ])
}));
const overlaysSchema = Type.Array(imageSchema);

type OverlaysData = Static<typeof overlaysSchema>;
type ImageData = Static<typeof imageSchema>;

export default class OverlaysOperation extends Operation<typeof overlaysSchema> {
    public constructor(editor: ImageEditor) {
        super(editor, {
            name: 'images',
            aliases: ['children', 'overlays', 'composites'],
            schema: overlaysSchema,
            dataPropertyAliases: {
                x: 'left',
                y: 'top',
                blend: 'blend',
                align: 'alignment'
            },
            execute: (image, data, meta) => this.overlayImages(image, data, meta)
        });
    };

    private async overlayImages(image: Image, data:OverlaysData, meta: OperationMeta): Promise<OperationMeta> {
        const compositeOptions: OverlayOptions[] = [];
        for (const imageObject of data) {
            const childImage = await this.editor.editImage(imageObject);
            try {
                const fittedImageBuffer = await this.fitImage(image, childImage, {
                    top: imageObject.top ?? 0,
                    left: imageObject.left ?? 0
                });
                const compositeOption: OverlayOptions = {
                    input: fittedImageBuffer,
                    top: imageObject.top ?? 0,
                    left: imageObject.left ?? 0
                };
                compositeOptions.push(compositeOption);
            } catch (err) {
                this.logger.log.error(err);
                childImage.context.addDebug('error', 'Error adjusting dimensions to parent');
            }
            meta.addSubOperations(this.createImageOperation(childImage, imageObject));
        }
        // Simple fit
        image.sharp.composite(compositeOptions);
        return meta;
    };

    private createImageOperation(image: Image, data: ImageData): OperationSummaryObject {
        const imageOperationMeta = new OperationMeta('image', data, image);
        return imageOperationMeta.toJSON();
    }

    private async fitImage(parentImage: Image, image: Image, offset: Coords): Promise<Buffer> {
        const [left, top] = [offset.left, offset.top];
        const cropRegion = {
            width: image.width,
            height: image.height,
            top: 0,
            left: 0
        };
        if (image.width > parentImage.width) {
            cropRegion.width = Math.min(parentImage.width, image.width - Math.abs(left));
            if (left < 0)
                cropRegion.left = -left;
        }
        if (image.height > parentImage.height) {
            cropRegion.height = Math.min(parentImage.height, image.height - Math.abs(top));
            if (top < 0)
                cropRegion.top = -top;
        }
        if (
            cropRegion.top === top &&
            cropRegion.left === left &&
            cropRegion.width === image.width &&
            cropRegion.height === image.height
        )
            return image.buffer;
        return image.sharp.extract({
            top: cropRegion.top,
            left: cropRegion.left,
            height: cropRegion.height,
            width: cropRegion.width
        }).toBuffer();
    }
}
