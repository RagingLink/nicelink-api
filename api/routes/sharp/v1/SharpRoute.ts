import chalk from 'chalk';
import { Request, Response, Router } from 'express';

import { ImageEditor } from './managers/ImageEditor.js';
import { ImageManager } from './managers/ImageManager.js';
import TextManager from './managers/TextManager.js';

import config from '../../../config.json' assert {type: 'json'};
import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';
import Timer from '../../../utils/Timer.js';
import { SharpDiscord } from '../SharpDiscord.js';

export default class SharpRoute {
    private readonly textManager: TextManager;
    private readonly imageEditor: ImageEditor;
    private readonly imageManager: ImageManager;
    private getRequestCount = 0;
    public readonly router: Router;
    public constructor(public readonly logger: DefaultLogger, public readonly env: NodeJS.ProcessEnv) {
        this.router = Router();

        this.textManager = new TextManager(logger);
        this.imageEditor = new ImageEditor(logger, this.textManager);
        this.imageManager = new ImageManager(this.imageEditor, logger);
        new SharpDiscord(logger);

        this.router.get('*', (_, __, next) => {
            this.getRequestCount++;
            next();
        });
        setInterval(() => {
            if (this.getRequestCount === 0)
                return;
            this.logger.log.endpoint('GET', chalk.whiteBright('/sharp'), `${this.getRequestCount} request last hour`);
            this.getRequestCount = 0;
        }, 3600 * 1000);
        this.router.post('*', (req, res, next) => {
            const timer = new Timer();
            res.once('close', () => {
                this.logger.log.endpoint('POST', chalk.whiteBright('/sharp' + req.path), timer.elapsedBlueStr);
            });
            next();
        });
        //* Endpoints
        this.router.get('/transparent.png', (_, res) => {
            void this.imageEditor.generateImage({}).then((output) => {
                res.contentType('png');
                res.send(output.image.buffer);
            });
        });
        this.router.get('/fonts', (_, res) => {
            res.type('json').send(JSON.stringify(this.textManager.availableFontFamilies, null, 2));
        });
        this.router.get('/:image', (req, res) => this.getImage(req, res));
        this.router.post('/', (req, res) => {
            void this.imageEditor.generateImage((req.body as JObject)).then((output) => {
                res.type('json').send(JSON.stringify(output.meta, null, 2));
            });
        });
        //? Process multiple images and return an array of objects with errors, path, root etc.
        this.router.post('/multiple', (req, res) => void this.storeMultiple(req, res));
        //? Process a request and return an object with errors, path, root etc.
        this.router.post('/store', (req, res) => this.storeImage(req, res));
        //? Process a request and return an image or error object
        this.router.post('/process', (req, res) => this.processImage(req, res));
    }

    // Get image from db
    private getImage(req: Request, res: Response): void {
        try {
            void this.imageManager.getImage(req.params.image).then((buffer) => {
                if (buffer === undefined) {
                    res.send(`${req.params.image} doesn't exist.`);
                } else {
                    res.type(req.params.image.split('.').pop() ?? 'png');
                    res.send(buffer);
                }
            });
        } catch (e: unknown) {
            res.send('An error occurred!');
            this.logger.log.error(e);
        }
    }

    // Store image
    private storeImage(req: Request, res: Response): void {
        const body = req.body as JObject;
        const permanent = 'persistKey' in body && body.persistKey === config.persistKey;

        void this.imageEditor.generateImage((req.body as JObject)).then((output) => {
            void this.imageManager.saveImage(output.image, output.body, permanent).then((fileName) => {
                const root = process.env.NODE_ENV !== 'dev' ? 'https://api.nicelink.xyz/sharp/' : 'http://localhost:' + (process.env.PORT ?? '') + '/sharp/';
                res.type('json').send(JSON.stringify({
                    path: fileName,
                    root,
                    url: root + fileName,
                    ...output.meta
                }));
            });
        });
    }

    private async storeMultiple(req: Request, res: Response): Promise<void> {
        if (!Array.isArray(req.body))
            return void res.status(400).send(JSON.stringify({
                status: 400,
                message: 'Body is not an array'
            }));
        const outputs = await Promise.all(req.body.map(async (imageBody) => {
            if (typeof imageBody !== 'object' || Array.isArray(imageBody) || imageBody === null)
                return;
            const output = await this.imageEditor.generateImage((imageBody as JObject));
            const fileName = await this.imageManager.saveImage(output.image, output.body);
            return {
                path: fileName,
                ...output.meta
            };
        }));
        res.type('json').send(JSON.stringify(outputs, null, 2));
    }

    // Send image
    private processImage(req: Request, res: Response): void {
        void this.imageEditor.generateImage((req.body as JObject)).then((output) => {
            void output.image.format().then((format) => {
                res.type(format);
                if (output.image.edited) {
                    output.image.sharp.pipe(res);
                } else {
                    res.send(output.image.buffer);
                }
            });

        });
    }
}
