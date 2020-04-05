import cheerio from 'cheerio';
import moment from 'moment-timezone';

import { Module } from './module';
import { CoreError } from '../services/core';
import { Route } from '../services/router';

import { GoldenInfo, GoldenItem } from '../controllers/info';
import { Category } from '../translation/translation';

export default class Golden extends Module {
    name = 'golden';

    routes: Route[] = [
        { path: '/golden', handler: 'get', method: 'GET' },
    ];

    constructor(core: Core) {
        super(core);
    }

    send = async ({ link = '', date = '' }): Promise<void> => {
        const { data } = await this.core.request(link);

        const items = this.items(data as string);

        await this.info.set('golden', { date, link, items });

        const translatedItems = items.map(item => Object.assign(item, {
            // items.getItem( name )
            trait: this.core.translations.get(`merchants/traits/${item.trait}`)
        }));

        const translations = this.core.translations.get('merchants/golden') as Category;

        return this.notify('golden', { translations, data: { items: translatedItems, link, date } });
    };

    get = async (): Promise<ReplyOptions> => {
        const now = moment().utc();

        if (now.day() !== 0 && now.day() !== 6) {
            throw new CoreError('UNEXPECTED_GOLDEN_DATE');
        }

        const golden = await this.info.get('golden') as GoldenInfo;

        const date = moment(golden.date);

        if (
            !date.isSame(now, 'day') &&
            !date.isSame(now.subtract(1, 'd'), 'day')
        ) {
            throw new CoreError('DONT_HAVE_ITEMS_YET');
        }

        const translations = this.core.translate('merchants/golden') as Category;

        return { translations, data: golden };
    };

    private prepare(text: string, match: RegExp, [what = /’/g, how = '\''] = []): string {
        if (!match.test(text)) {
            return '';
        }

        const matched = match.exec(text)[0].trim();

        return what ? matched.replace(what, how) : matched;
    }

    private items(body: string): GoldenItem[] {
        const $ = cheerio.load(body);

        return $('.entry-content > ul li').map((_, el) => {
            const text = $(el).text();

            if (!/([^–]+)/.test(text) || text.includes('http')) {
                return 'URL';
            }

            const fullName = this.prepare(text, /(^[^\d]+)/, [/\*$/i, '']);
            const name = this.prepare(fullName, /(^[^–]+)/);
            const trait = this.prepare(fullName, /([^–]+$)/);

            const price = text.replace(fullName, '').trim();
            const canSell = /\*$/i.test(text);
            const hasTypes = trait.includes('(Light, Medium, Heavy)');

            return {
                name,
                price: price.replace('*', ''),
                trait: trait.replace(' (Light, Medium, Heavy)', ''),
                canSell,
                hasTypes
            };
        }).get().filter((e: GoldenItem | 'URL') => e !== 'URL');
    }
}