// import { NewsInfo } from '../controllers/info';

import * as cheerio from 'cheerio';
import * as moment from 'moment';

import News from '../modules/news';

interface RussianNews {
    title: string;
    description: string;
}

// TODO TESTING!
// TODO разделить на 2 подпискиsubscrit

export default class CronNews extends News {
    // cron = '*/15 * * * * *';
    cron = '15 */2 * * * *';

    constructor(core: Core) {
        super(core);
    }

    async image(url: string): Promise<string | undefined> {
        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string);

        return $('.lead-img', '.container').attr('src');
    }

    async translate(url: string): Promise<RussianNews | false> {
        try {
            const ruPath = url.replace('/en-us/', '/ru/');

            const { data } = await this.core.request(ruPath);

            const $ = cheerio.load(data as string, { normalizeWhitespace: true, xmlMode: true });

            const title = $('h1[data-topic]').text().trim();
            const description = $('.article-override p').first().text().trim().replace('&nbsp;', '');

            return { title, description };
        } catch(err) {
            return false;
        }
    }

    send = async (): Promise<void> => {
        const url = 'http://files.elderscrollsonline.com/rss/en-us/eso-rss.xml';

        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string, { normalizeWhitespace: true, xmlMode: true });

        const safePeriod = moment().subtract(2, 'minutes');

        const news = $('item').filter((_, news) => {
            const $news = $(news);

            const date = $news.find('pubDate').text();

            return (
                moment().isSame(date, 'day')
                && moment(date).isBetween(safePeriod, moment())
            );
        }).get()[0];

        if (!news) {
            return;
        }

        const $news = $(news);

        const link = $news.find('link').text().trim();

        const russian = await this.translate(link);

        if(!russian) {
            return;
        }

        const description = {
            link: {
                en: link,
                ru: link.replace('/en-us/', '/ru/')
            },
            title: {
                en: $news.find('title').text().trim(),
                ru: russian.title
            },
            description: {
                en: $news.find('description').text().trim(),
                ru: russian.description
            },
            image: await this.image(link)
        };

        await this.core.info.set('news', description);

        const translations = this.core.translations.get('commands', 'news');

        return this.notify('news', { translations, data: description });
    }
}
