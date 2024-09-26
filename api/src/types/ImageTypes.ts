import sharp from 'sharp';

import Image from '../routes/sharp/v1/managers/Image.js';
import { BodyType } from '../routes/sharp/v1/mapBody/bodyMappings.js';

export interface MetaBody {
    children: MetaBody[];
    errors: string[];
    warnings: string[];
}

export interface OutputBody {
    image: Image;
    meta: MetaBody;
    body: BodyType;
}

export interface ImageOutput {
    errors: string[];
    warnings: string[];
    children: string[];
}

export interface SharpBufferResponse { data: Buffer; info: sharp.OutputInfo; }
