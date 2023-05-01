import Color from 'color';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as url from 'url';

import { NiceLogger } from '../Logger.js';
import CacheManager from './sharp/managers/CacheManager.js';

export default class ProgressBarRoute {
    public router = express.Router();
    #assetsPath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..', 'assets', 'img');
    private readonly pillBg = fs.readFileSync(this.#assetsPath + '/1000x64_pillshape.png');
    private readonly pillShape = fs.readFileSync(this.#assetsPath + '/996x60_pillshape.png');
    private readonly cache: CacheManager<{buffer: Buffer;}>;

    public constructor(public readonly logger: NiceLogger) {
        this.cache = new CacheManager({refresh: 6, hours: 24 * 2});

        this.router.get('/', (req, res) => void this.getProgressbar(req, res));
        this.cache.registerMultipleSweepHandler((items) => {
            if (items.length === 0 )
                return;
            this.logger.log('info', 'ProgressbarRoute', `Deleted ${items.length} cached bars`);
        });
    }

    public getProgressbar(req: Request, res: Response): void {
        let colour = (req.query.c ?? req.query.color ?? req.query.colour ?? '#FFFFFF').toString();
        if (/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colour))
            colour = '#' + colour;

        let percentage: number;
        if (typeof req.query.p === 'string')
            percentage = parseInt(req.query.p);
        else if (typeof req.query.percentage === 'string')
            percentage = parseInt(req.query.percentage);
        else percentage = NaN;
        if (isNaN(percentage))
            return void res.send('Invalid percentage');
        if (percentage < 0 || percentage > 100)
            return void res.send('Percentage out of range');

        const pillID = colour + percentage.toString();
        const cachedPill = this.cache.get(pillID);
        if (cachedPill !== undefined) {
            res.set('Content-Type', 'image/png');
            return void res.send(cachedPill.buffer);
        }

        return void this.generatePillImage(res, percentage, colour);
    }
    private generatePillImage(res: Response, percentage: number, colour: string): void {
        try {
            res.type('png');
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
            }).composite([{ input: this.pillShape, blend: 'dest-in' }]).png().toBuffer().then(data => {
                void sharp(data).extract({ top: 0, left: 0, height: 60, width: Math.round(996 / 100 * percentage) }).png().toBuffer().then(pillBuffer => {
                    void sharp(this.pillBg).composite([{ input: pillBuffer, top: 2, left: 2 }]).toBuffer().then(buffer => {
                        this.cache.set( colour + percentage.toString(), {buffer});
                        res.set('Content-Type', 'image/png');
                        res.send(buffer);
                    });
                });
            });
        } catch (e: unknown) {
            this.logger.log('error', 'Progressbar', e);
            if (e instanceof Error)
                res.send(e.message);
            else
                res.send('Unknown error during generation');
        }
    }
}
