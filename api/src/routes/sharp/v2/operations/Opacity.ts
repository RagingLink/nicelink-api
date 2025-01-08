import { Type } from '@sinclair/typebox';

import Operation from '../Operation.js';
import { ImageEditor } from '../services/ImageEditor.js';

const opacitySchema = Type.Number({ maximum: 1, minimum: 0 });

export default class Opacity extends Operation<typeof opacitySchema> {
    public constructor(editor: ImageEditor) {
        super(editor, {
            name: 'opacity',
            aliases: ['o'],
            schema: opacitySchema,
            execute: (img, data, meta) => {
                img.sharp.composite([{
                    input: Buffer.from([0, 0, 0, Math.round(data * 255)]),
                    raw: {
                        width: 1,
                        height: 1,
                        channels: 4
                    },
                    tile: true,
                    blend: 'dest-in'
                }]);
                return meta;
            }
        });
    }
}
