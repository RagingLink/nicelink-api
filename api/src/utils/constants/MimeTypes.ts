// A lot of these are pretty random and not officially supported (at least I don't use them!!)
export const IMAGE_MIME_TYPES = {
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

export const MIME_TYPES = {
    ...IMAGE_MIME_TYPES,
    json: 'application/json'
};

export type ImageFormatType = keyof typeof IMAGE_MIME_TYPES;
export type ImageMimeType = typeof IMAGE_MIME_TYPES[ImageFormatType];

export function getImageMimeType(imgFormat: string): ImageMimeType | undefined {
    if (imgFormat in IMAGE_MIME_TYPES)
        return IMAGE_MIME_TYPES[imgFormat as ImageFormatType];
    return;
}
