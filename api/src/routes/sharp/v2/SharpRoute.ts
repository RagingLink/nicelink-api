import { FastifyPluginAsync } from 'fastify';

import { PassThrough } from 'stream';

import ImageStore from './services/ImageStore.js';
import { ImageEditor } from './services/ImageEditor.js';
import ImageFetcher from './services/ImageFetcher.js';

import Timer from '../../../utils/Timer.js';
import { GenericRecord, GenericRecordType } from '../../../utils/typebox/index.js';
import API from '../../../api.js';

export default class SharpRoute {
    public readonly store: ImageStore;
    public readonly editor: ImageEditor;
    public readonly fetcher: ImageFetcher;
    public readonly logger: API['logger'];
    public readonly plugin: FastifyPluginAsync;

    public constructor(public readonly api: API) {
        this.logger = api.logger;
        this.store = new ImageStore(this);
        this.editor = new ImageEditor(this);
        this.fetcher = new ImageFetcher(this);

        this.plugin = async (fastify, _) => {
            fastify.post<{ Body: GenericRecordType }>('/image', { schema: { body: GenericRecord } }, async (req, reply) => {
                const timer = new Timer(true);

                try {
                    const image = await this.editor.editImage(req.body);
                    this.logger.log.time('Processed image', timer.elapsedBlueStr);
                    const responseType = req.body.responseType ?? 'image';

                    if (responseType === 'image') {
                        const stream = new PassThrough();
                        reply.type(await image.getMimeType());
                        image.sharp.pipe(stream);
                        return await reply.send(stream);
                    }
                    reply.code(200).type('json').send(image.context.toJSON());
                } catch (err: unknown) {
                    reply.code(500).type('json').send({ message: 'Internal server error occurred' });
                    this.logger.log.error(err);
                }
            });
        };
    }

    public get hostname(): string {
        return this.api.env.NODE_ENV === 'dev' ? 'localhost' : 'api.nicelink.xyz';
    }
}
