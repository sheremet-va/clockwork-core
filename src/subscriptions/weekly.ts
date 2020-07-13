import { WeeklyInfo } from '../controllers/info';

import * as cheerio from 'cheerio';

import Weekly from '../modules/weekly';

export default class CronWeekly extends Weekly {
    cron = '35 */10 * * * *';

    constructor(core: Core) {
        super(core);
    }

    send = async (): Promise<void> => {
        const translations = this.core.translations.get('commands', 'weekly');

        const url = 'https://esoleaderboards.com/trial/weekly';
        const old = await this.info.get<WeeklyInfo>('weekly') || { eu: { en: '' }, na: { en: '' } };

        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string);

        const trials: string[] = $('strong', '.header')
            .map((i, el) => $(el).text().trim())
            .get()
            .filter((name: string) => name.search('Megaserver') === -1);

        if (trials[0] === old.eu.en && trials[1] === old.na.en) {
            return;
        }

        const promises = trials.map(async (trial, order) => ({
            trial,
            order,
            name: await this.core.getItem('^' + trial + '$', 'en', 'locations') || { en: trial }
        }));

        const result = await Promise.all(promises);

        const changed = result.reduce((obj, trial) => {
            const region = trial.order === 0 ? 'eu' : 'na';

            return {
                ...obj,
                [region]: trial.name
            };
        }, {});

        await this.info.set('weekly', changed);

        return this.notify('weekly', { translations, data: changed });
    }
}