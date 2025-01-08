import { Type } from '@sinclair/typebox';

import Operation from '../Operation.js';
import NumberResolver, { DynamicNumber } from '../services/NumberResolver.js';
import { ImageEditor } from '../services/ImageEditor.js';

//TODO position/gravity option and background option
const resizeSchema = Type.Object({
    width: Type.Optional(DynamicNumber),
    height: Type.Optional(DynamicNumber),
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
    private resolver: NumberResolver;

    public constructor(editor: ImageEditor) {
        super(editor, {
            name: 'resize',
            dataPropertyAliases: {
                w: 'width',
                h: 'height'
            },
            schema: resizeSchema,
            execute: (image, data, meta) => {
                const [targetWidth, targetHeight] = this.resolver.eval(image, data.width, data.height);
                meta.changeData({
                    width: targetWidth,
                    height: targetHeight
                });
                if (image.width === targetWidth && image.height === targetHeight)
                    return meta;
                // ? in v1 I set the default to 'fill', but I may make sense to change it to sharp.js' default.
                image.sharp.resize(targetWidth ?? null, targetHeight ?? null, { fit: data.fit ?? 'fill' });
                return meta;
            }
        });
        this.resolver = new NumberResolver(this.logger);
    }
}
