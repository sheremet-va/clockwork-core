import * as cheerio from 'cheerio';
import * as moment from 'moment-timezone';

import { Module } from './module';
import { CoreError } from '../services/core';

import { GoldenInfo, GoldenItem } from '../controllers/info';

export default class Golden extends Module {
    name = 'golden';

    constructor(core: Core) {
        super(core);
    }

    send = async ({ link = '', date = '' }): Promise<void> => {
        const { data } = await this.core.request(link);

        const promises = this.items(data as string).map( async item => {
            const name = '^' + item.name.replace( 'Shoulders', '' ).trim();

            return {
                ...item,
                name: await this.core.getItem(name, 'en', 'items') || { en: item.name },
                trait: item.trait.map(trait => this.core.translations.get('merchants', 'traits', trait))
            };
        });

        const items = await Promise.all(promises);

        await this.info.set('golden', { date, link, items });

        const translations = this.core.translations.get('merchants', 'golden');

        return this.notify('golden', { translations, data: { items, link, date } });
    };

    get = async (): Promise<GoldenInfo> => {
        const now = moment().utc();

        if (now.day() !== 0 && now.day() !== 6) {
            throw new CoreError('UNEXPECTED_GOLDEN_DATE');
        }

        const golden = await this.info.get<GoldenInfo>('golden');

        const date = moment(golden.date);

        if (
            !date.isSame(now, 'day') &&
            !date.isSame(now.subtract(1, 'd'), 'day')
        ) {
            throw new CoreError('DONT_HAVE_ITEMS_YET');
        }

        return golden;
    };

    protected prepare(text: string, match: RegExp, [what = /’/g, how = '\''] = []): string {
        const matched = match.exec(text);

        if (!matched) {
            this.core.logger.error(
                `${match} wasn't found in ${text}.`
            );

            return '';
        }

        const result = matched[0].trim();

        return what ? result.replace(what, how) : result;
    }

    protected items(body: string): GoldenItem[] {
        const $ = cheerio.load(body);

        return $('.entry-content > ul li').map((_, el) => {
            const text = $(el).text();

            if (!/([^–]+)/.test(text) || text.includes('http')) {
                return 'URL';
            }

            const fullName = this.prepare(text, /(^[^\d]+)/, [/\*$/i, '']);
            const name = this.prepare(fullName, /(^[^–]+)/);
            const trait = this.prepare(fullName, /([^–]+$)/);

            const price = text.replace(fullName, '').split('/').map(str => +str.replace(/\*|,|g|(AP)/g, '').trim()); // DIVIDE
            const canSell = /\*$/i.test(text);
            const hasTypes = trait.includes('(Light, Medium, Heavy)');

            return {
                name,
                price: {
                    gold: price[0],
                    ap: price[1]
                },
                trait: trait.replace(' (Light, Medium, Heavy)', '').split(' / '),
                canSell,
                hasTypes
            };
        }).get().filter((e: GoldenItem | 'URL') => e !== 'URL');
    }
}