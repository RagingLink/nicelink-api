import sharp from 'sharp';
import { Type } from '@sinclair/typebox';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Operation from '../Operation.js';

const fillSchema = Type.String();

export default class Fill extends Operation<typeof fillSchema> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'fill',
            schema: fillSchema,
            execute: (image, data) => {
                if (image.background !== '')
                    return image; //TODO replace colour??
                image.sharp = sharp({ create: {
                    channels: 4,
                    background: data,
                    width: image.width,
                    height: image.height
                } }).png();
                return image;
            }
        });
    }
}
