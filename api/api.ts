import express, { NextFunction, Request, Response } from 'express';
import http from 'http';

import { createLogger } from './Logger.js';
import ProgressBarRoute from './routes/ProgressbarRoute.js';
import SharpRouter from './routes/SharpRoute.js';
import TimezonesRoute from './routes/TimezonesRoute.js';
import env from './utils/env/createEnv.js';

class HttpException extends Error {
    public status: number;
    public message: string;
    public constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.message = message;
    }

}

const app = express();
app.get('/', (_, res) => {
    res.redirect('https://api.nicelink.xyz/docs');
});
const server = http.createServer(app);
app.set('trust proxy', 1);
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json({strict: false}));

const logger = createLogger();
const sharpRoute = new SharpRouter(logger, env);
//* Alias
app.use('/sharp', sharpRoute.router);
app.use('/jimp', sharpRoute.router);

app.use('/misc/progressbar', new ProgressBarRoute(logger).router);
app.use('/timezones', new TimezonesRoute().router);

app.use((err: HttpException, _: Request, res: Response, next: NextFunction): void => {
    if (err.status === 400 && 'body' in err) {
        logger.error(err);
        return void res.status(400).send({status: 400, message: err.message});
    }
    next();
});
server.listen(env.PORT, () => {
    logger.info('API now listening on port ' + (env.PORT ?? ''));
});
