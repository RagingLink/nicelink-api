import { Canvas, registerFont } from 'canvas';
import { DefaultOptions, InputOptions } from '../types/PayloadTypes.js';

/**
 * Convert text to PNG image.
 * @param _text
 * @param [options]
 * @param [options.font="30px sans-serif"] css style font
 * @param [options.textAlign="left"] text alignment (left, center, right)
 * @param [options.color="black"] (or options.textColor) text color
 * @param [options.backgroundColor] (or options.bgColor) background color
 * @param [options.lineSpacing=0]
 * @param [options.maxWidth=undefined]
 * @param [options.strokeWidth=0]
 * @param [options.strokeColor='white']
 * @param [options.padding=0] width of the padding area (left, top, right, bottom)
 * @param [options.paddingLeft]
 * @param [options.paddingTop]
 * @param [options.paddingRight]
 * @param [options.paddingBottom]
 * @param [options.borderWidth=0] width of border (left, top, right, bottom)
 * @param [options.borderLeftWidth=0]
 * @param [options.borderTopWidth=0]
 * @param [options.borderRightWidth=0]
 * @param [options.borderBottomWidth=0]
 * @param [options.borderColor="black"] border color
 * @param [options.localFontPath] path to local font (e.g. fonts/Lobster-Regular.ttf)
 * @param [options.localFontName] name of local font (e.g. Lobster)
 * @param [options.output="buffer"] 'buffer', 'stream', 'dataURL', 'canvas's
 * @returns {string} png image buffer
 */
const text2png = (text : string, options : InputOptions = {}): Buffer => {
    //  Options
    const parsedOptions = parseOptions(options);
    //  Register a custom font
    if (parsedOptions.localFontPath !== undefined && parsedOptions.localFontName !== undefined) {
        registerFont(parsedOptions.localFontPath, { family: parsedOptions.localFontName });
    }

    const canvas = new Canvas(100, 100, 'image');
    const ctx = canvas.getContext('2d');

    const max = {
        left: 0,
        right: 0,
        ascent: 0,
        descent: 0
    };

    let lastDescent = 0;
    const lineProps = text.split('\n').map(line => {
        ctx.font = parsedOptions.font;
        const metrics = ctx.measureText(line);

        const left = -1 * metrics.actualBoundingBoxLeft;
        const right = metrics.actualBoundingBoxRight;
        const ascent = metrics.actualBoundingBoxAscent;
        const descent = metrics.actualBoundingBoxDescent;

        max.left = Math.max(max.left, left);
        max.right = Math.max(max.right, right);
        max.ascent = Math.max(max.ascent, ascent);
        max.descent = Math.max(max.descent, descent);
        lastDescent = descent;

        return { line, left, right, ascent, descent };
    });

    const lineHeight = max.ascent + max.descent + parsedOptions.lineSpacing;

    const contentWidth = max.left + max.right;
    const contentHeight =
        lineHeight * lineProps.length -
        parsedOptions.lineSpacing -
        (max.descent - lastDescent);

    canvas.width =
        contentWidth +
        parsedOptions.borderLeftWidth +
        parsedOptions.borderRightWidth +
        parsedOptions.paddingLeft +
        parsedOptions.paddingRight;

    canvas.height =
        contentHeight +
        parsedOptions.borderTopWidth +
        parsedOptions.borderBottomWidth +
        parsedOptions.paddingTop +
        parsedOptions.paddingBottom;

    const hasBorder =
        parsedOptions.borderLeftWidth !== 0 ||
        parsedOptions.borderTopWidth !== 0 ||
        parsedOptions.borderRightWidth !== 0 ||
        parsedOptions.borderBottomWidth !== 0;

    if (hasBorder) {
        ctx.fillStyle = parsedOptions.borderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (parsedOptions.backgroundColor !== undefined) {
        ctx.fillStyle = parsedOptions.backgroundColor;
        ctx.fillRect(
            parsedOptions.borderLeftWidth,
            parsedOptions.borderTopWidth,
            canvas.width - (parsedOptions.borderLeftWidth + parsedOptions.borderRightWidth),
            canvas.height - (parsedOptions.borderTopWidth + parsedOptions.borderBottomWidth)
        );
    } else if (hasBorder) {
        ctx.clearRect(
            parsedOptions.borderLeftWidth,
            parsedOptions.borderTopWidth,
            canvas.width - (parsedOptions.borderLeftWidth + parsedOptions.borderRightWidth),
            canvas.height - (parsedOptions.borderTopWidth + parsedOptions.borderBottomWidth)
        );
    }

    ctx.font = parsedOptions.font;
    ctx.fillStyle = parsedOptions.textColor;
    ctx.antialias = 'gray';
    ctx.textAlign = parsedOptions.textAlign;
    ctx.lineWidth = parsedOptions.strokeWidth;
    ctx.strokeStyle = parsedOptions.strokeColor;

    let offsetY = parsedOptions.borderTopWidth + parsedOptions.paddingTop;
    lineProps.forEach(lineProp => {
        // Calculate Y
        let x = 0;
        const y = max.ascent + offsetY;

        // Calculate X
        switch (parsedOptions.textAlign) {
            case 'left':
                x = lineProp.left + parsedOptions.borderLeftWidth + parsedOptions.paddingLeft;
                break;

            case 'right':
                x =
              canvas.width -
              lineProp.left -
              parsedOptions.borderRightWidth -
              parsedOptions.paddingRight;
                break;

            case 'center':
                x = contentWidth / 2 + parsedOptions.borderLeftWidth + parsedOptions.paddingLeft;
                break;
        }


        if (parsedOptions.strokeWidth > 0 ) {
            ctx.strokeText(lineProp.line, x, y);
        }

        ctx.fillText(lineProp.line, x, y);

        offsetY += lineHeight;
    });

    return canvas.toBuffer();
};

function parseOptions(options: InputOptions): DefaultOptions {
    return {
        font: options.font ?? '30px sans-serif',
        textAlign: options.textAlign ?? 'left',
        textColor: options.textColor ?? options.color ?? 'black',
        backgroundColor: options.bgColor ?? options.backgroundColor,
        lineSpacing: options.lineSpacing ?? 0,
        maxWidth: options.maxWidth ?? undefined,
        strokeWidth: options.strokeWidth ?? 0,
        strokeColor: options.strokeColor ?? 'white',

        paddingLeft: options.paddingLeft ?? options.padding ?? 0,
        paddingTop: options.paddingTop ?? options.padding ?? 0,
        paddingRight: options.paddingRight ?? options.padding ?? 0,
        paddingBottom: options.paddingBottom ?? options.padding ?? 0,

        borderLeftWidth: options.borderLeftWidth ?? options.borderWidth ?? 0,
        borderTopWidth: options.borderTopWidth ?? options.borderWidth ?? 0,
        borderBottomWidth: options.borderBottomWidth ?? options.borderWidth ?? 0,
        borderRightWidth: options.borderRightWidth ?? options.borderWidth ?? 0,
        borderColor: options.borderColor ?? 'black',

        localFontName: options.localFontName,
        localFontPath: options.localFontPath,

        output: options.output ?? 'buffer'
    };
}

export default text2png;
