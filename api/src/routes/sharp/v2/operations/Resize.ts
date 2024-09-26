import { Type } from '@sinclair/typebox';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Operation from '../Operation.js';

//TODO position/gravity option and background option
const resizeSchema = Type.Object({
    width: Type.Optional(Type.Number()),
    height: Type.Optional(Type.Number()),
    fit:  Type.Optional(
        Type.Union([
            Type.Literal('cover'),
            Type.Literal('contain'),
            Type.Literal('fill'),
            Type.Literal('inside'),
            Type.Literal('outside')
        ], {
            default: 'fill'
        })
    )
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
                // ? in v1 I set the default to 'fill', but I may make sense to change it to sharp.js' default.
                image.sharp.resize(data.width ?? null, data.height ?? null, { fit: data.fit ?? 'fill' });
                return image;
            }

        });
    }
}
