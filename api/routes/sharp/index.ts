import Eris from 'eris';
import express, { Request, Response, Router } from 'express';
import { Logger } from '../../utils/logging/Logger.js';

import config from '../../config.json' assert {type: 'json'};
import { ImageEditor } from './image/ImageEditor.js';
import { ImageManager } from './image/ImageManager.js';
// ? Custom package https://github.com/RagingLink/text2png.git
//? Custom package https://github.com/RagingLink/replace-color.git
//import replaceColor from './replace-color';

export default class SharpRoute {
    private readonly imageEditor: ImageEditor;
    private readonly imageManager: ImageManager;
    private readonly discord: Eris.Client;
    public readonly router: Router;
    public constructor(public readonly logger: Logger, public readonly env: NodeJS.ProcessEnv) {

        this.imageEditor = new ImageEditor(this.logger);
        this.imageManager = new ImageManager(this.imageEditor, this.logger);
        this.router = express.Router();
        this.discord = Eris(config.discord.token);

        this.discord.on('ready', () => {
            logger.info('Discord client ready');
        });
        this.discord.on('error', (err) => {
            this.logger.error(err);
        })
        void this.discord.connect();
        //* Endpoints
        this.router.get('/transparent.png', (_, res) => {
            void this.imageEditor.generateImage({}).then(output => {
                res.contentType('png');
                res.send(output.image.buffer);
            });
        });
        this.router.get('/:image', (req, res) => this.getImage(req, res));

        this.router.post('/', (_, __) => {
            // no-op
        });
        //? Process multiple images and return an array of objects with errors, path, root etc.
        this.router.post('/multiple', (req, res) => this.storeMultiple(req, res));
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
        }
    }
    // Store image
    private storeImage(req: Request, res: Response): void {
        void this.imageEditor.generateImage(<JObject>req.body).then(output => {
            void this.imageManager.saveImage(output.image, output.body).then(fileName => {
                const root = process.env.NODE_ENV !== 'dev' ? 'https://api.nicelink.xyz/sharp/' : 'localhost:' + process.env.PORT + '/sharp/'
                res.type('json').send(JSON.stringify({
                    path: fileName,
                    root,
                    url: root + fileName,
                    ...output.meta
                }));
            });
        })
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
            const output = await this.imageEditor.generateImage(<JObject>imageBody);
            const fileName = await this.imageManager.saveImage(output.image, output.body);
            return {
                path: fileName,
                ...output.meta
            }
        }));
        res.type('json').send(JSON.stringify(outputs, null, 2));
    }
    // Send image
    private processImage(req: Request, res: Response): void {
        void this.imageEditor.generateImage(<JObject>req.body).then(output => {
            if (output.image.edited) {
                output.image.sharp.pipe(res);
            } else {
                void output.image.format().then(format => {
                    res.type(format);
                    res.send(output.image.buffer);
                });
            }
        });
    }
}
