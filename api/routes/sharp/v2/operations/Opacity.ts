import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../../utils/mapping/index.js';
import Image from '../Image.js';
import Operation from '../Operation.js';

export default class Opacity extends Operation<number> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'opacity',
            aliases: ['o'],
            mapping: mapping.number,
            execute: (img, data) => this.changeOpacity(img, data)
        });
    }

    private changeOpacity(image: Image, data: number): Image {
        image.sharp.removeAlpha().ensureAlpha(data);
        return image;
    }
}
