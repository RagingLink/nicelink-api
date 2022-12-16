import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { Logger } from '../../../utils/logging/Logger.js';
import { guard } from '../../../utils/guard/index.js';
import { InputBody } from '../../../types/PayloadTypes.js';
import { ImageEditor } from './ImageEditor.js';
import Prisma from '../Prisma.js';
import Image from './Image.js';
import { Image as PrismaImage } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

interface CachedImages {
    [index: string]: {
        buffer: Buffer;
        time: number;
    };
}
export class ImageManager {
    private readonly cache: CachedImages = {};
    private readonly awaitingSharpBuffer: {
        [index: string]: Promise<void>;
    } = {};
    private readonly prisma: PrismaClient;
    private readonly storedImagesPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', 'storedImages');
    public constructor(public readonly editor: ImageEditor, public readonly logger: Logger) {
        this.prisma = new Prisma(logger).client;
        this.prisma.image.count().then(prismaCount => {
            fs.readdir(this.storedImagesPath, undefined, (_, files) => {
                this.logger.db(`Currently storing ${files.length} images on disk and ${prismaCount} in Prisma`);
            })
        })
        this.startImageSweep()
    }

    public async cacheImage(buffer: Buffer): Promise<string> {
        const fileType = await fileTypeFromBuffer(buffer);
        const fileName = uuidv4() + '.' + (fileType?.ext ?? 'png');
        this.cache[fileName] = {
            buffer,
            time: Date.now()
        };
        return fileName;
    }
    public async saveImage(image: Image, body?: InputBody): Promise<string> {
        let fileType: string;
        if (image.edited) {
            fileType = (await image.sharp.metadata()).format ?? 'png';
        } else {
            fileType = (await fileTypeFromBuffer(image.buffer))?.ext ?? 'png';
        }
        const fileName = uuidv4() + '.' + fileType;
        if (image.edited) {
            this.awaitingSharpBuffer[fileName] = image.sharp.toBuffer().then((buffer) => {
                this.cache[fileName] = {
                    buffer,
                    time: Date.now()
                };
                delete this.awaitingSharpBuffer[fileName];
                this.writeFile(buffer, fileName);
            });
        } else {
            this.cache[fileName] = {
                buffer: image.buffer,
                time: Date.now()
            };
            this.writeFile(image.buffer, fileName);
        }
        if (body !== undefined)
            this.saveImageToDB(fileName, body);
        return fileName;
    }
    public async saveImageToDB(fileName: string, body?: InputBody): Promise<void> {
        const cache_duration = (body?.cacheDuration ?? 7);
        await this.prisma.image.create({data: {
            id: fileName,
            body: JSON.stringify(body),
            created_at: new Date(),
            last_accessed: new Date(),
            cache_duration: (cache_duration) <= 30 ? cache_duration : 30
        }});
        this.logger.db('Saved image to DB');
    }
    public async saveBuffer(buffer: Buffer): Promise<string> {
        const fileType = await fileTypeFromBuffer(buffer);
        const fileName = uuidv4() + '.' + (fileType?.ext ?? 'png');
        this.cache[fileName] = {
            buffer,
            time: Date.now()
        };
        this.writeFile(buffer, fileName);
        return fileName;
    }
    public hasFile(fileName: string): boolean {
        return fs.existsSync(path.join(this.storedImagesPath, fileName))
    }
    public writeFile(buffer: Buffer, fileName: string): void {
        fs.writeFile(path.join(this.storedImagesPath, fileName), buffer, (err) => {
            if (err !== null)
                this.logger.error(err);
        });
    }
    public deleteFile(fileName: string): void {
        fs.rmSync(path.join(this.storedImagesPath, fileName));
    }
    public async getImage(fileName: string): Promise<Buffer | void> {
        if (guard.hasProperty(this.awaitingSharpBuffer, fileName))
            await this.awaitingSharpBuffer[fileName];

        if (guard.hasProperty(this.cache, fileName)) {
            this.updateLastAccessed(fileName);
            return this.cache[fileName].buffer;
        } else if (this.hasFile(fileName)) {
            this.updateLastAccessed(fileName);
            this.cache[fileName] = {
                buffer: fs.readFileSync(path.join(this.storedImagesPath, fileName)),
                time: Date.now()
            };
            return this.cache[fileName].buffer;
        } else {
            try {
                const image = await this.prisma.image.findUnique({where: {
                    id: fileName
                }});
                if (image !== null) {
                    const body = JSON.parse(image.body) as JObject;
                    const output = (await this.editor.generateImage(body));
                    this.saveImage(output.image, body);
                    this.updateLastAccessed(fileName);
                    if (output.image.edited) {
                        return output.image.sharp.toBuffer();
                    } else {
                        return output.image.buffer;
                    }
                }
            } catch (e: unknown) { 
                this.logger.error(e);
            }
        }
    }
    public updateLastAccessed(fileName: string): void {
        try {
            this.prisma.image.findUnique({
                where: {
                    id: fileName
                }
            }).then(image => {
                if (image === null)
                    this.saveImageToDB(fileName)
                else
                    this.prisma.image.update({where: {
                        id: fileName
                    }, data: {
                        last_accessed: new Date()
                    }})
            })
            
        } catch (e: unknown) {
            this.logger.error(`Failed to update last accessed for "${fileName}"`);
        }
        if (fileName in this.cache)
            this.cache[fileName].time = Date.now();
    }
    public async startImageSweep() {
        setInterval(async () => {
            // Select images older than a day and filter out images that are still 'allowed' to be stored
            const oldImages = (await this.prisma.image.findMany({where: {last_accessed: {
                lte: new Date(Date.now() - 24 * 3600 *1000)
            }}})).filter(image => {
                return Date.now() > image.last_accessed.getMilliseconds() + image.cache_duration * 24 * 3600 * 1000;
            });
            // Soft removal
            this.sweepImages(oldImages)
            // Select images older than 90 days and filter out images that are still 'allowed' to be stored
            const veryOldImages = (await this.prisma.image.findMany({where: {last_accessed: {
                lte: new Date(Date.now() - 90 * 24 * 3600 *1000)
            }}})).filter(image => {
                return Date.now() > image.last_accessed.getMilliseconds() + (image.cache_duration * 24 * 3600 * 1000) + (90 * 86400 * 1000);
            });
            // Hard removal
            this.sweepImages(veryOldImages, true);
            if (oldImages.length + veryOldImages.length > 0)
                this.logger.db(`Sweeping ${oldImages.length} from filesystem and ${veryOldImages.length} from postgres`);
        }, 24 * 3600 * 1000);
    }
    public async sweepImages(images: PrismaImage[], fromDB = false) {        
        for (const image of images) {
            try {
                if (!fromDB) {
                    // Soft removal, only the file is removed.
                    if (!this.hasFile(image.id))
                        continue
                    this.deleteFile(image.id);
                } else {
                    this.prisma.image.delete({where: {id: image.id}});
                }
            } catch (e: unknown) {
                this.logger.error(`Failed to remove image from "${fromDB ? 'db' : 'fs'}"`);
            }
        }
    }
}
