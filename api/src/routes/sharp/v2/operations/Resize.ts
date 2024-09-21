import { Type } from '@sinclair/typebox';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Operation from '../Operation.js';

export interface ResizeData {
    width?: number;
    height?: number;
}

const resizeSchema = Type.Object({
    width: Type.Optional(Type.Number()),
    height: Type.Optional(Type.Number())
});

export default class ResizeOperation extends Operation<typeof resizeSchema> {
    public constructor(public readonly logger: DefaultLogger) {
        super(logger, {
            name: 'resize',
            dataPropertyAliases: {
                w: 'width',
                h: 'height'
            },
            schema: resizeSchema,
            execute: (image, data) => {
                const targetWidth = data.width ?? image.width;
                const targetHeight = data.height ?? image.height;

                if (image.width === targetWidth && image.height === targetHeight)
                    return image;
                image.sharp.resize(data.width ?? null, data.height ?? null);
                return image;
            }

        });
    }
}
