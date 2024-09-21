/* eslint-disable no-console */
import { Value } from '@sinclair/typebox/value';

import { fileURLToPath } from 'url';
import path from 'path';

import { Config, ConfigSchema } from '../types/Config.js';

const configPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'config.json');

export default async function getConfig(): Promise<Config> {
    const config = await import(configPath, { with: { type: 'json' } }).then((contents) => {
        return contents.default ?? {};
    }).catch((err) => {
        throw err;
    });

    if (!Value.Check(ConfigSchema, config)) {
        const errors = [...Value.Errors(ConfigSchema, config)]
            .map((error) => {
                return addSpaceIfPath(error.path) + error.message;
            });
        console.log(config);
        throw Error('Invalid config file:\n' + errors.join('\n'));
    }
    return config;
};

const addSpaceIfPath = (path: string): string => path !== '' ? path + ' ' : '';
