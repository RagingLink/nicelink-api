const MS_IN_HOUR = 3_600_000;

interface TimeInfo {
    timestamp: number;
    duration: number;
}

type CacheManagerArgument =  {
    hours?: number;
    refresh?: number;
};

interface CacheDurations {
    hours: number;
    refresh: number;
}

export default class CacheManager<DataObj> {
    private readonly durations: CacheDurations;
    private readonly cache: Map<string, DataObj & TimeInfo>;
    private singleSweepHandler: ((id: string, obj: (DataObj & TimeInfo)) => void) | undefined;
    private multipleSweepHandler: ((items: Array<[string, (DataObj & TimeInfo)]>) => void) | undefined;
    public constructor(inputObj: CacheManagerArgument = {}) {
        this.durations = Object.assign({hours: 24, refresh: 6}, inputObj);
        this.cache = new Map();

        setInterval(() => this.sweepData(), this.durations.refresh * MS_IN_HOUR);
    }

    public get(id: string): (DataObj & TimeInfo) | undefined {
        return this.cache.get(id);
    }

    public delete(id: string): (DataObj & TimeInfo) | undefined {
        const obj = this.cache.get(id);
        if (obj === undefined)
            return;
        if (this.singleSweepHandler !== undefined)
            this.singleSweepHandler(id, obj);
        this.cache.delete(id);
        return obj;
    }

    public set(id: string, obj: DataObj, duration = this.durations.hours): (DataObj & TimeInfo) {
        this.cache.set(id, { ...obj, timestamp: Date.now(), duration });
        return { ...obj, timestamp: Date.now(), duration };
    }

    public refreshTimestamp(id: string): (DataObj & TimeInfo) | undefined {
        const obj = this.cache.get(id);
        if (obj === undefined)
            return;
        const newObj = Object.assign(obj, { timestamp: Date.now() });
        this.cache.set(id, newObj);
        return newObj;
    }

    private sweepData(): void {
        const deletedItems: Array<[string, (DataObj & TimeInfo)]> = [];
        for (const [id, value] of this.cache) {
            if ((Date.now() - value.timestamp) / MS_IN_HOUR > value.duration) {
                const deletedObj = this.delete(id);
                if (deletedObj !== undefined)
                    deletedItems.push([id, deletedObj]);
            }
        }
        if (this.multipleSweepHandler !== undefined)
            this.multipleSweepHandler(deletedItems);
    }

    public *items(): IterableIterator<[string, (DataObj & TimeInfo)]> {
        for (const [id, value] of this.cache)
            yield [id, value];
    }

    public registerSingleSweepHandler(handler: (id: string, obj: (DataObj & TimeInfo)) => void): void {
        this.singleSweepHandler = handler;
    }
    public registerMultipleSweepHandler(handler: (items: Array<[string, (DataObj & TimeInfo)]>) => void): void {
        this.multipleSweepHandler = handler;
    }
}
