import { Module } from './module';

import * as cheerio from 'cheerio';
import { StoreItem } from '../controllers/store';
import axios from 'axios';
import {TranslationsApiResult} from '../api/translate';

const ESO_URL = 'https://www.elderscrollsonline.com';

export default class Store extends Module {
    name = 'store';

    constructor(core: Core) {
        super(core);
    }

    start = async (): Promise<{
        removed: number;
        added: number;
        deactivated: number;
    }> => {
        this.core.logger.service('Crown Store `work` service started.');

        const { data } = await this.request(ESO_URL + '/en-us/crownstore');
        const storeItems = await this.core.store.get();

        const $ = cheerio.load(data as string);

        const categories = $('ul.accordion-body a').map((_, node) => {
            const clean = (value: string) => value.replace(/\(\d+\)/g, '').trim();

            const category = clean($(node.parentNode.parentNode.prev.prev).text());
            const link = node.attribs.href;
            const subcategory = clean($(node).text());

            if(subcategory === 'All' && category !== 'Featured') {
                return { category, link };
            }

            return false;
        }).get().filter(Boolean);

        const promises = categories.map(async(category) => {
            const { data } = await this.request(ESO_URL + category.link);

            const $ = cheerio.load(data as string);

            const haveIDs: string[] = [];

            const itemsPromises = $('.news-snip').map(async(_, node) => {
                const $node = $(node);

                const link = $node.find('a').attr('href') || '';
                const image = $node.find('.slot > img').attr('data-lazy-src');
                const price = parseFloat($node.find('span.bright').first().text().trim().replace(/,/g, '')) || 0;
                const name = $node.find('.crown-title').text();
                const matchID = /item\/(\d+)/.exec(link) || [null, '0'];
                const storeID = `${matchID[1]}`;
                const currencySrc = $node.find('.icon.crown-details').attr('src');
                const currency = currencySrc && currencySrc.includes('gems') ? 'gems' : 'crowns';

                const have = storeItems.find(item => {
                    return item.storeID == storeID && item.price === price;
                });

                if(have || haveIDs.includes(storeID)) {
                    return false;
                }

                haveIDs.push(storeID);

                const ruName = (await this.getItem(name, category.category)) || name;

                return {
                    category: category.category,
                    link,
                    image,
                    price,
                    en: name,
                    ru: ruName,
                    storeID,
                    currency,
                    active: true
                };
            }).get();

            const items = (await Promise.all(itemsPromises)).filter(Boolean);

            return { ...category, items };
        });

        return Promise.all(promises).then(async res => {
            const items = res.map(({ items }) => items).flat() as StoreItem[];

            const oldItems = items.filter(item => {
                return storeItems.some(({ en }) => en === item.en);
            }).map(({ storeID }) => storeID);

            this.core.logger.log(oldItems.length + ' Store Items were removed from db: ' + oldItems.join(', '));

            await this.core.store.remove(oldItems);

            if(items.length) {
                const success = await this.core.store.write(items);

                if(!success) {
                    this.core.logger.error('CoreInternalError', 'Couldn\'t write store items to Mongodb.');
                } else {
                    this.core.logger.log(items.length + ' Store Items successfully added to db: ' + items.map(({ ru }) => ru).join(', '));
                }
            }

            const deactivated = storeItems.filter(item => {
                return !items.some(({ en }) => en === item.en);
            }).map(({ en }) => en);

            await this.core.store.deactivate(deactivated);

            return {
                removed: oldItems.length,
                added: items.length,
                deactivated: deactivated.length
            };
        });
    }

    getTableByCategory(category: string) {
        switch (category) {
            case 'DLC':
            case 'Non-Combat Pets':
            case 'Style Parlor':
            case 'Mounts':
                return ['Коллекционный предмет'];
            case 'Houses':
                return ['Локация'];
            case 'Crafting':
            case 'Furniture':
                return ['Предмет', 'Коллекционный предмет'];
            default:
                return ['Предмет', 'Коллекционный предмет', 'Локация'];
        }
    }

    async getItem(origName: string, category: string): Promise<string> {
        switch (origName) {
            case 'Thief':
                return 'Вор';
            case 'Murkmire':
                return 'Мрачные Трясины';
            case 'Orsinium':
                return 'Орсиниум';
            default:
                break;
        }

        const [name, count] = origName.split('(');

        const encoded = encodeURI(name.trim())
            .replace('&', '%26')
            .replace('#', '%23')
            .replace('#', '%24');

        const apiUrl = 'http://ruesoportal.elderscrolls.net/ESOBase/searchservlet/?searchtext=' + encoded;

        const { data } = await axios.get<string>(apiUrl);

        const result = JSON.parse(data.replace('parseResponse(', '').replace(');', '')) as TranslationsApiResult;

        const tables = this.getTableByCategory(category);

        const entry = result.find(({ tableName }) => tables.includes(tableName));

        return entry ? entry.textRuOff + (count ? (' (' + count) : '') : origName;
    }

    request(url: string) {
        const date = Math.round(new Date().valueOf() / 1000);

        return this.core.request({
            url,
            method: 'get',
            headers: {
                Cookie: `platform=ps4; accepts_cookies=true; block-cookies=no; age_gate=-2208988800%26${date}; country=United+States`
            }
        });
    }
}
