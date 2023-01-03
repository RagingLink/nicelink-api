import Image from '../routes/sharp/managers/Image.js';
import { InputBody } from './PayloadTypes.js';

export interface MetaBody {
    children: MetaBody[];
    errors: string[];
    warnings: string[];
}

export type OutputBody = {
    image: Image;
    meta: MetaBody;
    body: InputBody;
}

export interface ImageOutput {
    errors: string[];
    warnings: string[];
    children: string[];
}
