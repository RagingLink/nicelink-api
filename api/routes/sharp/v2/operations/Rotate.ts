import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../../utils/mapping/index.js';
import Operation from '../Operation.js';

export default class Rotate extends Operation<number> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'rotate',
            mapping: mapping.number,
            execute: (image, data) => {
                image.sharp.rotate(data, { background: '#00000000' });
                return image;
            }
        });
    }
}
