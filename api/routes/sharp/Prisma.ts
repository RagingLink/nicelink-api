import { PrismaClient } from '@prisma/client';

import { NiceLogger } from '../../Logger.js';

export default class Prisma {
    public readonly client: PrismaClient;
    public constructor(public readonly logger: NiceLogger) {
        this.client = new PrismaClient();
        this.client.$connect().then(() => {
            this.logger.log('prisma', 'Prisma', 'Connected to Postgres');
        }).catch(e => logger.log('error', 'Prisma', e));
    }
}
