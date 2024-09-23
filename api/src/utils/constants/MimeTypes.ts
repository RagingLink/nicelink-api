// A lot of these are pretty random and not officially supported (at least I don't use them!!)
export const MIME_TYPES = {
    png: 'image/png',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    apng: 'image/apng',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    avif: 'image/avif',
    gif: 'image/gif'
} as const;

export type ImageFormatType = keyof typeof MIME_TYPES;
export type MimeType = typeof MIME_TYPES[ImageFormatType];

export function getMimeType(imgFormat: string): MimeType | undefined {
    if (imgFormat in MIME_TYPES)
        return MIME_TYPES[imgFormat as ImageFormatType];
    return;
}
