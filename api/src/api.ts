import Fastify, { FastifyInstance } from 'fastify';
// import { TypeBoxTypeProvider, TypeBoxValidatorCompiler } from '@fastify/type-provider-typebox';

import ProgressBarRoute from './routes/ProgressbarRoute.js';
import SharpRoute from './routes/sharp/v1/SharpRoute.js';
import SharpRouteV2 from './routes/sharp/v2/SharpRoute.js';
import TimezonesRoute from './routes/TimezonesRoute.js';
//import HttpException from './utils/HttpException.js';
import { DefaultLogger, defaultLogLevels, NiceLogger } from './utils/logging/NiceLogger.js';
import { Config } from './types/Config.js';
import { getConfig } from './utils/loadConfig.js';
import parseEnv, { Env } from './utils/env/parseEnv.js';

//TODO rework logger maybe to specify log levels here and add emoji aliases for style
const logger = new NiceLogger({ levels: defaultLogLevels, defaultLevel: 'verbose' });

export default class API {
    public readonly logger: DefaultLogger;
    public config: Config;
    public env: Env;
    public server: FastifyInstance;

    public constructor() {
        this.logger = logger;
        try {
            this.config = getConfig();
            this.env = parseEnv();
            this.server = Fastify({ trustProxy: true });
            // ? Typebox right now seems to be having an issue with infering the type. https://github.com/fastify/fastify-type-provider-typebox/issues/167
            // .setValidatorCompiler(TypeBoxValidatorCompiler)
            // .withTypeProvider<TypeBoxTypeProvider>();
        } catch (err: unknown) {
            throw err;
        }

        this.server.get('/', (_, reply) => {
            //Instead of redirecting I could maybe setup a proxy to the docs since that's hosted on the same machine anyways
            reply.redirect(this.env.DOCS_HOST);
        });

        this.loadRoutes().catch((err) => {
            this.logger.log.error(err);
        });
    }

    public async start(): Promise<void> {
        const response = await this.server.listen({ port: this.env.PORT });
        this.logger.log.info(`Listening on port: ${this.env.PORT}`, response);
    }

    private async loadRoutes(): Promise<void> {
        const timezoneRoute = new TimezonesRoute(this);
        this.server.register(timezoneRoute.plugin, {
            prefix: '/timezones'
        });
        const progressBarRoute = new ProgressBarRoute(this);
        this.server.register(progressBarRoute.plugin, {
            prefix: '/misc/progressbar'
        });
        const sharpRoute = new SharpRoute(this);
        this.server.register(sharpRoute.plugin, {
            prefix: '/sharp/v1'
        });
        const sharpRouteV2 = new SharpRouteV2(this);
        this.server.register(sharpRouteV2.plugin, {
            prefix: '/sharp/v2'
        });
    }
}

const api = new API();

void api.start();
