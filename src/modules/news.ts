import { Module } from './module';

import { NewsInfo } from '../controllers/info';

import cheerio from 'cheerio';
import moment from 'moment';

export default class News extends Module {
    name = 'news';
    cron = '15 */2 * * * *';

    constructor(core: Core) {
        super(core);
    }

    image = async (url: string): Promise<string> => {
        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string);

        return $('.lead-img', '.container').attr('src');
    };

    send = async (): Promise<void> => {
        const url = 'http://files.elderscrollsonline.com/rss/en-us/eso-rss.xml';
        const oldNews = await this.core.info.get('news') as NewsInfo;

        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string, { normalizeWhitespace: true, xmlMode: true });

        const news = $('item').filter((_, news) => {
            const $news = $(news);

            const date = $news.find('pubDate').text();
            const link = $news.find('link').text();

            if (
                moment().isSame(date) &&
                oldNews.link !== link
            ) {
                return true;
            }
        }).get()[0];

        if (!news) {
            return;
        }

        const $news = $(news);

        const description = {
            title: $news.find('title').text(),
            link: $news.find('link').text(),
            description: $news.find('description').text(),
            image: ''
        };

        description.image = await this.image(description.link);

        await this.core.info.set('news', description);

        const translations = this.core.translations.get('commands/news');

        return this.notify('news', { translations, data: description });
    };
}