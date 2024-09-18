import { Request, Response, Router } from 'express';

import timezones from '../assets/data/timezones.json' assert {type: 'json'};

export default class TimezonesRoute {
    public readonly router = Router();
    private readonly simpleTimezones: string[];

    public constructor() {
        this.simpleTimezones = timezones
            .reduce((acc: string[], item) => {
                acc.push(...item.utc);
                return acc;
            }, []).filter((item, index, self) => self.indexOf(item) === index);

        this.router.get('/', (req, res) => this.getTimezone(req, res));
        this.router.get('/simple', (_, res) => res.type('json').send(JSON.stringify(this.simpleTimezones, null, 2)));
    }

    private getTimezone(req: Request, res: Response): void {
        if (req.query.q === undefined) {
            return void res.type('json').send(JSON.stringify(timezones, null, 2));
        }
        const query = String(req.query.q).toLowerCase();
        const timeCodes = this.simpleTimezones.filter((item) => {
            return item.toLowerCase().includes(query);
        });
        if (timeCodes.length === 1) {
            return void res.send(timeCodes[0]);
        }
        const timeTexts = timezones.filter((item) => {
            const match = item.text.match(/\(UTC.*\)/);
            return match !== null ? match.includes(query) : false;
        });
        if (timeTexts.length > 0) {
            if (timeTexts.length === 1) {
                return void res.type('json').send(JSON.stringify(timeTexts[0], null, 2));
            }
            return void res.type('json').send(JSON.stringify(timeTexts, null, 2));
        }

        const matches = timezones.filter((item) => {
            if (item.value.toLowerCase().includes(query)) return true;
            if (item.abbr.toLowerCase().includes(query)) return true;
            if (item.offset.toString() === query) return true;
            if (item.utc.join(',').toLowerCase().includes(query)) return true;
            return false;
        });
        return void res.type('json').send(JSON.stringify(matches, null, 2));
    }
}
