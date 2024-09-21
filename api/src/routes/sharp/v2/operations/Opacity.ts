import { Type } from '@sinclair/typebox';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Image from '../Image.js';
import Operation from '../Operation.js';

const opacitySchema = Type.Number({ maximum: 1, minimum: 0 });

export default class Opacity extends Operation<typeof opacitySchema> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'opacity',
            aliases: ['o'],
            schema: opacitySchema,
            execute: (img, data) => this.changeOpacity(img, data)
        });
    }

    private changeOpacity(image: Image, data: number): Image {
        image.sharp.composite([{
            input: Buffer.from([0, 0, 0, Math.round(data * 255)]),
            raw: {
                width: 1,
                height: 1,
                channels: 4
            },
            tile: true,
            blend: 'dest-in'
        }]);
        return image;
    }
}
