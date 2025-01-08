import { PrismaClient } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4 } from 'uuid';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Image from './Image.js';
import { ImageEditor } from './ImageEditor.js';

import CacheManager from '../../../../utils/CacheManager.js';
import Prisma from '../../Prisma.js';
import { GenericObjectType } from '../../../../utils/typebox/index.js';
import { BodyType } from '../mapBody/bodyMappings.js';
import API from '../../../../api.js';

export class ImageManager {
    private readonly cache: CacheManager<{ buffer: Buffer; }>;
    //private readonly cache: CachedImages = {};
    private readonly awaitingSharpBuffer: Record<string, Promise<void>> = {};

    private readonly prisma: PrismaClient;
    //TODO rework/think about the image path, this is kinda nuts
    #storedImagesPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..', '..', '..', 'data', 'images');
    #legacyImagesPath = path.join(this.#storedImagesPath, '..', 'legacyImages');

    public constructor(public readonly editor: ImageEditor, public readonly logger: API['logger']) {
        this.prisma = new Prisma(logger).client;
        this.cache = new CacheManager({ refresh: 6, hours: 48 });
        this.startImageSweep();
    }

    public async cacheImage(buffer: Buffer): Promise<string> {
        const fileType = await fileTypeFromBuffer(buffer);
        const fileName = uuidv4() + '.' + (fileType?.ext ?? 'png');
        this.cache.set(fileName, { buffer });

        return fileName;
    }

    public async saveImage(image: Image, body?: BodyType, persist = false): Promise<string | undefined> {
        try {
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
                    void this.writeFile(buffer, fileName);
                });
            } else {
                this.cache.set(fileName, { buffer: image.buffer });
                void this.writeFile(image.buffer, fileName);
            }
            if (body !== undefined)
                this.saveImageToDB(fileName, body, persist).catch((err) => {
                    this.logger.log.error('ImageManager', err);
                });
            return fileName;
        } catch (err: unknown) {
            this.logger.log.error('Error saving image:', err);
            return;
        }
    }

    public async saveImageToDB(fileName: string, body?: BodyType, persist = false): Promise<void> {
        try {
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
        } catch (err: unknown) {
            this.logger.log.error('Error saving image:', err);
        }
    }

    public async saveBuffer(buffer: Buffer): Promise<string | void> {
        try {
            const fileType = await fileTypeFromBuffer(buffer);
            const fileName = uuidv4() + '.' + (fileType?.ext ?? 'png');
            this.cache.set(fileName, { buffer });
            void this.writeFile(buffer, fileName);
            return fileName;
        } catch (err: unknown) {
            this.logger.log.error('Error saving image', err);
            return;
        }
    }

    public hasFile(fileName: string): boolean {
        return fs.existsSync(path.join(this.#storedImagesPath, fileName));
    }

    public hasLegacyFile(fileName: string): boolean {
        return fs.existsSync(path.join(this.#legacyImagesPath, fileName));
    }

    public async writeFile(buffer: Buffer, fileName: string): Promise<void> {
        try {
            await fs.promises.writeFile(path.join(this.#storedImagesPath, fileName), buffer);
        } catch (err) {
            this.logger.log.error('Error writing file:', err);
        }
    }

    public async deleteFile(fileName: string): Promise<void> {
        try {
            await fs.promises.rm(path.join(this.#storedImagesPath, fileName));
        } catch (err) {
            this.logger.log.error('Error deleting file:', err);
        }
    }

    public async getImage(fileName: string): Promise<Buffer | void> {
        try {
            if (fileName in this.awaitingSharpBuffer)
                await this.awaitingSharpBuffer[fileName];
            const cachedObj = this.cache.get(fileName);
            if (cachedObj !== undefined) {
                void this.updateLastAccessed(fileName);
                return cachedObj.buffer;
            } else if (this.hasFile(fileName)) {
                void this.updateLastAccessed(fileName);
                this.cache.set(fileName, { buffer: fs.readFileSync(path.join(this.#storedImagesPath, fileName)) });

                return this.cache.get(fileName)?.buffer;
            } else if (this.hasLegacyFile(fileName)) {
                return fs.readFileSync(path.join(this.#legacyImagesPath, fileName));
            }
            const image = await this.prisma.image.findUnique({
                where: {
                    id: fileName
                }
            });
            if (image !== null) {
                const body = JSON.parse(image.body) as GenericObjectType;
                const output = await this.editor.generateImage(body);
                const buffer = output.image.edited ? await output.image.sharp.toBuffer() : output.image.buffer;
                this.cache.set(fileName, { buffer });
                void this.writeFile(buffer, fileName);
                void this.updateLastAccessed(fileName);
                return buffer;
            }
        } catch (e: unknown) {
            this.logger.log.error('ImageManager', e);
        }

    }

    public async updateLastAccessed(fileName: string): Promise<void> {
        try {
            const image = await this.prisma.image.findUnique({
                where: {
                    id: fileName
                }
            });
            if (image === null) {
                this.saveImageToDB(fileName).then(() => {
                    this.logger.log.prisma('Saved (legacy) image to DB');
                }).catch((err) => {
                    this.logger.log.error(err);
                });
            } else {
                await this.prisma.image.update({
                    where: {
                        id: fileName
                    }, data: {
                        last_accessed: new Date()
                    }
                });
            }
            this.cache.refreshTimestamp(fileName);
        } catch (err) {
            this.logger.log.error(err);
        }
    }

    private startImageSweep(): void {
        setInterval(() => void this.sweepImages(), 24 * 3600 * 1000);
        // Do an image sweep 1 minute after starting
        setTimeout(() => void this.sweepImages(), 1 * 1000);
    }

    private async sweepImages(): Promise<void> {
        try {
            const deletedCount = {
                fs: await this.sweepFsImages(),
                pg: await this.sweepPgImages()
            };
            const result: string[] = [];
            if (deletedCount.fs > 0)
                result.push(`Deleted ${deletedCount.fs} images from FS`);
            if (deletedCount.pg > 0)
                result.push(`Deleted ${deletedCount.pg} images from PG`);
            if (result.length > 0)
                this.logger.log.prisma(result.join('\n'));

            const prismaCount = await this.prisma.image.count();
            const files = await fs.promises.readdir(this.#storedImagesPath).catch((err) => {
                this.logger.log.error(this.#storedImagesPath, err);
                return [];
            });
            this.logger.log.prisma(`Currently storing ${files.length} images on disk and ${prismaCount} in Prisma`);
        } catch (err) {
            this.logger.log.error('Error sweeping images', err);
        }
    }

    private async sweepFsImages(): Promise<number> {
        try {
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
            })).filter((image) => {
                return Date.now() > image.last_accessed.getMilliseconds() + image.cache_duration * 24 * 3600 * 1000;
            });
            for (const image of expiredImages) {
                try {
                    if (!this.hasFile(image.id))
                        continue;
                    void this.deleteFile(image.id);
                    deletedN++;
                } catch (e: unknown) {
                    this.logger.log.error('ImageManager', e);
                }
            }
            return deletedN;
        } catch (err) {
            this.logger.log.error('Error sweeping FS images:', err);
            return 0;
        }
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
        })).filter((image) => {
            return Date.now() > image.last_accessed.getMilliseconds() + image.cache_duration * 24 * 3600 * 1000 + 90 * 86400 * 1000;
        });

        for (const image of expiredPgImages) {
            try {
                await this.prisma.image.delete({ where: { id: image.id } });
            } catch (e: unknown) {
                this.logger.log.error('ImageManager', e);
            }
        }
        return deletedN;
    }
}
