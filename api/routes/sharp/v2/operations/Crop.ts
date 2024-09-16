// TODO mode: 'box' -> x,y,w,h; mode: 'auto' -> specify background https://sharp.pixelplumbing.com/api-resize#trim
import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../../utils/mapping/index.js';
import Image from '../Image.js';
import Operation from '../Operation.js';

export type CropData = 'auto' | { x?: number; y?: number; width?: number; height?: number; };

export default class Crop extends Operation<CropData> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'crop',
            mapping: mapping.choice(
                mapping.guard((v): v is 'auto' => v === 'auto'),
                mapping.object({
                    width: mapping.number.optional,
                    height: mapping.number.optional,
                    x: mapping.number.optional,
                    y: mapping.number.optional
                })),
            execute: (image, data) => this.cropImage(image, data),
            dataPropertyAliases: {
                w: 'width',
                h: 'height',
                x: 'left',
                y: 'top'
            }
        });
    }

    private cropImage(image: Image, data: CropData): Image {
        if (data === 'auto') {
            image.sharp.trim({ background: '#00000000' });
        } else {
            image.sharp.extract({
                left: data.x ?? 0,
                top: data.y ?? 0,
                width: data.width ?? image.width,
                height: data.height ?? image.height
            });
            image.height = (data.y ?? 0) + (data.height ?? image.height);
            image.width = (data.x ?? 0) + (data.width ?? image.width);
        }
        return image;
    }
}
