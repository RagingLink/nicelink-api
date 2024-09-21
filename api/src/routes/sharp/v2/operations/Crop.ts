// TODO mode: 'box' -> x,y,w,h; mode: 'auto' -> specify background https://sharp.pixelplumbing.com/api-resize#trim
import { Static, Type } from '@sinclair/typebox';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Image from '../Image.js';
import Operation from '../Operation.js';

const cropSchema = Type.Union([
    Type.Literal('auto'),
    Type.Object({
        x: Type.Optional(Type.Number()),
        y: Type.Optional(Type.Number()),
        width: Type.Optional(Type.Number()),
        height: Type.Optional(Type.Number())
    })
]);

export default class Crop extends Operation<typeof cropSchema> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'crop',
            schema: cropSchema,
            execute: (image, data) => this.cropImage(image, data),
            dataPropertyAliases: {
                w: 'width',
                h: 'height',
                x: 'left',
                y: 'top'
            }
        });
    }

    private cropImage(image: Image, data: Static<typeof cropSchema>): Image {
        if (data === 'auto') {
            image.sharp.trim({ background: '#00000000' });
        } else {
            image.sharp.extract({
                left: data.x ?? 0,
                top: data.y ?? 0,
                width: data.width ?? image.width,
                height: data.height ?? image.height
            });
            image.height = (data.y ?? 0) + (data.height ?? image.height);
            image.width = (data.x ?? 0) + (data.width ?? image.width);
        }
        return image;
    }
}
