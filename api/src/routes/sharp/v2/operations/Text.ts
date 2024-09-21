// import sizeOf from 'buffer-image-size';
// import _ from 'lodash';
// import { Static, Type } from '@sinclair/typebox';

// import { AlignmentModes, InputOptions } from '../../../../types/PayloadTypes.js';
// import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
// import { mapping } from '../../../../utils/mapping/index.js';
// import Timer from '../../../../utils/Timer.js';
// import Image from '../Image.js';
// import Operation from '../Operation.js';
// import { TextManager } from '../services/TextManager.js';

// interface SizeObject {
//     width: number;
//     height: number;
// }
// interface Coords {
//     x: number;
//     y: number;
// }

// const optionsSchema = Type.Partial(Type.Object({
//     text: Type.String(),
//     size: Type.Number(),
//     font: Type.String(),
//     textAlign: Type.Union([Type.Literal('left'), Type.Literal('center'), Type.Literal('right')]),
//     color: Type.String(),
//     textColor: Type.String(),
//     backgroundColor: Type.String(),
//     lineSpacing: Type.Number(),
//     maxWidth: Type.Number(),
//     strokeWidth: Type.Number(),
//     strokeColor: Type.String(),
//     padding: Type.Number(),
//     paddingLeft: Type.Number(),
//     paddingRight: Type.Number(),
//     paddingTop:Type.Number(),
//     paddingBottom: Type.Number(),
//     borderWidth: Type.Number(),
//     borderLeftWidth:Type.Number(),
//     borderRightWidth: Type.Number(),
//     borderBottomWidth:Type.Number(),
//     borderTopWidth: Type.Number(),
//     borderColor: Type.String(),
//     localFontPath: Type.String(),
//     localFontName:Type.String(),
//     output: Type.Union([Type.Literal('buffer'), Type.Literal('stream'), Type.Literal('dataURL'), Type.Literal('canvas')])
// }));

// const textSchema = Type.Array(Type.Partial(Type.Object({
//     x: Type.Number(),
//     y: Type.Number(),
//     alignment: Type.Union([
//         Type.Literal('top-left'),
//         Type.Literal('top-middle'),
//         Type.Literal('top-right'),
//         Type.Literal('left'),
//         Type.Literal('center'),
//         Type.Literal('right'),
//         Type.Literal('bot-left'),
//         Type.Literal('bot-middle'),
//         Type.Literal('bot-right')
//     ]),
//     options: optionsSchema
// })));

// interface TextOperationData {
//     options: InputOptions;
//     x?: number;
//     y?: number;
//     alignment?: AlignmentModes;
// }

// interface CachedText {
//     input: InputOptions;
//     buffer: Buffer;
//     maxWidth: number;
//     width: number;
//     height: number;
//     fit?: ResizedToFitData;
// }

// interface ResizedToFitData {
//     buffer: Buffer;
//     maxWidth: number;
//     left: number;
//     top: number;
// }

// export default class Text extends Operation<typeof textSchema> {
//     private readonly manager: TextManager;
//     private readonly cache: Record<string, CachedText[]> = {};
//     public constructor(public readonly logger: DefaultLogger) {
//         super(logger, {
//             name: 'text',
//             schema: textSchema,
//             dataPropertyAliases: {
//                 'p': 'position',
//                 'pos': 'position',
//                 'o': 'options',
//                 'ops': 'options',
//                 'options[].color': 'textColor',
//                 'options[].bgColor': 'backgroundColor'
//             },
//             execute: (image, data) => this.addTextImages(image, data)
//         });
//         this.manager = new TextManager(logger);
//     }

//     private async addTextImages(image: Image, textObjects: Static<typeof textSchema>): Promise<Image> {
//         const textArray: { buffer: Buffer; data: TextOperationData; }[] = [];
//         for (const textObject of textObjects) {
//             const options = textObject.options ?? {};
//             const text = options.text ?? '';
//             const maxWidth = options.maxWidth ?? image.width;

//             this.logger.log.operation(options);

//             const textPngTimer = new Timer(true);
//             let textBuffer: Buffer | undefined;
//             if (text in this.cache) {
//                 for (const cachedText of this.cache[text]) {
//                     if (cachedText.maxWidth >= maxWidth && cachedText.width <= maxWidth) {
//                         if (_.isEqual(cachedText.input, options)) {
//                             textBuffer = cachedText.buffer;
//                             break;
//                         }
//                     }
//                 }
//             }
//             if (textBuffer === undefined) {
//                 textBuffer = this.manager.text2png(text, { ...options, maxWidth });
//                 if (!(text in this.cache))
//                     this.cache[text] = [];
//                 const { width, height } = sizeOf(textBuffer);

//                 this.cache[text].push({
//                     input: options,
//                     buffer: textBuffer,
//                     maxWidth,
//                     width,
//                     height
//                 });

//             }
//             this.logger.log.time('Text2Png', textPngTimer.elapsedBlueStr);
//             textArray.push({
//                 buffer: textBuffer,
//                 data: textObject
//             });

//         }
//         const compositeOptions = await Promise.all(textArray.map(async (text) => {
//             const overlayOption = {
//                 input: text.buffer,
//                 left: 0,
//                 top: 0
//             };
//             const { width, height } = sizeOf(text.buffer);
//             const alignCoords = this.getAlignCoords(image, { width, height }, text.data.alignment ?? 'top-left');
//             const coords = { x: text.data.x ?? 0, y: text.data.y ?? 0 };
//             const [leftOffset, topOffset] = [alignCoords.x + coords.x, alignCoords.y + coords.y];
//             const parentDimensions = { width: image.width, height: image.height };
//             const textDimensions = { width, height };

//             if (!this.canImageFit(parentDimensions, textDimensions)) {
//                 this.logger.log.operation('Text', 'Cannot fit');
//                 overlayOption.input = await this.fitImage(parentDimensions, new Image(this.logger, text.buffer, ''), coords, alignCoords).sharp.toBuffer();

//                 // If the offset is set outside the image, that region will be cropped out already so it shouldn't be offset.
//                 if (leftOffset > 0)
//                     overlayOption.left += leftOffset;
//                 if (topOffset > 0)
//                     overlayOption.top += topOffset;
//             } else {
//                 overlayOption.left = leftOffset;
//                 overlayOption.top = topOffset;
//             }
//             this.logger.log.operation(overlayOption);
//             return overlayOption;
//         }));

//         image.sharp.composite(compositeOptions);
//         return image;
//     }

//     private getAlignCoords(parentImage: Image, childSize: SizeObject, alignment: AlignmentModes): Coords {
//         const alignCoords = {
//             x: 0,
//             y: 0
//         };
//         switch (alignment) {
//             case 'top-left':
//                 break;
//             case 'top-middle':
//                 alignCoords.x = Math.round(parentImage.width / 2 - childSize.width / 2);
//                 break;
//             case 'top-right':
//                 alignCoords.x = parentImage.width - childSize.width;
//                 break;
//             case 'left':
//                 alignCoords.y = Math.round(parentImage.height / 2 - childSize.height / 2);
//                 break;
//             case 'center':
//                 alignCoords.x = Math.round(parentImage.width / 2 - childSize.width / 2);
//                 alignCoords.y = Math.round(parentImage.height / 2 - childSize.height / 2);
//                 break;
//             case 'right':
//                 alignCoords.x = parentImage.width - childSize.width;
//                 alignCoords.y = Math.round(parentImage.height / 2 - childSize.height / 2);
//                 break;
//             case 'bot-left':
//                 alignCoords.y = parentImage.height - childSize.height;
//                 break;
//             case 'bot-middle':
//                 alignCoords.x = Math.round(parentImage.width / 2 - childSize.width / 2);
//                 alignCoords.y = parentImage.height - childSize.height;
//                 break;
//             case 'bot-right':
//                 alignCoords.x = parentImage.width - childSize.width;
//                 alignCoords.y = parentImage.height - childSize.height;
//                 break;
//         }
//         return alignCoords;
//     }

//     //can fit without the child image being outside the parent in any way
//     private canImageFit(parentDimensions: SizeObject, childDimensions: SizeObject): boolean {
//         if (childDimensions.width > parentDimensions.width)
//             return false;
//         if (childDimensions.height > parentDimensions.height)
//             return false;
//         return true;
//     }

//     private fitImage(fitDimensions: SizeObject, image: Image, offset: Coords, alignOffset: Coords): Image {
//         const [left, top] = [alignOffset.x + offset.x, alignOffset.y + offset.y];
//         const cropRegion = {
//             width: image.width,
//             height: image.height,
//             left: 0,
//             top: 0
//         };
//         if (image.width > fitDimensions.width) {
//             cropRegion.width = Math.min(fitDimensions.width, image.width - Math.abs(left));
//             if (left < 0)
//                 cropRegion.left = -left;
//         }
//         if (image.height > fitDimensions.height) {
//             cropRegion.height = Math.min(fitDimensions.height, image.height - Math.abs(top));
//             if (top < 0)
//                 cropRegion.top = -top;
//         }
//         image.sharp.extract(cropRegion);
//         return image;
//     }
// }
