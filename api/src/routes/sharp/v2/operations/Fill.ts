import sharp from 'sharp';
import { Type } from '@sinclair/typebox';

import Operation from '../Operation.js';
import { ImageEditor } from '../services/ImageEditor.js';

const fillSchema = Type.String();

export default class Fill extends Operation<typeof fillSchema> {
    public constructor(editor: ImageEditor) {
        super(editor, {
            name: 'fill',
            schema: fillSchema,
            execute: (image, data, meta) => {
                if (image.background !== '')
                    return meta; //TODO replace colour??
                image.sharp = sharp({ create: {
                    channels: 4,
                    background: data,
                    width: image.width,
                    height: image.height
                } }).png();
                return meta;
            }
        });
    }
}
