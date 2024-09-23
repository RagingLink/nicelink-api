import { FastifyPluginAsync } from 'fastify';

import { PassThrough } from 'stream';

import ImageManager from './services/ImageManager.js';

import Timer from '../../../utils/Timer.js';
import { GenericRecord, GenericRecordType } from '../../../utils/typebox/index.js';
import API from '../../../api.js';

export default class SharpRoute {
    public readonly manager: ImageManager;
    public readonly logger: API['logger'];
    public readonly plugin: FastifyPluginAsync;

    public constructor(public readonly api: API) {
        this.manager = new ImageManager(api.logger);
        this.logger = api.logger;

        this.plugin = async (fastify, _) => {
            fastify.post<{ Body: GenericRecordType }>('/image', { schema: { body: GenericRecord } }, async (req, reply) => {
                const body = req.body;
                const timer = new Timer(true);

                try {
                    const image = await this.manager.postImage(body);
                    this.logger.log.time('Processed image', timer.elapsedBlueStr);
                    const responseType = body.responseType ?? 'image';

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
        //this.router.post('/image');
        // this.router.post('/', (req, res) => {
        //     const body = <JObject>req.body;
        //     const timer = new Timer(true);
        // });
    }

    // public parseJsonBody (req: Request, res: Response, next: NextFunction): void {

    // }
}
