import { Type } from '@sinclair/typebox';

import Operation from '../Operation.js';
import { ImageEditor } from '../services/ImageEditor.js';

const flipSchema = Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3)]);

export default class Flip extends Operation<typeof flipSchema> {
    public constructor(editor: ImageEditor) {
        super(editor, {
            name: 'flip',
            schema: flipSchema,
            execute: (image, data, meta) => {
                switch (data) {
                    case 1:
                        image.sharp.flip();
                        break;
                    case 2:
                        image.sharp.flop();
                        break;
                    case 3:
                        image.sharp.flip().flop();
                        break;
                }
                return meta;
            }
        });
    }
}
