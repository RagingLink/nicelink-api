import Color from 'color';
import sharp from 'sharp';
import { Static, Type } from '@sinclair/typebox';
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import fs from 'fs';
import path from 'path';
import * as url from 'url';

import CacheManager from '../utils/CacheManager.js';
import API from '../api.js';

const ProgressBarQuerySchema = Type.Partial(Type.Object({
    c: Type.String(),
    color: Type.String(),
    colour: Type.String(),
    p: Type.Number(),
    percentage: Type.Number()
}));

export default class ProgressBarRoute {
    #assetsPath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'assets', 'img');
    private readonly pillBg = fs.readFileSync(this.#assetsPath + '/1000x64_pillshape.png');
    private readonly pillShape = fs.readFileSync(this.#assetsPath + '/996x60_pillshape.png');
    private readonly cache: CacheManager<{ buffer: Buffer; }>;
    public readonly plugin: FastifyPluginAsync;

    public constructor(public readonly api: API) {
        this.cache = new CacheManager({ refresh: 6, hours: 24 * 2 });
        this.plugin = async (fastify) => {
            fastify.get<{ Querystring: Static<typeof ProgressBarQuerySchema> }>('/', { schema: { querystring: ProgressBarQuerySchema } }, (req, reply) => this.getProgressbar(req, reply));
        };
        this.cache.registerMultipleSweepHandler((items) => {
            if (items.length === 0)
                return;
            this.api.logger.log.info('ProgressbarRoute', `Deleted ${items.length} cached bars`);
        });
    }

    public getProgressbar(req: FastifyRequest<{ Querystring: Static<typeof ProgressBarQuerySchema> }>, reply: FastifyReply): void {
        let colour = String(req.query.c ?? req.query.color ?? req.query.colour ?? '#FFFFFF');
        if (/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colour))
            colour = '#' + colour;

        const percentage = toInt(req.query.p) ?? toInt(req.query.percentage) ?? NaN;

        if (isNaN(percentage))
            return void reply.send('Invalid percentage');
        if (percentage < 0 || percentage > 100)
            return void reply.send('Percentage out of range');

        const pillID = `${colour}${percentage}`;
        const cachedPill = this.cache.get(pillID);
        if (cachedPill !== undefined) {
            reply.type('image/png');
            return void reply.send(cachedPill.buffer);
        }

        return void this.generatePillImage(reply, percentage, colour);
    }

    private generatePillImage(reply: FastifyReply, percentage: number, colour: string): void {
        try {
            reply.type('png');
            const rgb = new Color(colour).rgb().array();
            void sharp({
                create: {
                    width: 996,
                    height: 60,
                    channels: 4,
                    background: {
                        r: rgb[0],
                        g: rgb[1],
                        b: rgb[2]
                    }
                }
            }).composite([{ input: this.pillShape, blend: 'dest-in' }]).png().toBuffer().then((data) => {
                void sharp(data).extract({ top: 0, left: 0, height: 60, width: Math.round(996 / 100 * percentage) }).png().toBuffer().then((pillBuffer) => {
                    void sharp(this.pillBg).composite([{ input: pillBuffer, top: 2, left: 2 }]).toBuffer().then((buffer) => {
                        this.cache.set(colour + percentage.toString(), { buffer });
                        reply.type('image/png');
                        reply.send(buffer);
                    });
                });
            });
        } catch (e: unknown) {
            this.api.logger.log.error('Progressbar', e);
            if (e instanceof Error)
                reply.send(e.message);
            else
                reply.send('Unknown error during generation');
        }
    }
}

function toInt(input: unknown): number | undefined {
    switch (typeof input) {
        case 'string':
            return parseInt(input);
        case 'number':
            return input;
        default:
            if (input === undefined || input === null)
                return undefined;
            return NaN;
    }
}
