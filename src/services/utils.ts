import * as moment from 'moment-timezone';
import { zones } from 'moment-timezone/data/packed/latest.json';

import { readdir as readSync } from 'fs';
import { promisify } from 'util';

import settingsConfig from '../configs/settings';
import subscriptionsConfig from '../configs/subscriptions';

type Strings = Record<string, { type: 'string' }>;

const readdir = promisify(readSync);

const types = {
    string: { type: 'string' },
    boolean: { type: 'boolean' },
    number: { type: 'number' },
    object: <T>(obj: T): { type: 'object'; properties: T } => ({
        type: 'object',
        properties: obj
    }),
    array: <T>(item: T): object => ({
        type: 'array',
        items: item
    }),
    item: (): { type: 'object'; properties: Record<language, { type: 'string' }> } => ({
        type: 'object',
        properties: {
            ru: { type: 'string' },
            en: { type: 'string' }
        }
    }),
    strings: (properties: string[], options = {}): { type: 'object'; properties: Strings } => {
        const props = properties.reduce((result, prop) =>
            ({ ...result, [prop]: { type: 'string' as const, ...options } }), {} as Strings );

        return {
            type: 'object',
            properties: props
        };
    },
    settings(): { type: 'object'; properties: Strings } {
        return this.strings(settingsConfig.available);
    },
    subscriptions(): { type: 'object'; properties: {} } {
        const aliases = subscriptionsConfig.subsAliases;
        const subs = Object.keys(aliases);

        const subsObject = subs.reduce((result, sub) => ({ ...result, [sub]: this.array(this.string) }), {});

        return this.object(subsObject);
    }
};

const getTimezone = (value: string): string | false => {
    if(!value) {
        return false;
    }

    const abbr = new RegExp(value.replace(/\+/g, '\\+'), 'g');

    const zone = zones.filter(z => {
        const timezone = z.split('|')[0];

        if (timezone === value) {
            return true;
        }

        if (!abbr.test(z)) {
            return false;
        }

        const zone = moment.tz.zone(timezone);

        if( !zone ) {
            return false;
        }

        const zoneAbbr = zone.abbr(new Date().valueOf());

        if (zoneAbbr === value) {
            return true;
        }

        return false;
    }).map(z => z.split('|')[0]);

    return zone[0] || false;
};

async function modules<T>(core: Core, path: string): Promise<T[]> {
    const moduleFiles = await readdir(path);

    const promises = moduleFiles.map(async file => {
        if (file.includes('init') || (!file.endsWith('.ts') && !file.endsWith('.js'))) {
            return;
        }

        const module = await import(`${path}/${file}`);

        if( !module.default ) {
            return;
        }

        return new module.default(core);
    }, {});

    try {
        return (await Promise.all(promises)).filter( Boolean );
    } catch( error ) {
        console.error(error.message);

        process.exit(1);
    }
}

export { readdir, types, getTimezone, modules as getModules };