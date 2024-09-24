import chalk from 'chalk';
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { Static } from '@sinclair/typebox';

import { PassThrough } from 'stream';

import { ImageEditor } from './managers/ImageEditor.js';
import { ImageManager } from './managers/ImageManager.js';
import TextManager from './managers/TextManager.js';
import { GetParamsSchema, GetResponseSchema } from './RouteSchemas.js';

import Timer from '../../../utils/Timer.js';
import { SharpDiscord } from '../SharpDiscord.js';
import API from '../../../api.js';
import { GenericRecord, GenericRecordType } from '../../../utils/typebox/index.js';
import { getMimeType } from '../../../utils/constants/MimeTypes.js';

export default class SharpRoute {
    public readonly logger: API['logger'];

    private readonly textManager: TextManager;
    private readonly imageEditor: ImageEditor;
    private readonly imageManager: ImageManager;
    private getRequestCount = 0;
    public readonly plugin: FastifyPluginAsync;

    public constructor(public readonly api: API) {
        this.logger = api.logger;
        this.textManager = new TextManager(this.logger);
        this.imageEditor = new ImageEditor(this.logger, this.textManager);
        this.imageManager = new ImageManager(this.imageEditor, this.logger);

        new SharpDiscord(this.logger, api.config);

        this.plugin = this.setupPlugin();

        setInterval(() => {
            if (this.getRequestCount === 0)
                return;
            this.logger.log.endpoint('GET', chalk.whiteBright('/sharp'), `${this.getRequestCount} request last hour`);
            this.getRequestCount = 0;
        }, 3600 * 1000);

        //* Endpoints

    }

    private setupPlugin(): FastifyPluginAsync {
        return async (fastify, _) => {
            fastify.get('*', () => {
                this.getRequestCount++;
            });
            fastify.post('*', (req, reply) => {
                const timer = new Timer();
                reply.then(() => {
                    this.logger.log.endpoint('POST', chalk.whiteBright('/sharp' + req.originalUrl.split('/').slice(-1)), timer.elapsedBlueStr);
                }, () => {
                    this.logger.log.endpoint('POST', chalk.whiteBright('/sharp' + req.originalUrl.split('/').slice(-1)), timer.elapsedBlueStr);
                });
            });
            fastify.get('/transparent.png', (_, reply) => {
                reply.type('png');
                reply.send(this.imageEditor);
            });
            fastify.get('/fonts', (_, reply) => {
                reply.type('json');
                return this.textManager.availableFontFamilies;
            });

            fastify.get
            <{ Params: Static<typeof GetParamsSchema>, Reply: Static<typeof GetResponseSchema> }>
            ('/:image', {
                schema: {
                    params: GetParamsSchema
                }
            }, (req, res) => this.getImage(req, res));

            fastify.post<{ Body: GenericRecordType }>('/', {
                schema: {
                    body: GenericRecord
                }
            }, (req, res) => {
                void this.imageEditor.generateImage(req.body).then((output) => {
                    res.type('json').send(JSON.stringify(output.meta, null, 2));
                });
            });

            //? Process multiple images and return an array of objects with errors, path, root etc.
            fastify.post('/multiple', (req, res) => void this.storeMultiple(req, res));

            //? Process a request and return an object with errors, path, root etc.
            fastify.post<{ Body: GenericRecordType }>('/store', {
                schema: {
                    body: GenericRecord
                }
            }, (req, res) => this.storeImage(req, res));

            //? Process a request and return an image or error object
            fastify.post<{ Body: GenericRecordType }>('/process', {
                schema: {
                    body: GenericRecord
                }
            }, (req, res) => this.processImage(req, res));
        };
    }

    // Get image from db
    private getImage(req: FastifyRequest<{ Params: Static<typeof GetParamsSchema> }>, reply: FastifyReply<{ Reply: Static<typeof GetResponseSchema> }>): void {
        try {
            void this.imageManager.getImage(req.params.image).then((buffer) => {
                if (buffer === undefined) {
                    reply.code(404).send(req.params.image + ' not found.');
                } else {
                    const paramExtension = req.params.image.split('.').slice(-1)[0];
                    const mimeType = getMimeType(paramExtension) ?? 'image/png';
                    // ? Maybe just infer the image type from the image itself???
                    reply.type(mimeType);
                    reply.code(200).send(buffer);
                }
            });
        } catch (e: unknown) {
            reply.code(500).send('An error occurred!');
            this.logger.log.error(e);
        }
    }

    // Store image
    private storeImage(req: FastifyRequest<{ Body: GenericRecordType }>, reply: FastifyReply): void {
        const permanent = 'persistKey' in req.body && req.body.persistKey === this.api.config.persistKey;

        void this.imageEditor.generateImage((req.body)).then((output) => {
            void this.imageManager.saveImage(output.image, output.body, permanent).then((fileName) => {
                const root = process.env.NODE_ENV !== 'dev' ? 'https://api.nicelink.xyz/sharp/' : 'http://localhost:' + (process.env.PORT ?? '') + '/sharp/';
                reply.type('json').send(JSON.stringify({
                    path: fileName,
                    root,
                    url: root + fileName,
                    ...output.meta
                }));
            });
        });
    }

    private async storeMultiple(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        if (!Array.isArray(req.body))
            return void reply.code(400).send(JSON.stringify({
                status: 400,
                message: 'Body is not an array'
            }));
        const outputs = await Promise.all(req.body.map(async (imageBody) => {
            if (typeof imageBody !== 'object' || Array.isArray(imageBody) || imageBody === null)
                return;
            const output = await this.imageEditor.generateImage(imageBody);
            const fileName = await this.imageManager.saveImage(output.image, output.body);
            return {
                path: fileName,
                ...output.meta
            };
        }));
        reply.type('json').send(outputs);
    }

    // Send image
    private async processImage(req: FastifyRequest<{ Body: GenericRecordType }>, reply: FastifyReply): Promise<FastifyReply> {
        const output = await this.imageEditor.generateImage(req.body);
        const mimeType = await output.image.getMimeType();
        reply.type(mimeType);
        // not sure if this even makes a performance difference
        if (output.image.edited) {
            const stream = new PassThrough();
            output.image.sharp.pipe(stream);
            return reply.send(stream);
        }
        return reply.send(output.image.buffer);
    }
}
