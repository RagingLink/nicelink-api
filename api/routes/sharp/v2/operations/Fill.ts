import sharp from 'sharp';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../../utils/mapping/index.js';
import Operation from '../Operation.js';

export default class Fill extends Operation<string> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'fill',
            mapping: mapping.string,
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
