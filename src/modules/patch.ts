import cheerio from 'cheerio';
import moment from 'moment';

import { Module } from './module';

import { PatchInfo } from '../controllers/info';
import { Category } from '../translation/translation';
import { Route } from '../services/router';

const MAX_LENGTH = 1990;

// TODO patchnotes for xbox, ps

export default class Patch extends Module {
    name = 'patch';
    cron = '20 */2 * * * *';

    routes: Route[] = [
        { path: '/patch-notes', handler: 'get', method: 'GET' },
    ];

    constructor(core: Core) {
        super(core);
    }

    description = (property: Cheerio): string => {
        const text = property.text();

        if (!/<br \/>([^>]+)<br \/>/.test(text)) {
            return '';
        }

        return /<br \/>([^>]+)<br \/>/.exec(text)[1]
            .replace(/&rsquo;/gi, '\'')
            .trim()
            .substr(0, MAX_LENGTH);
    };

    image = (description: Cheerio): string => {
        const html = description.html();

        if (!/src="([^\s]+)"/.test(html)) {
            return null;
        }

        return /src="([^\s]+)"/.exec(html)[1].replace(/-\d+x\d+/, '');
    };

    send = async (): Promise<void> => {
        const url = 'https://forums.elderscrollsonline.com/en/categories/patch-notes/feed.rss';
        const old = await this.core.info.get('patch') as PatchInfo;

        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string, { normalizeWhitespace: true, xmlMode: true });

        const patch = $('item').filter((_, news) => {
            const $news = $(news);

            const date = $news.find('pubDate').text();
            const title = $news.find('title').text();
            const link = $news.find('link').text();

            if (
                title.startsWith('PC/Mac Patch Notes') &&
                moment().isSame(date, 'day') &&
                old.link !== link
            ) {
                return true;
            }
        }).get()[0];

        if (!patch) {
            return;
        }

        const $patch = $(patch);
        const $description = $patch.find('description');

        // TODO добавить версию

        const description = {
            title: $patch.find('title').text(),
            link: $patch.find('link').text(),
            description: this.description($description),
            image: this.image($description)
        };

        this.core.info.set('patch', description);

        const translations = this.core.translations.get('commands/patch') as Category;

        return this.notify('patch', { translations, data: description });
    };

    get = async (): Promise<ReplyOptions> => {
        const patch = await this.core.info.get('patch') as PatchInfo;

        const translations = this.core.translate('commands/patch') as Category;

        return { translations, data: patch };
    };
}