import moment from 'moment';
import cheerio from 'cheerio';

import { GoldenInfo, LuxuryInfo } from '../controllers/info';

import Golden from '../modules/golden';
import Luxury from '../modules/luxury';

type Item = {
    link: string;
    date: string;
    type: 'luxury' | 'golden';
}

export class Merchants {
    core: Core;
    name = 'merchants';
    cron = '*/15 * * * * 6';

    golden: Golden;
    luxury: Luxury;

    constructor(core, golden: Golden, luxury: Luxury) {
        this.core = core;

        this.golden = golden;
        this.luxury = luxury;
    }

    published = (
        body: string,
        info: { golden: GoldenInfo; luxury: LuxuryInfo }
    ): Item[] => {
        const NOT_ELIGIBLE = 'NOT_ELIGIBLE';

        const $ = cheerio.load(body, { xmlMode: true });

        return $('item').map((_, item) => {
            const $item = $(item);
            const title = $item.find('title').text();

            const isLuxury = /LUXURY FURNITURE VENDOR ITEMS/i.test(title);
            const isGolden = /GOLDEN VENDOR ITEMS/i.test(title);

            if (!isGolden && !isLuxury) {
                return NOT_ELIGIBLE;
            }

            const type = isLuxury ? 'luxury' : 'golden';

            const link = $item.find('link').text();
            const date = $item.find('pubDate').text();

            const publishedToday = moment(date).isSame(moment(), 'day');

            if (
                !publishedToday ||
                isLuxury && date === info.luxury.date ||
                isGolden && date === info.golden.date
            ) {
                return NOT_ELIGIBLE;
            }

            return { link, date, type };
        }).get().filter(e => e !== NOT_ELIGIBLE);
    };

    start = async (): Promise<void> => {
        const info = {
            golden: await this.core.info.get('golden') as GoldenInfo, // { date: 'Fri, 18 Oct 2019 00:11:22 +0000' }
            luxury: await this.core.info.get('luxury') as LuxuryInfo // { date: 'Fri, 18 Oct 2019 00:16:46 +0000' }
        };

        const now = moment();

        if (
            moment(info.golden.date).isSame(now, 'day') &&
            moment(info.luxury.date).isSame(now, 'day')
        ) {
            return;
        }

        const benevolent_rss = 'http://benevolentbowd.ca/feed/';

        const { data } = await this.core.request(benevolent_rss);

        this.published(data as string, info).forEach(post => {
            if (post.type === 'luxury') {
                return this.luxury.send(post);
            }

            return this.golden.send(post);
        });
    };
}