import Status from '../modules/status';

import * as cheerio from 'cheerio';

type status = 'UP' | 'DOWN';

interface Changed {
    eu?: status;
    na?: status;
    ps_eu?: status;
    ps_us?: status;
    pts?: status;
    xbox_eu?: status;
    xbox_us?: status;
}

type ChangedNotify = keyof Changed | 'ps' | 'xbox' | 'status';

type ZosResponseServers =
    | 'The Elder Scrolls Online (EU)'
    | 'The Elder Scrolls Online (NA)'
    | 'The Elder Scrolls Online (PTS)'
    | 'The Elder Scrolls Online (PS4 - EU)'
    | 'The Elder Scrolls Online (PS4 - US)'
    | 'The Elder Scrolls Online (XBox - US)'
    | 'The Elder Scrolls Online (XBox - EU)'

type ZosResponse = {
    zos_platform_response: {
        result_message: 'success' | 'fail';
        response: Record<ZosResponseServers, status>;
    };
}

const getNewStatus = (response: ZosResponse): Changed => {
    const data = response.zos_platform_response;

    if (data.result_message !== 'success') {
        return {};
    }

    const status_aliases: Record<ZosResponseServers, keyof Changed> = {
        // PC/Mac
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
            const alias = status_aliases[code as ZosResponseServers];

            if (alias) {
                return { ...status, [alias]: value };
            }

            return status;
        }, {});
};

const getChanged = (
    name: ChangedNotify,
    changed: Changed
): Changed => {
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

const statusSubscriptions = (changed: Changed): { name: string; changed: Changed }[] => {
    const statuses = Object.keys(changed) as ChangedNotify[];

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

export default class CronStatus extends Status {
    cron = '30 */3 * * * *';

    constructor(core: Core) {
        super(core);
    }

    async getMaintenanceTime(): Promise<Maintenance> {
        // if( areAllServersUp( changed ) ) {
        //     return {};
        // }

        try {
            const { data } = await this.core.request('https://forums.elderscrollsonline.com/en/');

            const $ = cheerio.load(data as string, { normalizeWhitespace: true });

            const message = $('.DismissMessage').text().split('\n');

            const codes = {
                'PC/Mac': 'pc',
                'Xbox One': 'xbox',
                'PlayStation': 'ps'
            };

            return message.reduce((acc, body) => {
                const matchName = Object.keys(codes).find(inf => body.search(inf) !== -1) as keyof typeof codes;

                if (!matchName || /(Over|No maintenance)/i.test(body)) {
                    return acc;
                }

                return {
                    ...acc,
                    [codes[matchName]]: this.core.dates.RFC(body)
                };
            }, {}) as Maintenance;
        } catch (err) {
            return {};
        }
    }

    send = async (): Promise<void> => {
        const translations = this.core.translations.get('commands', 'status');

        const url = 'https://live-services.elderscrollsonline.com/status/realms';
        const old = await this.info.get<Changed>('status');

        const { data } = await this.core.request(url);

        const status = getNewStatus(data as ZosResponse);
        const changedByCode = (Object.keys(status) as (keyof Changed)[])
            .filter(code => status[code] !== old[code]);

        if (changedByCode.length === 0) {
            return;
        }

        const maintenance = await this.getMaintenanceTime();

        const changed = changedByCode.reduce(
            (changed, code) => ({ ...changed, [code]: status[code] }), {});

        await this.core.info.set('status', { ...changed, maintenance });

        statusSubscriptions(changed).forEach(info => {
            return this.notify(info.name, {
                translations: {
                    ...translations,
                    ...this.core.translations.get('subscriptions', 'status')
                },
                data: { ...info.changed, maintenance }
            });
        });
    }
}

export declare interface Maintenance {
    [key: string]: { start: string; end: string };
}