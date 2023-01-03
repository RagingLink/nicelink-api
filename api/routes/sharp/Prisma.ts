import { PrismaClient } from '@prisma/client';

import { Logger } from '../../Logger.js';

export default class Prisma {
    public readonly client: PrismaClient;
    public constructor(public readonly logger: Logger) {
        this.client = new PrismaClient();
        this.client.$connect().then(() => {
            this.logger.prisma('Connected to Postgres');
        }).catch(e => logger.error(e));
    }
}
