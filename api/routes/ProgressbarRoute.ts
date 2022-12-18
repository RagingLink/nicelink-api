import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import * as url from 'url';

import { Logger } from '../utils/logging/Logger.js';
import replaceColor from '../modules/replaceColor.js';
import Image from './sharp/image/Image.js';
import Color from 'color';

export default class ProgressBarRoute {
    public router = express.Router();
    #pillShapePath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..', 'assets', 'pillshape.png');
    private readonly pillShape = fs.readFileSync(this.#pillShapePath);
    private readonly cachedBars: Map<string, { time: number; buffer: Buffer }> = new Map();

    public constructor(public readonly logger: Logger) {
        this.router.get('/', (req, res) => this.getProgressbar(req, res));
        this.startSweepInterval(48);
    }

    public getProgressbar(req: Request, res: Response) {
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
            return res.send('Invalid percentage');
        if (percentage < 0 || percentage > 100)
            return res.send('Percentage out of range');

        const pillID = colour + percentage.toString();
        const cachedPill = this.cachedBars.get(pillID)
        if (cachedPill !== undefined) {
            res.set('Content-Type', 'image/png');
            return res.send(cachedPill.buffer);
        }

        return this.generatePillImage(res, percentage, colour);
    }
    private async generatePillImage(res: Response, percentage: number, colour: string): Promise<void> {
        try {
            const colouredImage = new Image(this.pillShape)
            const pillColour = new Color(colour).hex();
            await replaceColor(colouredImage.resize(992, 60), {
                target: '#000000',
                replace: pillColour,
                delta: 2.3
            });
            const colouredBuffer = await colouredImage.sharp.extract({ left: 0, top: 0, width: Math.round((colouredImage.width ?? 0) / 100 * percentage), height: colouredImage.height ?? 0 }).toBuffer();
            const image = new Image(this.pillShape).resize(1000).sharp.ensureAlpha(0.5).composite([{ input: colouredBuffer, top: 4, left: 4 }]);
            res.type('png')
            image.pipe(res);
        } catch (e: unknown) {
            this.logger.error(e);
            if (e instanceof Error)
                res.send(e.message);
            else
                res.send('Unknown error during generation');
        }
    }
    private startSweepInterval(hoursCached = 24) {
        setInterval(() => this.sweepBars(hoursCached), hoursCached * 3600 * 1000);
    }
    private sweepBars(hoursCached: number) {
        let deletedAmount = 0;
        for (const [key, value] of this.cachedBars) {
            if ((value.time + hoursCached * 3600 * 1000) < Date.now()) {
                this.cachedBars.delete(key);
                deletedAmount++;
            }
        }
        if (deletedAmount > 0)
            this.logger.info(`Removed ${deletedAmount} cached bars`);
    }
}