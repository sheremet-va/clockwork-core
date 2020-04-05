import { Module } from './module';

import { Category } from '../translation/translation';

import { WeeklyInfo } from '../controllers/info';

import { Route } from '../services/router';

import cheerio from 'cheerio';

export default class WeeklyModule extends Module {
    name = 'weekly';
    cron = '35 */10 * * * 1-2';

    routes: Route[] = [
        { path: '/weekly', handler: 'get', method: 'GET' },
    ];

    constructor(core: Core) {
        super(core);
    }

    get = async (): Promise<ReplyOptions> => {
        const weekly = await this.info.get('weekly');
        const translations = this.core.translate('commands/weekly') as Category;

        return { translations, data: weekly };
    };

    send = async (): Promise<void> => {
        const translations = this.core.translations.get('commands/weekly') as Category;

        const url = 'https://esoleaderboards.com/trial/weekly';
        const old = await this.info.get('weekly') as WeeklyInfo || { eu: { en: '' }, na: { en: '' } };

        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string);

        const trials: string[] = $('strong', '.header')
            .map((i, el) => $(el).text().trim())
            .get()
            .filter((name: string) => name.search('Megaserver') === -1);

        if (trials[0] === old.eu.en || trials[1] === old.na.en) {
            return;
        }

        const changed = trials.reduce((obj, trial, i) => {
            const region = i === 0 ? 'eu' : 'na';

            return {
                ...obj,
                [region]: this.core.translations.get(`instances/trials/${trial}`)
            };
        }, {});

        await this.info.set('weekly', changed);

        return this.notify('weekly', { translations, data: changed });
    };
}