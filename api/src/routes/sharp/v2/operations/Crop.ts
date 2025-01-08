// TODO mode: 'box' -> x,y,w,h; mode: 'auto' -> specify background https://sharp.pixelplumbing.com/api-resize#trim
import { Static, Type } from '@sinclair/typebox';

import Image from '../Image.js';
import Operation from '../Operation.js';
import NumberResolver, { DynamicNumber } from '../services/NumberResolver.js';
import OperationMeta from '../OperationMeta.js';
import { ImageEditor } from '../services/ImageEditor.js';

const cropSchema = Type.Union([
    Type.Literal('auto'),
    Type.Object({
        left: Type.Optional(DynamicNumber),
        top: Type.Optional(DynamicNumber),
        width: Type.Optional(DynamicNumber),
        height: Type.Optional(DynamicNumber)
    })
]);

export default class Crop extends Operation<typeof cropSchema> {
    private resolver: NumberResolver;

    public constructor(editor: ImageEditor) {
        super(editor, {
            name: 'crop',
            schema: cropSchema,
            execute: (image, data, meta) => this.cropImage(image, data, meta),
            dataPropertyAliases: {
                w: 'width',
                h: 'height',
                x: 'left',
                y: 'top'
            }
        });
        this.resolver = new NumberResolver(this.logger);
    }

    private cropImage(image: Image, data: Static<typeof cropSchema>, meta: OperationMeta): OperationMeta {
        if (data === 'auto') {
            image.sharp.trim({ background: '#00000000' });
        } else {
            const [left, top, width, height] = this.resolver.eval(image, data.left, data.top, data.width, data.height);
            meta.changeData({
                left,
                top,
                width,
                height
            });
            image.sharp.extract({
                left: left ?? 0,
                top: top ?? 0,
                width: width ?? image.width,
                height: height ?? image.height
            });
            image.height = (left ?? 0) + (height ?? image.height);
            image.width = (top ?? 0) + (width ?? image.width);
        }
        return meta;
    }
}
