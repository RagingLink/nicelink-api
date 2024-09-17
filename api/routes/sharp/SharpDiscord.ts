import Eris, { Client } from 'eris';

import config from '../../config.json';
import { DefaultLogger } from '../../utils/logging/NiceLogger.js';

export class SharpDiscord {
    private readonly client: Client;
    private discordLastDisconnect = 0;
    public constructor(public readonly logger: DefaultLogger) {
        this.client = Eris(config.discord.token);
        // Discord events
        this.client.on('ready', () => {
            if (Date.now() - this.discordLastDisconnect > 60000)
                logger.log.info('Discord', 'Client ready');
        });
        this.client.on('disconnect', () => {
            this.discordLastDisconnect = Date.now();
        });
        this.client.on('error', (err) => {
            this.logger.log.error('Discord', err);
        });
        void this.client.connect();
    }
}
