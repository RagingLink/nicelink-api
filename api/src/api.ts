import express, { json, NextFunction, Request, Response, urlencoded } from 'express';

import http from 'http';

import ProgressBarRoute from './routes/ProgressbarRoute.js';
import SharpRoute from './routes/sharp/v1/SharpRoute.js';
import SharpRouteV2 from './routes/sharp/v2/SharpRoute.js';
import TimezonesRoute from './routes/TimezonesRoute.js';
import env from './utils/env/createEnv.js';
import HttpException from './utils/HttpException.js';
import { defaultLogLevels, NiceLogger } from './utils/logging/NiceLogger.js';
import loadConfig from './utils/loadConfig.js';

// Maybe I should make API its own class so I can more 'cleanly' expose common properties like config/env etc by just passing API to each route/module
const logger = new NiceLogger({ levels: defaultLogLevels, defaultLevel: 'verbose' });
const app = express();

loadConfig().then((config) => {
    app.get('/', (_, res) => {
        res.redirect('https://api.nicelink.xyz/docs');
    });
    app.set('trust proxy', 1);

    app.use(urlencoded({ extended: false }));
    app.use(json({ strict: false }));

    const sharpRoute = new SharpRoute(logger, env, config);
    const sharpRouteV2 = new SharpRouteV2(logger);
    //* Alias
    app.use('/sharp/v2', sharpRouteV2.router);
    app.use('/sharp/v1', sharpRoute.router);
    //app.use('/jimp', sharpRoute.router);

    app.use('/misc/progressbar', new ProgressBarRoute(logger).router);
    app.use('/timezones', new TimezonesRoute().router);

    app.use((err: HttpException, _: Request, res: Response, next: NextFunction): void => {
        if (err.status === 400 && 'body' in err) {
            if (err instanceof SyntaxError) {
                logger.log.error('API', `${err.name}: ${err.message}`);
            } else
                logger.log.error('error', err);
            return void res.status(400).send({ status: 400, message: err.message });
        }
        next();
    });
});

const server = http.createServer(app);

server.listen(env.PORT, () => {
    logger.log.info('API', 'Listening on port', +(env.PORT ?? ''));
});
