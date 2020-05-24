import { NewsInfo } from '../controllers/info';

import * as cheerio from 'cheerio';
import * as moment from 'moment';

import News from '../modules/news';

interface RussianNews {
    title: string;
    description: string;
}

// TODO TESTING!

export default class CronNews extends News {
    cron = '15 */2 * * * *';

    constructor(core: Core) {
        super(core);
    }

    async image(url: string): Promise<string | undefined> {
        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string);

        return $('.lead-img', '.container').attr('src');
    }

    async translate(url: string): Promise<RussianNews> {
        const ruPath = url.replace('/en-us/', '/ru/');

        const { data } = await this.core.request(ruPath);

        const $ = cheerio.load(data as string, { normalizeWhitespace: true, xmlMode: true });

        const title = $('h1[data-topic]').text().trim();
        const description = $('.article-override').first().text().trim();

        return { title, description };
    }

    send = async (): Promise<void> => {
        const url = 'http://files.elderscrollsonline.com/rss/en-us/eso-rss.xml';
        const oldNews = await this.core.info.get<NewsInfo>('news');

        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string, { normalizeWhitespace: true, xmlMode: true });

        const news = $('item').filter((_, news) => {
            const $news = $(news);

            const date = $news.find('pubDate').text();
            const link = $news.find('link').text();

            return moment().isSame(date) && oldNews.link !== link;
        }).get()[0];

        if (!news) {
            return;
        }

        const $news = $(news);

        const link = $news.find('link').text();

        const russian = await this.translate(link);

        const description = {
            link,
            title: {
                en: $news.find('title').text(),
                ru: russian.title
            },
            description: {
                en: $news.find('description').text(),
                ru: russian.description
            },
            image: await this.image(link)
        };

        await this.core.info.set('news', description);

        const translations = this.core.translations.get('commands', 'news');

        return this.notify('news', { translations, data: description });
    }
}