import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

const alignmentSchema = Type.Union([
    Type.Literal('top-left'),
    Type.Literal('top-middle'),
    Type.Literal('top-right'),
    Type.Literal('left'),
    Type.Literal('center'),
    Type.Literal('right'),
    Type.Literal('bot-left'),
    Type.Literal('bot-middle'),
    Type.Literal('bot-right')
]);

const textSchema = Type.Partial(Type.Object({
    text: Type.String(),
    size: Type.String(),
    font: Type.String(),
    textAlign: Type.Union([Type.Literal('left'), Type.Literal('center'), Type.Literal('right')]),
    x: Type.Number(),
    y: Type.Number(),
    alignment: alignmentSchema,
    color: Type.String(),
    textColor: Type.String(),
    backgroundColor: Type.String(),
    bgColor: Type.String(),
    lineSpacing: Type.Number(),
    maxWidth: Type.Number(),
    strokeWidth: Type.Number(),
    strokeColor: Type.String(),
    padding: Type.Number(),
    paddingLeft: Type.Number(),
    paddingRight: Type.Number(),
    paddingTop: Type.Number(),
    paddingBottom: Type.Number(),
    borderWidth: Type.Number(),
    borderLeftWidth: Type.Number(),
    borderRightWidth: Type.Number(),
    borderBottomWidth: Type.Number(),
    borderTopWidth: Type.Number(),
    borderColor: Type.String(),
    localFontPath: Type.String(),
    localFontName: Type.String(),
    output: Type.Union([Type.Literal('buffer'), Type.Literal('stream'), Type.Literal('dataURL'), Type.Literal('canvas')])
}));

export const bodyWithoutChild = Type.Partial(Type.Object({
    cacheDuration: Type.Number(),
    background: Type.String(),
    width: Type.Number(),
    height: Type.Number(),
    opacity: Type.Number(),
    rotate: Type.Number(),
    flip: Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3)]),
    shape: Type.Union([Type.Literal('circle')]),
    replaceColor: Type.Object({
        target: Type.String(),
        replace: Type.String(),
        delta: Type.Optional(Type.Number())
    }),
    crop: Type.Union([
        Type.Literal('auto'),
        Type.Partial(Type.Object({
            width: Type.Number(),
            height: Type.Number(),
            x: Type.Number(),
            y: Type.Number()
        }))]),
    resize: Type.Partial(Type.Object({
        width: Type.Number(),
        height: Type.Number()
    })),
    text: Type.Union([Type.Array(textSchema), textSchema])
}));

const childSchema = Type.Partial(Type.Object({
    ...bodyWithoutChild.properties,
    size: Type.Union([Type.Literal('contain')]),
    mask: Type.Boolean(),
    x: Type.Number(),
    y: Type.Number(),
    alignment: alignmentSchema,
    blendMode: Type.String()
}));

export const BodySchema = Type.Partial(Type.Object({
    ...bodyWithoutChild.properties,
    images: Type.Array(childSchema)
}));

export type BodyType = Static<typeof BodySchema>;

export const BodyTypeCheck = TypeCompiler.Compile(BodySchema);

export type TextType = Static<typeof textSchema>;
export type ChildType = Static<typeof childSchema>;
