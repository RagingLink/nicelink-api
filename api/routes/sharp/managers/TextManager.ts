import can, { Canvas, CanvasRenderingContext2D, TextMetrics } from 'canvas';
import chalk from 'chalk';
import fs from 'fs';
import { parse } from 'pb-text-format-to-json';
import { fileURLToPath } from 'url';

import { NiceLogger } from '../../../Logger.js';
import { DefaultOptions, InputOptions } from '../../../types/PayloadTypes.js';
import { isErrnoException } from '../../../utils/index.js';
import Timer from './Timer.js';

interface Font {
    name: string;
    path: string;
    family: string;
    registered?: true;
}
interface FontResponseData {
    loaded: string[];
    missingMeta: string[];
    errors: number;
}
interface Max {
    left: number;
    right: number;
    ascent: number;
    descent: number;
}
interface LineProp extends Max {
    line: string;
}
export default class TextManager {
    private readonly fonts: Map<string, Font>;
    private readonly FONTS_ASSETS_DIR = fileURLToPath(new URL('.', import.meta.url)) + '../../../assets/fonts/';

    public constructor(public readonly logger: NiceLogger) {
        this.fonts = new Map();
        const fontTimer = new Timer();
        this.loadFonts().then(responseData => {
            const result: unknown[] = ['Loaded', responseData.loaded.length, 'fonts.'];
            if (responseData.missingMeta.length > 0)
                result.push(responseData.missingMeta.length, chalk.yellow('fonts don\'t have METADATA.pb'));
            this.logger.log('info', 'TextManager', ...result, fontTimer.elapsedBlueStr);
            if (responseData.errors > 0)
                this.logger.log('error', 'TextManager', `Encountered ${responseData.errors} errors while loading fonts`);
        }).catch(err => {
            this.logger.log('error', 'LoadFonts', err);
        });
    }
    public text2png(text: string, inputOptions: InputOptions = {}): Buffer {
        //  Options
        const options = this.parseOptions(inputOptions);
        //  Register a custom font

        const font = this.getCanvasFont(options);
        const canvas = new Canvas(100, 100, 'image');
        const ctx = canvas.getContext('2d');

        const max = {
            left: 0,
            right: 0,
            ascent: 0,
            descent: 0
        };
        const lines = [...this.getLines(ctx, text, font, max, options.maxWidth)];

        this.setCanvasWidth(canvas, options, lines, max);

        this.applyBorder(canvas, ctx, options);
        this.applyBackgroundColour(canvas, ctx, options);
        this.applyTextStyles(ctx, options, font);

        const lineHeight = max.ascent + max.descent + options.lineSpacing;
        let offsetY = options.borderTopWidth + options.paddingTop;
        for (const lineProp of lines) {
            let x = 0;
            const y = max.ascent + offsetY;

            // Calculate X
            switch (options.textAlign) {
                case 'left':
                    x = lineProp.left + options.borderLeftWidth + options.paddingLeft;
                    break;

                case 'right':
                    x =
                        canvas.width -
                        lineProp.left -
                        options.borderRightWidth -
                        options.paddingRight;
                    break;

                case 'center':
                    x = (max.left + max.right) / 2 + options.borderLeftWidth + options.paddingLeft;
                    break;
            }

            if (options.strokeWidth > 0) {
                ctx.strokeText(lineProp.line, x, y);
            }

            ctx.fillText(lineProp.line, x, y);

            offsetY += lineHeight;
        }
        return canvas.toBuffer();
    }
    private parseOptions(options: InputOptions): DefaultOptions {
        return {
            font: options.font ?? 'sans-serif',
            size: options.size ?? '30px',
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
    private getCanvasFont(parsedOptions: DefaultOptions): string {
        if (parsedOptions.font !== 'sans-serif') {
            const font = this.fonts.get(parsedOptions.font);
            if (font === undefined)
                parsedOptions.font = 'sans-serif';
            else if (font.registered !== true) {
                can.registerFont(font.path, { family: font.name });
                this.fonts.set(font.name, { ...font, registered: true });
            }
        }
        return `${parsedOptions.size} "${parsedOptions.font}"`;
    }
    private *getLines(ctx: CanvasRenderingContext2D, text: string, font: string, max: Max, maxWidth?: number): IterableIterator<LineProp> {
        const lines = text.split('\n');
        for (const line of lines) {
            if (maxWidth !== undefined) {
                ctx.font = font;
                let str = '';
                for (const char of line) {
                    const metrics = ctx.measureText(str + char);
                    if (metrics.width <= maxWidth) {
                        str += char;
                    } else {
                        yield {
                            line: str,
                            ...this.getBoundingSize(metrics, max)
                        };
                        str = char;
                    }
                }
                if (str !== '') {
                    const metrics = ctx.measureText(str);
                    yield {
                        line: str,
                        ...this.getBoundingSize(metrics, max)
                    };
                }
            } else {
                const metrics = ctx.measureText(line);
                yield {
                    line,
                    ...this.getBoundingSize(metrics, max)
                };
            }
        }
    }
    private getBoundingSize(metrics: TextMetrics, max: Max): Max {
        const boundingSize = {
            left: -1 * metrics.actualBoundingBoxLeft,
            right: metrics.actualBoundingBoxRight,
            ascent: metrics.actualBoundingBoxAscent,
            descent: metrics.actualBoundingBoxDescent
        };
        this.updateMaxBounding(boundingSize, max);
        return boundingSize;
    }
    private updateMaxBounding(currentBounding: Max, max: Max): void {
        max.left = Math.max(max.left, currentBounding.left);
        max.right = Math.max(max.right, currentBounding.right);
        max.ascent = Math.max(max.ascent, currentBounding.ascent);
        max.descent = Math.max(max.descent, currentBounding.descent);
    }
    private setCanvasWidth(canvas: Canvas, options: DefaultOptions, lines: LineProp[], max: Max): void {
        const lineHeight = max.ascent + max.descent + options.lineSpacing;
        const contentWidth = max.left + max.right;
        const contentHeight =
            lineHeight * lines.length -
            options.lineSpacing -
            (max.descent - lines[lines.length - 1].descent);

        canvas.width =
            contentWidth +
            options.borderLeftWidth +
            options.borderRightWidth +
            options.paddingLeft +
            options.paddingRight;

        canvas.height =
            contentHeight +
            options.borderTopWidth +
            options.borderBottomWidth +
            options.paddingTop +
            options.paddingBottom;
    }
    private applyBorder(canvas: Canvas, ctx: CanvasRenderingContext2D, options: DefaultOptions): void {
        const hasBorder =
            options.borderLeftWidth !== 0 ||
            options.borderTopWidth !== 0 ||
            options.borderRightWidth !== 0 ||
            options.borderBottomWidth !== 0;

        if (hasBorder) {
            ctx.fillStyle = options.borderColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (options.backgroundColor === undefined) {
                ctx.clearRect(
                    options.borderLeftWidth,
                    options.borderTopWidth,
                    canvas.width - (options.borderLeftWidth + options.borderRightWidth),
                    canvas.height - (options.borderTopWidth + options.borderBottomWidth)
                );
            }
        }
    }
    private applyBackgroundColour(canvas: Canvas, ctx: CanvasRenderingContext2D, options: DefaultOptions): void {
        if (options.backgroundColor !== undefined) {
            ctx.fillStyle = options.backgroundColor;
            ctx.fillRect(
                options.borderLeftWidth,
                options.borderTopWidth,
                canvas.width - (options.borderLeftWidth + options.borderRightWidth),
                canvas.height - (options.borderTopWidth + options.borderBottomWidth)
            );
        }
    }
    private applyTextStyles(ctx: CanvasRenderingContext2D, options: DefaultOptions, font: string): void {
        ctx.font = font;
        ctx.fillStyle = options.textColor;
        ctx.antialias = 'gray';
        ctx.textAlign = options.textAlign;
        ctx.lineWidth = options.strokeWidth;
        ctx.strokeStyle = options.strokeColor;
    }
    //* Font loading
    private async loadFonts(): Promise<FontResponseData> {
        const customRes = await this.loadFontsInDir('custom/');
        const oflRes = await this.loadFontsInDir('google/ofl/');
        const uflRes = await this.loadFontsInDir('google/ufl/');
        return {
            loaded: customRes.loaded.concat(oflRes.loaded, uflRes.loaded),
            missingMeta: customRes.missingMeta.concat(oflRes.missingMeta, uflRes.loaded),
            errors: customRes.errors + oflRes.errors + uflRes.errors
        };
    }
    private async loadFontsInDir(dir: string): Promise<FontResponseData> {
        const responseData: FontResponseData = {
            loaded: [],
            missingMeta: [],
            errors: 0
        };
        const fullDir = this.FONTS_ASSETS_DIR + dir;
        try {
            const fontDirs = await fs.promises.readdir(fullDir);
            for (const fontDir of fontDirs) {
                const stats = await fs.promises.stat(fullDir + fontDir);
                if (!stats.isDirectory())
                    continue;
                try {
                    const metaFile = await fs.promises.readFile(fullDir + fontDir + '/' + 'METADATA.pb', 'utf-8');
                    const parsedMeta = parse(metaFile);
                    if ('error' in parsedMeta) { //TODO More info with regards to error
                        responseData.errors += 1;
                        continue;
                    }
                    const fonts = this.validateMetadata(parsedMeta);
                    for (const font of fonts) {
                        this.fonts.set(font.name, {
                            name: font.name,
                            path: fullDir + fontDir + '/' + font.file,
                            family: font.family
                        });
                        responseData.loaded.push(font.name);
                    }
                } catch (err: unknown) {
                    if (isErrnoException(err)) {
                        if (err.code === 'ENOENT')
                            responseData.missingMeta.push(dir + fontDir);
                    }
                }
            }
            return responseData;
        } catch (err: unknown) {
            this.logger.log('error', 'LoadFonts', err);
            responseData.errors += 1;
            return responseData;
        }
    }
    private validateMetadata(input: JObject): Array<{ name: string; file: string; family: string; }> {
        const fonts = [];
        if ('name' in input && typeof input.name === 'string' && 'fonts' in input) {
            if (!Array.isArray(input.fonts))
                input.fonts = [input.fonts];

            if (Array.isArray(input.fonts)) {
                for (const font of input.fonts) {
                    if (typeof font !== 'object' || font === null)
                        continue;

                    if ('filename' in font && 'full_name' in font)
                        if (typeof font.filename === 'string' && typeof font.full_name === 'string')
                            fonts.push({
                                name: font.full_name,
                                file: font.filename,
                                family: input.name
                            });
                }
            }
        }
        return fonts;
    }
    public get availableFontFamilies(): Record<string, string[]> {
        const familyMappedObj = [...this.fonts.values()].reduce((a: Record<string, string[]>, font) => {
            if (font.family in a) {
                a[font.family].push(font.name);
            } else {
                a[font.family] = [font.name];
            }
            return a;
        }, {});
        return familyMappedObj;
    }
}
