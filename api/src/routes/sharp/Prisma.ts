import { PrismaClient } from '@prisma/client';

import { DefaultLogger } from '../../utils/logging/NiceLogger.js';

export default class Prisma {
    public readonly client: PrismaClient;
    public constructor(public readonly logger: DefaultLogger) {
        this.client = new PrismaClient();
        this.client.$connect().then(() => {
            this.logger.log.prisma('Connected to Postgres');
        }).catch((e) => logger.log.error(e));
    }
}
