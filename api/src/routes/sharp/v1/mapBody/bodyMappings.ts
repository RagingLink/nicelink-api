import { mapping } from './mapping/index.js';

export const body = {
    cacheDuration: mapping.number.optional,
    background: mapping.string.optional,
    width: mapping.number.optional,
    height: mapping.number.optional,
    opacity: mapping.number.optional,
    rotate: mapping.number.optional,
    flip: mapping.in(1, 2, 3).optional,
    shape: mapping.choice(mapping.in('circle')).optional,
    replaceColor: mapping.object({
        target: mapping.string,
        replace: mapping.string,
        delta: mapping.number.optional
    }).optional
};
export const child = {
    size: mapping.choice(mapping.in('contain')).optional,
    mask: mapping.boolean.optional,
    x: mapping.number.optional,
    y: mapping.number.optional,
    alignment: mapping.choice(mapping.in('top-left', 'top-middle', 'top-right', 'left', 'center', 'right', 'bot-left', 'bot-middle', 'bot-right')).optional,
    blendMode: mapping.string.optional,
    ...body
};
const textBody = {
    text: mapping.string.optional,
    size: mapping.string.optional,
    font: mapping.string.optional,
    textAlign: mapping.in('left', 'center', 'right').optional,
    color: mapping.string.optional,
    textColor: mapping.string.optional,
    backgroundColor: mapping.string.optional,
    bgColor: mapping.string.optional,
    lineSpacing: mapping.number.optional,
    maxWidth: mapping.number.optional,
    strokeWidth: mapping.number.optional,
    strokeColor: mapping.string.optional,
    padding: mapping.number.optional,
    paddingLeft: mapping.number.optional,
    paddingRight: mapping.number.optional,
    paddingTop: mapping.number.optional,
    paddingBottom: mapping.number.optional,
    borderWidth: mapping.number.optional,
    borderLeftWidth: mapping.number.optional,
    borderRightWidth: mapping.number.optional,
    borderBottomWidth: mapping.number.optional,
    borderTopWidth: mapping.number.optional,
    borderColor: mapping.string.optional,
    localFontPath: mapping.string.optional,
    localFontName: mapping.string.optional,
    output: mapping.in('buffer', 'stream', 'dataURL', 'canvas').optional
};
export const text = {
    x: mapping.number.optional,
    y: mapping.number.optional,
    alignment: mapping.in('top-left', 'top-middle', 'top-right', 'left', 'center', 'right', 'bot-left', 'bot-middle', 'bot-right').optional,
    ...textBody
};
export const crop = {
    width: mapping.number.optional,
    height: mapping.number.optional,
    x: mapping.number.optional,
    y: mapping.number.optional
};
export const resize = {
    width: mapping.number.optional,
    height: mapping.number.optional
};
