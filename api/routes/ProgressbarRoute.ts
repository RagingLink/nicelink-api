import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Sharp } from 'sharp';
import * as url from 'url';

import { Logger } from '../utils/logging/Logger.js';
import replaceColor from '../modules/replaceColor.js';
import Image from './sharp/image/Image.js';
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
        const color = (req.query.c ?? req.query.color ?? req.query.colour ?? 'FFFFFF').toString();
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

        const pillID = color + percentage.toString();
        const cachedPill = this.cachedBars.get(pillID)
        if (cachedPill !== undefined) {
            res.set('Content-Type', 'image/png');
            return res.send(cachedPill.buffer);
        }

        return void this.generatePillImage(percentage, '#' + color).then(pillImage => {
            res.type('png');
            pillImage.pipe(res);
        });
    }
    private async generatePillImage(percentage: number, colour = 'FFFFFF'): Promise<Sharp> {
        const colouredImage = new Image(this.pillShape)
        await replaceColor(colouredImage.resize(992, 60), {
            target: '#000000',
            replace: colour,
            delta: 2.3
        });
        const colouredBuffer = await colouredImage.sharp.extract({ left: 0, top: 0, width: Math.round((colouredImage.width ?? 0) / 100 * percentage), height: colouredImage.height ?? 0 }).toBuffer();
        const image = new Image(this.pillShape).resize(1000).sharp.ensureAlpha(0.5).composite([{ input: colouredBuffer, top: 4, left: 4 }]);

        return image;
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