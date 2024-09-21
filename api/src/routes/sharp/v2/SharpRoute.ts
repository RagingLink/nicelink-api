import { Router } from 'express';

import ImageManager from './services/ImageManager.js';

import { DefaultLogger } from '../../../utils/logging/NiceLogger.js';
import Timer from '../../../utils/Timer.js';

export default class SharpRoute {
    public readonly router = Router();
    public readonly manager: ImageManager;

    public constructor(public readonly logger: DefaultLogger) {
        this.manager = new ImageManager(logger);

        this.router.post('/image', (req, res) => {
            const body = req.body as JObject;
            const timer = new Timer(true);
            void this.manager.postImage(body).then(async (image) => {
                this.logger.log.time('Processed image', timer.elapsedBlueStr);
                timer.reset();
                switch ('responseType' in body ? body.responseType : 'image') {
                    case 'image':
                        res.type(await image.getFormat());
                        image.sharp.pipe(res);
                        break;
                    default:
                        res.status(200).send(JSON.stringify(image.context.toJSON(), null, 2));
                        break;
                }
            });
            res.once('close', () => {
                this.logger.log.time('Request handled', timer.elapsedBlueStr);
            });
        });
        //this.router.post('/image');
        // this.router.post('/', (req, res) => {
        //     const body = <JObject>req.body;
        //     const timer = new Timer(true);
        // });
    }

    // public parseJsonBody (req: Request, res: Response, next: NextFunction): void {

    // }
}
