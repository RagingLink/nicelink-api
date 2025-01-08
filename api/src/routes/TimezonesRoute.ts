import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';

import path from 'path';
import { fileURLToPath } from 'url';

import API from '../api.js';

const timezonesDataUrl = new URL(path.join('..', '..', 'assets', 'data', 'timezones.json'), import.meta.url);
const timezonesDataPath = fileURLToPath(timezonesDataUrl);

const singleTimezoneSchema = Type.Object({
    value: Type.String(),
    abbr: Type.String(),
    offset: Type.Number(),
    isdst: Type.Boolean(),
    text: Type.String(),
    utc: Type.Array(Type.String())
});
const timezonesArraySchema = Type.Array(singleTimezoneSchema);

const TimezoneRequestQuerySchema = Type.Object({
    q: Type.Optional(Type.String())
});

export default class TimezonesRoute {
    private simpleTimezones: string[] = [];
    public plugin: FastifyPluginCallback;

    #timezones: Static<typeof timezonesArraySchema> = [];

    public constructor(public readonly api: API) {
        this.loadTimezonesJson().catch((err: unknown) => {
            api.logger.log.error(err);
        });

        this.plugin = (fastify, { }, done) => {
            fastify.get<{ Querystring: Static<typeof TimezoneRequestQuerySchema> }>('/', {
                schema: {
                    querystring: TimezoneRequestQuerySchema
                }
            }, (req, reply) => {
                this.getTimezone(req, reply);
            });
            fastify.get('/simple', (_, reply) => reply.type('json').send(JSON.stringify(this.simpleTimezones, null, 2)));
            done();
        };
    }

    private async loadTimezonesJson(): Promise<void> {
        const data = (await import(timezonesDataPath, { with: { type: 'json' } })).default;
        if (!Value.Check(timezonesArraySchema, data))
            return;
        this.#timezones = data;
        this.simpleTimezones = this.#timezones.reduce<string[]>((acc, item) => {
            acc.push(...item.utc);
            return acc;
        }, []).filter((item, index, self) => self.indexOf(item) === index);
    }

    // I'm not even sure what this exactly does anymore
    private getTimezone(req: FastifyRequest<{ Querystring: Static<typeof TimezoneRequestQuerySchema> }>, res: FastifyReply): void {
        if (req.query.q === undefined)
            return void res.type('application/json').send(JSON.stringify(this.#timezones, null, 2));

        const query = req.query.q.toLowerCase();
        const timeCodes = this.simpleTimezones.filter((item) => {
            return item.toLowerCase().includes(query);
        });
        if (timeCodes.length === 1) {
            return void res.send(timeCodes[0]);
        }
        const timeTexts = this.#timezones.filter((item) => {
            const match = item.text.match(/\(UTC.*\)/);
            return match !== null ? match.includes(query) : false;
        });
        if (timeTexts.length > 0) {
            if (timeTexts.length === 1) {
                return void res.type('json').send(JSON.stringify(timeTexts[0], null, 2));
            }
            return void res.type('json').send(JSON.stringify(timeTexts, null, 2));
        }

        const matches = this.#timezones.filter((item) => {
            if (item.value.toLowerCase().includes(query)) return true;
            if (item.abbr.toLowerCase().includes(query)) return true;
            if (item.offset.toString() === query) return true;
            if (item.utc.join(',').toLowerCase().includes(query)) return true;
            return false;
        });
        return void res.type('json').send(JSON.stringify(matches, null, 2));
    }
}
