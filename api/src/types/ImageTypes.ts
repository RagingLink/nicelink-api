import sharp from 'sharp';

import { InputBody } from './PayloadTypes.js';

import Image from '../routes/sharp/v1/managers/Image.js';

export interface MetaBody {
    children: MetaBody[];
    errors: string[];
    warnings: string[];
}

export interface OutputBody {
    image: Image;
    meta: MetaBody;
    body: InputBody;
}

export interface ImageOutput {
    errors: string[];
    warnings: string[];
    children: string[];
}

export interface SharpBufferResponse { data: Buffer; info: sharp.OutputInfo; }
