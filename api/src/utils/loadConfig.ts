import { Value } from '@sinclair/typebox/value';
import { config } from 'dotenv';

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import util from 'util';

import { Config, ConfigSchema } from '../types/Config.js';

const configPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'config.json');

export async function getConfigAsync(): Promise<Config> {
    const data = await import(configPath, { with: { type: 'json' } }).then((contents) => {
        return contents.default ?? {};
    }).catch((err) => {
        // Is catching and throwing the error not just the same as not catching it?
        throw err;
    });

    return validateConfig(data);
};

export function getConfig(): Config {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return validateConfig(data);
}

function validateConfig(data: unknown): Config {
    if (!Value.Check(ConfigSchema, data)) {
        const errors = [...Value.Errors(ConfigSchema, config)]
            .map((error) => {
                return addSpaceIfPath(error.path) + error.message;
            });
        throw Error(`Invalid config file:\n${errors.join('\n')}\n${util.inspect(data)}`);
    }
    return data;
}

const addSpaceIfPath = (path: string): string => path !== '' ? path + ' ' : '';
