import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import dotenv from 'dotenv';

export const envSchema = Type.Object({
    DOCS_HOST: Type.String(),
    PORT: Type.Number(),
    DATABASE_URL: Type.String(),
    NODE_ENV: Type.Union([
        Type.Literal('dev'),
        Type.Literal('prod')
    ])
});

export type Env = Static<typeof envSchema>;

export default function parseEnv(): Env {
    const env = dotenv.config().parsed;
    try {
        return Value.Parse(envSchema, env);
    } catch {
        throw Error('Missing/invalid environment variables');
    }
}
