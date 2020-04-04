import { Module } from "./module";

import { StatusItem } from "../controllers/info";
import { Category } from "../translation/translation";
import { Route } from "../services/router";

import cheerio from 'cheerio';

interface Changed {
    eu?: 'UP' | 'DOWN';
    na?: 'UP' | 'DOWN';
    ps_eu?: 'UP' | 'DOWN';
    ps_us?: 'UP' | 'DOWN';
    pts?: 'UP' | 'DOWN';
    xbox_eu?: 'UP' | 'DOWN';
    xbox_us?: 'UP' | 'DOWN';
}

const getNewStatus = (response: any) => {
    const data = response.zos_platform_response;

    if (data.result_message !== 'success') {
        return [];
    }

    const status_aliases = {
        // PC
        'The Elder Scrolls Online (EU)': 'eu',
        'The Elder Scrolls Online (NA)': 'na',
        'The Elder Scrolls Online (PTS)': 'pts',

        // PS4
        'The Elder Scrolls Online (PS4 - EU)': 'ps_eu',
        'The Elder Scrolls Online (PS4 - US)': 'ps_us',

        // XBox
        'The Elder Scrolls Online (XBox - US)': 'xbox_us',
        'The Elder Scrolls Online (XBox - EU)': 'xbox_eu',
    };

    return Object.entries(data.response)
        .reduce((status, [code, value]) => {
            const alias = status_aliases[code];

            if (alias) {
                return { ...status, [alias]: value };
            }

            return status;
        }, {});
};

const statusSubscriptions = (changed: Changed) => {
    const statuses = Object.keys(changed);

    if (statuses.includes('ps_eu') || statuses.includes('ps_us')) {
        statuses.unshift('ps');
    }

    if (statuses.includes('xbox_eu') || statuses.includes('xbox_us')) {
        statuses.unshift('xbox');
    }

    statuses.unshift('status');

    return statuses.map(name => {
        return {
            name: `status${name !== 'status' ? name.toUpperCase() : ''}`,
            changed: getChanged(name, changed)
        };
    });
};

const getChanged = (name: string, changed: Changed) => {
    switch (name) {
        case 'status':
            return changed;
        case 'ps':
            return {
                ps_eu: changed.ps_eu,
                ps_us: changed.ps_us
            };
        case 'xbox':
            return {
                xbox_eu: changed.xbox_eu,
                xbox_us: changed.xbox_us
            };
        case 'eu':
        case 'na':
        case 'pts':
        case 'ps_eu':
        case 'ps_us':
        case 'xbox_eu':
        case 'xbox_us':
        default:
            return { ...changed, [name]: changed[name] };
    }
};

export default class Pledges extends Module {
    name = 'status';
    cron = '30 */3 * * * *';

    routes: Route[] = [
        { path: '/status', handler: 'get', method: 'GET' },
    ];

    api: Route[] = [
        { path: '/status/render/maintence', handler: 'maintenance', method: 'POST', version: '1.0.0' }
    ];

    constructor(core: Core) {
        super(core);
    }

    getMaintenceTime = async (changed: string[]) => {
        // if( areAllServersUp( changed ) ) {
        //     return {};
        // }

        try {
            const { data } = await this.core.request('https://forums.elderscrollsonline.com/en/');

            const $ = cheerio.load(data as string, { normalizeWhitespace: true });

            const message = $('.DismissMessage').text().split('\n');

            const infoNames = [
                'PC/Mac',
                'Xbox One',
                'PlayStation'
            ];

            return message.reduce((acc, body) => {
                const matchName = infoNames.find(inf => body.search(inf) !== -1);

                if (!matchName || /(Over|No maintenance)/i.test(body)) {
                    return acc;
                }

                return {
                    ...acc,
                    [matchName]: this.core.dates.RFC(body)
                };
            }, {}) as {
                [k: string]: {
                    start: string;
                    end: string;
                }
            };
        } catch (err) {
            return {};
        }
    };

    maintenance = async ({ settings, body: { maintence } }: CoreRequest): Promise<ReplyOptions> => {
        const translations = this.core.dates.maintence(maintence, settings);

        return { translations };
    };

    get = async ({ settings }: CoreRequest): Promise<ReplyOptions> => {
        const status = await this.info.get('status') as StatusItem;
        const translations = this.core.translate('commands/status') as Category;

        const render = this.core.dates.maintence(status.maintence, settings);

        Object.assign(status, { maintence: render });

        return { translations, data: status };
    };

    send = async (): Promise<void> => {
        const translations = this.core.translations.get('commands/status') as Category;

        const url = 'https://live-services.elderscrollsonline.com/status/realms';
        const old = await this.info.get('status');

        const { data } = await this.core.request(url);

        const status = getNewStatus(data);
        const changedByCode = Object.keys(status)
            .filter(code => status[code] !== old[code]);

        if (changedByCode.length === 0) {
            return;
        }

        const maintence = await this.getMaintenceTime(changedByCode);

        const changed = changedByCode.reduce(
            (changed, code) => ({ ...changed, [code]: status[code] }), {});

        await this.core.info.set('status', { ...changed, maintence });

        statusSubscriptions(changed).forEach(info => {
            return this.notify(info.name, {
                translations: {
                    ...translations,
                    ...this.core.translations.get('subscriptions/status') as Category
                },
                data: { ...info.changed, maintence }
            });
        });
    };
}

export declare interface Maintenance {
    [key: string]: { start?: number, end?: number };
}