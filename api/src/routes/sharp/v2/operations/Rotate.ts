import { Type } from '@sinclair/typebox';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Operation from '../Operation.js';

//Specify range maybe?
const rotateSchema = Type.Number();

export default class Rotate extends Operation<typeof rotateSchema> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'rotate',
            schema: rotateSchema,
            execute: (image, data) => {
                image.sharp.rotate(data, { background: '#00000000' });
                return image;
            }
        });
    }
}
