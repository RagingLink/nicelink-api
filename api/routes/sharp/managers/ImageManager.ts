import { PrismaClient } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { NiceLogger } from '../../../Logger.js';
import { InputBody } from '../../../types/PayloadTypes.js';
import { guard } from '../../../utils/guard/index.js';
import Prisma from '../Prisma.js';
import CacheManager from './CacheManager.js';
import Image from './Image.js';
import { ImageEditor } from './ImageEditor.js';

export class ImageManager {
    private readonly cache: CacheManager<{ buffer: Buffer; }>;
    //private readonly cache: CachedImages = {};
    private readonly awaitingSharpBuffer: {
        [index: string]: Promise<void>;
    } = {};
    private readonly prisma: PrismaClient;
    private readonly storedImagesPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', 'images', 'stored');
    public constructor(public readonly editor: ImageEditor, public readonly logger: NiceLogger) {
        this.prisma = new Prisma(logger).client;
        this.cache = new CacheManager({refresh: 6, hours: 48});
        this.startImageSweep();
    }

    public async cacheImage(buffer: Buffer): Promise<string> {
        const fileType = await fileTypeFromBuffer(buffer);
        const fileName = uuidv4() + '.' + (fileType?.ext ?? 'png');
        this.cache.set(fileName, { buffer });

        return fileName;
    }
    public async saveImage(image: Image, body?: InputBody, persist = false): Promise<string> {
        let fileType: string;
        if (image.edited) {
            fileType = (await image.sharp.metadata()).format ?? 'png';
        } else {
            fileType = (await fileTypeFromBuffer(image.buffer))?.ext ?? 'png';
        }
        const fileName = uuidv4() + '.' + fileType;
        if (image.edited) {
            this.awaitingSharpBuffer[fileName] = image.sharp.toBuffer().then((buffer) => {
                this.cache.set(fileName, { buffer });

                delete this.awaitingSharpBuffer[fileName];
                this.writeFile(buffer, fileName);
            });
        } else {
            this.cache.set(fileName, { buffer: image.buffer });
            this.writeFile(image.buffer, fileName);
        }
        if (body !== undefined)
            this.saveImageToDB(fileName, body, persist).catch(err => {
                this.logger.log('error', 'ImageManager', err);
            });
        return fileName;
    }
    public async saveImageToDB(fileName: string, body?: InputBody, persist = false): Promise<void> {
        const cache_duration = body?.cacheDuration ?? 7;
        await this.prisma.image.create({
            data: {
                id: fileName,
                body: JSON.stringify(body),
                created_at: new Date(),
                last_accessed: new Date(),
                cache_duration: cache_duration <= 30 ? cache_duration : 30,
                persisted: persist
            }
        });
    }
    public async saveBuffer(buffer: Buffer): Promise<string> {
        const fileType = await fileTypeFromBuffer(buffer);
        const fileName = uuidv4() + '.' + (fileType?.ext ?? 'png');
        this.cache.set(fileName, { buffer });
        this.writeFile(buffer, fileName);
        return fileName;
    }
    public hasFile(fileName: string): boolean {
        return fs.existsSync(path.join(this.storedImagesPath, fileName));
    }
    public hasLegacyFile(fileName: string): boolean {
        return fs.existsSync(path.join(this.storedImagesPath, '..', 'images', 'legacy', fileName));
    }
    public writeFile(buffer: Buffer, fileName: string): void {
        fs.writeFile(path.join(this.storedImagesPath, fileName), buffer, (err) => {
            if (err !== null)
                return this.logger.log('error', 'ImageManager', err);
        });
    }
    public deleteFile(fileName: string): void {
        fs.rmSync(path.join(this.storedImagesPath, fileName));
    }
    public async getImage(fileName: string): Promise<Buffer | void> {
        if (guard.hasProperty(this.awaitingSharpBuffer, fileName))
            await this.awaitingSharpBuffer[fileName];
        const cachedObj = this.cache.get(fileName);
        if (cachedObj !== undefined) {
            this.updateLastAccessed(fileName);
            return cachedObj.buffer;
        } else if (this.hasFile(fileName)) {
            this.updateLastAccessed(fileName);
            this.cache.set(fileName, { buffer: fs.readFileSync(path.join(this.storedImagesPath, fileName)) });

            return this.cache.get(fileName)?.buffer;
        } else if (this.hasLegacyFile(fileName)) {
            return fs.readFileSync(path.join(this.storedImagesPath, '..', 'images', 'legacy', fileName));
        }
        try {
            const image = await this.prisma.image.findUnique({
                where: {
                    id: fileName
                }
            });
            if (image !== null) {
                const body = JSON.parse(image.body) as JObject;
                const output = await this.editor.generateImage(body);
                const buffer = output.image.edited ? await output.image.sharp.toBuffer() : output.image.buffer;
                this.cache.set(fileName, { buffer });
                this.writeFile(buffer, fileName);
                this.updateLastAccessed(fileName);
                return buffer;
            }
        } catch (e: unknown) {
            this.logger.log('error', 'ImageManager', e);
        }

    }
    public updateLastAccessed(fileName: string): void {
        this.prisma.image.findUnique({
            where: {
                id: fileName
            }
        }).then(image => {
            if (image === null)
                this.saveImageToDB(fileName).then(() => {
                    this.logger.log('db', 'Prisma', 'Saved (legacy) image to DB');
                }).catch(err => {
                    this.logger.log('db', 'Prisma', err);
                });
            else
                void this.prisma.image.update({
                    where: {
                        id: fileName
                    }, data: {
                        last_accessed: new Date()
                    }
                });
        }).catch(() => {
            this.logger.log('error', 'Prisma', `Failed to update last accessed for "${fileName}"`);
        });
        this.cache.refreshTimestamp(fileName);
    }
    private startImageSweep(): void {
        setInterval(() => void this.sweepImages(), 24 * 3600 * 1000);
        // Do an image sweep 1 minute after starting
        setTimeout(() => void this.sweepImages(), 60 * 1000);
    }

    private async sweepImages(): Promise<void> {
        const deletedCount = {
            fs: await this.sweepFsImages(),
            pg: await this.sweepPgImages()
        };
        const result: string[] = [];
        if (deletedCount.fs > 0)
            result.push(`eleted ${deletedCount.fs} images from FS`);
        if (deletedCount.pg > 0)
            result.push(`eleted ${deletedCount.pg} images from PG`);
        if (result.length > 0)
            this.logger.log('db', 'Prisma', 'D' + result.join(' and d'));

        this.prisma.image.count().then(prismaCount => {
            fs.readdir(this.storedImagesPath, undefined, (_, files) => {
                this.logger.log('db', 'Prisma', `Currently storing ${files.length} images on disk and ${prismaCount} in Prisma`);
            });
        }).catch(err => this.logger.log('error', 'ImageManager', err));
    }

    private async sweepFsImages(): Promise<number> {
        let deletedN = 0;
        const expiredImages = (await this.prisma.image.findMany({
            where: {
                last_accessed: {
                    lte: new Date(Date.now() - 24 * 3600 * 1000)
                },
                persisted: {
                    not: true
                }
            }
        })).filter(image => {
            return Date.now() > image.last_accessed.getMilliseconds() + image.cache_duration * 24 * 3600 * 1000;
        });
        for (const image of expiredImages) {
            try {
                if (!this.hasFile(image.id))
                    continue;
                this.deleteFile(image.id);
                deletedN++;
            } catch (e: unknown) {
                this.logger.log('error', 'ImageManager', e);
            }
        }
        return deletedN;
    }

    private async sweepPgImages(): Promise<number> {
        const deletedN = 0;
        const expiredPgImages = (await this.prisma.image.findMany({
            where: {
                last_accessed: {
                    lte: new Date(Date.now() - 90 * 24 * 3600 * 1000)
                },
                persisted: {
                    not: true
                }
            }
        })).filter(image => {
            return Date.now() > image.last_accessed.getMilliseconds() + image.cache_duration * 24 * 3600 * 1000 + 90 * 86400 * 1000;
        });

        for (const image of expiredPgImages) {
            try {
                await this.prisma.image.delete({ where: { id: image.id } });
            } catch (e: unknown) {
                this.logger.log('error', 'ImageManager', e);
            }
        }
        return deletedN;
    }
}
