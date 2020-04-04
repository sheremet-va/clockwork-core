import moment from 'moment-timezone';

import { Module } from './module';

import { Category } from '../translation/translation';

import { User } from '../controllers/users';
import { DropItem } from '../controllers/drops';

import { CoreError } from '../services/core';
import { Route } from '../services/router';

const ONE_HOUR = 1;
const SENDING_HOUR = 19;

export default class Drops extends Module {
    name = 'drops';
    cron = '0 50 */1 * * *';

    routes: Route[] = [
        { path: '/drops', handler: 'get', method: 'GET' },
    ];

    api: Route[] = [
        { path: '/drops/translate/when', handler: 'when', method: 'GET', version: '1.0.0' },
        { path: '/drops/render/sending', handler: 'sending', method: 'GET', version: '1.0.0' }
    ];

    constructor(core: Core) {
        super(core);
    }

    drops = async (): Promise<DropItem[]> => {
        const now = new Date().valueOf();

        return this.core.info.drops.get(now);
    }

    when = async ({ query: { start, end }, settings: { timezone } }: CoreRequest): Promise<ReplyOptions> => {
        const translations = this.core.dates.drops(parseInt(start), parseInt(end), timezone);

        return { translations };
    }

    sending = async ({ query: { start }, settings: { timezone, language } }: CoreRequest): Promise<ReplyOptions> => {
        const data = this.core.dates.dropsSending(parseInt(start), language, timezone);

        return { data };
    }

    get = async ({ settings: { language: lang, timezone } }: CoreRequest): Promise<ReplyOptions> => {
        const drops = await this.drops();

        if (drops.length === 0) {
            throw new CoreError('NO_DROPS_INFO');
        }

        const translations = this.core.translate('commands/drops') as Category;
        const description = this.core.translate('drops/description') as Category;

        const formated = drops.map(drop => {
            const sending = this.core.dates.dropsSending(drop.sendingDate, lang, timezone);

            return {
                when: this.core.dates.drops(drop.startDate, drop.endDate, timezone)[lang],
                where: description[drop.where].render({ streamer: drop.streamer }),
                info: description[drop.info].render({ streamer: drop.streamer }),
                sending: description[drop.sending].render(sending),
                image: drop.image || null,
                url: drop.url
            };
        });

        return { translations, data: formated };
    }

    send = async (): Promise<void> => {
        const now = moment();

        const drops = await this.drops();

        // Checks if there is a stream in 10 minutes
        const dropStart = drops.find(drop => {
            const startDate = moment(drop.startDate);
            const hourMore = moment().add(ONE_HOUR, 'hours');

            if (startDate.isSame(hourMore, 'hours')) {
                return true;
            }

            return true;
        });

        // Checks if you can get drops right now.
        const dropBetween = drops.find(drop => {
            const startDate = moment(drop.startDate);
            const endDate = moment(drop.endDate);

            if (now.isBetween(startDate, endDate)) {
                return true;
            }
        });

        const drop = dropStart || dropBetween;

        if (!drop) {
            return;
        }

        const translations = {
            title: this.core.translations.get(`drops/title/${dropStart ? 'title_soon' : 'title_now'}`),
            ...(this.core.translations.get('subscriptions/drops') as Category)
        };

        const description = this.core.translations.get('drops/description');

        const formatted = {
            ...drop,
            where: description[drop.where].render({ streamer: drop.streamer }),
            info: description[drop.info].render({ streamer: drop.streamer }),
            sending: description[drop.sending]
        };

        return this.notify('drops', { translations, data: formatted }, this.condition);
    };

    condition = (user: User): boolean => {
        const tz = user.settings.timezone;

        return moment(new Date()).tz(tz).hour() === SENDING_HOUR;
    }
}