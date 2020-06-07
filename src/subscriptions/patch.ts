import * as cheerio from 'cheerio';
import * as moment from 'moment';

import { PatchInfo } from '../controllers/info';

import Patch from '../modules/patch';

const MAX_LENGTH = 1990;

interface PatchNotify {
    title: Record<language, string>;
    link: Record<language, string>;
    description: Record<language, string>;
    image: string;
}

export default class CronPatch extends Patch {
    cron = '20 */5 * * * *';

    constructor(core: Core) {
        super(core);
    }

    description(property: Cheerio): string {
        const match = /<br \/>([^>\n]+)(<br \/>|\n)/.exec(property.text() + '\n');

        if (!match) {
            return '';
        }

        return match[1]
            .replace(/&rsquo;/gi, '\'')
            .trim()
            .substr(0, MAX_LENGTH);
    }

    image(description: Cheerio): string {
        const html = description.html() || '';
        const match = /src="([^\s]+)"/.exec(html);

        if (!match) {
            return '';
        }

        return match[1].replace(/-\d+x\d+/, '');
    }

    async getPatch(
        url: string,
        lang: language,
        storage: string
    ): Promise<{ patch: CheerioElement; $: CheerioStatic } | null> {

        const old = await this.core.info.get<PatchInfo>(storage);

        const { data } = await this.core.request(url);

        const $ = cheerio.load(data as string, { normalizeWhitespace: true, xmlMode: true });

        const patch = $('item').filter((_, news) => {
            const $news = $(news);

            const date = $news.find('pubDate').text();
            const title = $news.find('title').text();
            const link = $news.find('link').text();
            const author = $news.find('dc\\:creator').text();

            const isPatchEn = !!/^(PC\/Mac|PTS) Patch Notes/.exec(title);
            const isPatchRu = !!/^Описание обновления/.exec(title);

            return (
                ( isPatchEn || isPatchRu ) &&
                author.startsWith('ZOS') &&
                moment().isSame(date, 'day') &&
                old.link[lang] !== link
            );
        }).get()[0];

        if(!patch) {
            return null;
        }

        return { patch, $ };
    }

    async sendPatch(storage: 'pts' | 'patch'): Promise<void> {
        const rssCategory = {
            pts: {
                ru: '•	public-test-server-russian',
                en: 'pts'
            },
            patch: {
                ru: 'patch-notes-r',
                en: 'patch-notes'
            }
        };

        const promises = this.core.config.languages.map( async lang => {
            const category = rssCategory[storage][lang];
            const url = `https://forums.elderscrollsonline.com/${lang}/categories/${category}/feed.rss`;

            const info = await this.getPatch(url, lang, storage);

            if(!info) {
                return Promise.reject( 'NO_PATCH' );
            }

            const $patch = info.$(info.patch);
            const $description = $patch.find('description');

            // TODO добавить версию

            return {
                title: { [lang]: $patch.find('title').text() },
                link: { [lang]: $patch.find('link').text() },
                description: { [lang]: this.description($description) },
                image: this.image($description)
            };
        });

        try {
            const patches = await Promise.all(promises);

            const description = patches.reduce((result, description) => {
                return {
                    title: { ...result.title, ...description.title },
                    link: { ...result.link, ...description.link },
                    description: { ...result.description, ...description.description },
                    image: description.image,
                };
            }, {} as PatchNotify);

            console.log(description);

            this.core.info.set(storage, description);

            const translations = this.core.translations.get('commands', 'patch');

            return this.notify(storage, { translations, data: description });
        } catch(error) {
            if( error === 'NO_PATCH' ) {
                // console.log(error);

                return;
            }

            this.core.logger.error(`[SUB][PATCH] Error: ${error.message}`);
        }
    }

    send = async (): Promise<void> => {
        this.sendPatch('patch');
        this.sendPatch('pts');
    }
}