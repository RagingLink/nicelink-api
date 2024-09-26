import { Type } from '@sinclair/typebox';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Operation from '../Operation.js';

const flipSchema = Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3)]);

export default class Flip extends Operation<typeof flipSchema> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'flip',
            schema: flipSchema,
            execute: (image, data) => {
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
                return image;
            }
        });
    }
}
