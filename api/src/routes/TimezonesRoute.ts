import { Request, Response, Router } from 'express';
import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const singleTimezoneSchema = Type.Object({
    value: Type.String(),
    abbr: Type.String(),
    offset: Type.Number(),
    isdst: Type.Boolean(),
    text: Type.String(),
    utc: Type.Array(Type.String())
});
const timezonesArraySchema = Type.Array(singleTimezoneSchema);

export default class TimezonesRoute {
    public readonly router = Router();
    private simpleTimezones: string[] = [];

    #timezones: Static<typeof timezonesArraySchema> = [];

    public constructor() {
        import('../../assets/data/timezones.json', { with: { type: 'json' } }).then((data) => {
            if(!Value.Check(timezonesArraySchema, data))
                return;
            this.#timezones = data;
            this.simpleTimezones = this.#timezones
                .reduce((acc: string[], item) => {
                    acc.push(...item.utc);
                    return acc;
                }, []).filter((item, index, self) => self.indexOf(item) === index);
        });

        this.router.get('/', (req, res) => this.getTimezone(req, res));
        this.router.get('/simple', (_, res) => res.type('json').send(JSON.stringify(this.simpleTimezones, null, 2)));
    }

    private getTimezone(req: Request, res: Response): void {
        if (req.query.q === undefined) {
            return void res.type('json').send(JSON.stringify(this.#timezones, null, 2));
        }
        const query = String(req.query.q).toLowerCase();
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
