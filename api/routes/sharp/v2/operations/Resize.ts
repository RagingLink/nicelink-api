import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import { mapping } from '../../../../utils/mapping/index.js';
import Operation from '../Operation.js';

export interface ResizeData {
    width?: number;
    height?: number;
}

export default class ResizeOperation extends Operation<ResizeData> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'resize',
            dataPropertyAliases: {
                w: 'width',
                h: 'height'
            },
            mapping: mapping.choice(mapping.object({
                width: mapping.number.optional,
                height: mapping.number.optional
            }), mapping.object({
                width: mapping.number
            }), mapping.object({
                height: mapping.number
            })
            ),
            execute: (image, data) => {
                if (image.width === (data.width ?? image.width) && image.height === (data.height ?? image.height))
                    return image;
                image.sharp.resize(data.width ?? null, data.height ?? null);
                return image;
            }

        });
    }
}
