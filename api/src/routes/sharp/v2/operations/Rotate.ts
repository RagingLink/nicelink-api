import { Type } from '@sinclair/typebox';

import Operation from '../Operation.js';
import { ImageEditor } from '../services/ImageEditor.js';

//Specify range maybe?
const rotateSchema = Type.Number();

export default class Rotate extends Operation<typeof rotateSchema> {
    public constructor(editor: ImageEditor) {
        super(editor, {
            name: 'rotate',
            schema: rotateSchema,
            execute: (image, data, meta) => {
                image.sharp.rotate(data, { background: '#00000000' });
                return meta;
            }
        });
    }
}
