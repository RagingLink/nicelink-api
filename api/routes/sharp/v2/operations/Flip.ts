import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../../utils/mapping/index.js';
import Operation from '../Operation.js';

export default class Flip extends Operation<1 | 2 | 3> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'flip',
            mapping: mapping.guard((v): v is 1 | 2 | 3 => [1, 2, 3].includes(v)),
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
