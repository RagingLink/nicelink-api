export type TextOption = TextBody | TextBody[]
export type AlignmentModes = 'top-left' | 'top-middle' | 'top-right' |
'left' | 'center' | 'right' |
'bot-left' | 'bot-middle' | 'bot-right';
export interface ResizeOption {
    width?: number;
    height?: number;
}
export interface ReplaceColorBody {
    target: string;
    replace: string;
    delta?: number;
}
export interface TextBody extends InputOptions {
    text?: string;
    size?: number;
    x?: number;
    y?: number;
    alignment?: AlignmentModes;
}
export type CropModes = 'auto'
export type CropOption = CropModes | number | {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
}

export interface ChildBody extends InputBody {
    size?: 'contain';
    mask?: boolean;
    x?: number;
    y?: number;
    alignment?: AlignmentModes;
    blendMode?: 'srcOver' | 'dstOver' | 'multiply' | 'add' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'hardLight' | 'difference' | 'exclusion';
}
export interface InputBody {
    cacheDuration?: number;
    background?: string;
    width?: number;
    height?: number;
    resize?: ResizeOption;
    replaceColor?: ReplaceColorBody;
    text?: TextBody[];
    opacity?: number;
    rotate?: number;
    flip?: 1 | 2 | 3;
    shape?: 'circle';
    crop?: CropOption;
    images?: ChildBody[];
}

export interface InputOptions {
    font?: string;
    textAlign? : 'left' | 'center' | 'right';
    color?: string;
    textColor?: string;
    backgroundColor?: string;
    bgColor?: string;
    lineSpacing?: number;
    maxWidth?: number;
    strokeWidth?: number;
    strokeColor?: string;
    padding?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    borderWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderBottomWidth?: number;
    borderTopWidth?: number;
    borderColor?: string;
    localFontPath?: string;
    localFontName?: string;
    output?: 'buffer' | 'stream' | 'dataURL' | 'canvas';
}
/*
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

        borderLeftWidth: or(options.borderLeftWidth, options.borderWidth, 0),
        borderTopWidth: or(options.borderTopWidth, options.borderWidth, 0),
        borderBottomWidth: or(options.borderBottomWidth, options.borderWidth, 0),
        borderRightWidth: or(options.borderRightWidth, options.borderWidth, 0),
        borderColor: or(options.borderColor, 'black'),

        localFontName: or(options.localFontName),
        localFontPath: or(options.localFontPath),

        output: or(options.output, 'buffer')
*/
export interface DefaultOptions {
    font: string | '30px sans-serif';
    textAlign : 'left' | 'center' | 'right';
    textColor: string;
    backgroundColor?: string;
    lineSpacing: number | 0;
    maxWidth?: number;
    strokeWidth: number | 0;
    strokeColor: string | 'white';
    paddingLeft: number | 0;
    paddingRight: number | 0;
    paddingTop: number | 0;
    paddingBottom: number | 0;
    borderLeftWidth: number | 0;
    borderRightWidth: number | 0;
    borderBottomWidth: number | 0;
    borderTopWidth: number | 0;
    borderColor: string | 'black';
    localFontPath?: string;
    localFontName?: string;
    output: 'buffer' | 'stream' | 'dataURL' | 'canvas';
}
