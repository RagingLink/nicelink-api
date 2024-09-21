import { Static, Type } from '@sinclair/typebox';

export const ConfigSchema = Type.Object({
    discord: Type.Object({
        token: Type.String(),
        logChannel: Type.String()
    }),
    beta: Type.Boolean(),
    port: Type.Number(),
    persistKey: Type.String()
});

export type Config = Static<typeof ConfigSchema>;
