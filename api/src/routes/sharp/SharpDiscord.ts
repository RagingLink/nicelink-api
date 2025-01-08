import Eris, { Client } from 'eris';

import { Config } from '../../types/Config.js';
import API from '../../api.js';

export class SharpDiscord {
    private client: Client;
    private discordLastDisconnect = 0;

    public constructor(public readonly logger: API['logger'], config: Config) {
        this.client = Eris(config.discord.token);
        this.client.on('ready', () => {
            if (Date.now() - this.discordLastDisconnect > 60000)
                logger.log.info('Discord Client ready');
        });
        this.client.on('disconnect', () => {
            this.discordLastDisconnect = Date.now();
        });
        this.client.on('error', (err) => {
            this.logger.log.error('Discord', err);
        });
        void this.client.connect();
        // Discord events

    }
}
