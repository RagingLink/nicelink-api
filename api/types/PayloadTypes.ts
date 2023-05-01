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
    size?: string;
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
// Text types
export interface InputOptions {
    font?: string;
    size?: string;
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
export interface DefaultOptions {
    font: string | 'sans-serif';
    size: string | '30px';
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
