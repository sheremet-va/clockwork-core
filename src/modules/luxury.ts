import axios from 'axios';

import imgurUploader from 'imgur-uploader';
import moment from 'moment-timezone';
import * as cheerio from 'cheerio';
import * as Jimp from 'jimp';
import * as Path from 'path';
import * as fs from 'fs';

import { Module } from './module';
import { LuxuryInfo, LuxuryItem } from '../controllers/info';

import { CoreError } from '../services/core';
import { GameItem } from '../controllers/gameItems';

type Item = {
    link: string;
    date: string;
    type: 'luxury' | 'golden';
}

type WebLuxuryItem = { name: string; isNew: boolean; price: string };

export default class Luxury extends Module {
    name = 'luxury';

    constructor(core: Core) {
        super(core);
    }

    send = async ({ link, date }: Item): Promise<void> => {
        const { data } = await this.core.request(link);

        const items = await this.items(data as string);
        const translatedPromises = items.map(async ({ name, price, isNew }) => ({
            name: await this.core.getItem<GameItem & { icon: string }>(name, 'en', 'items') || { en: name },
            price,
            isNew
        }));

        const translated = await Promise.allSettled(translatedPromises).then(result => {
            return result.filter(
                (item): item is PromiseFulfilledResult<LuxuryItem> => item.status === 'fulfilled'
            )
                .map( result => result.value );
        });

        const promises = translated.map(item => {
            if (item.name.icon) {
                return this.downloadIcon(item.name.icon);
            }
        });

        const icons = await Promise.allSettled(promises).then(result => {
            return result.map(icon => {
                if( icon.status === 'fulfilled' ) {
                    return icon.value;
                }

                return false;
            }).filter(value => typeof value === 'string');
        }) as string[];

        const image = await this.drawImage(icons);

        await this.info.set('luxury', { items: translated, date, link, image });

        const translations = this.core.translations.get('merchants', 'luxury');

        return this.notify('luxury', { translations, data: { items: translated, image, link, date }, });
    };

    async get(): Promise<LuxuryInfo> {
        const now = moment().utc();

        if (now.day() !== 0 && now.day() !== 6) {
            throw new CoreError('UNEXPECTED_LUXURY_DATE');
        }

        const luxury = await this.info.get<LuxuryInfo>('luxury');

        const date = moment(luxury.date);

        if (
            !date.isSame(now, 'day') &&
            !date.isSame(now.subtract(1, 'd'), 'day')
        ) {
            throw new CoreError('DONT_HAVE_ITEMS_YET');
        }

        return luxury;
    }

    log = (
        fullName: string,
        name: RegExpExecArray | null,
        price: RegExpExecArray | null
    ): void => {
        if(!name) {
            this.core.logger.error(
                'ParsingError',
                `Name from ${fullName} wasn't found.`
            );
        }

        if(!price) {
            this.core.logger.error(
                'ParsingError',
                `Price from ${fullName} wasn't found.`
            );
        }
    }

    items = async (body: string): Promise<WebLuxuryItem[]> => {
        const $ = cheerio.load(body);

        return ($('.entry-content > ul').first().children().map((i, el) => {
            const fullName = $(el).text().replace(/’/g, '\'').trim();

            console.log(fullName);

            if (!/([^\d]+)/.test(fullName) || fullName.includes('http')) {
                return 'URL';
            }

            const name_match = /(^[^\d]+)/.exec(fullName);
            const price_match = /([\d,g]{3,})/.exec(fullName);

            const name = ( name_match || fullName )[0].trim();
            const price = ( price_match || '' )[0].trim();

            this.log( fullName, name_match, price_match );

            const isNew = Boolean($(el).find('strong').text());

            return {
                name,
                price: Number(price.replace(/g|,/g, '')),
                isNew
            };
        })
            .get() as (WebLuxuryItem | 'URL')[])
            .filter((e): e is WebLuxuryItem => e !== 'URL');
    };

    downloadIcon = async (icon: string): Promise<string> => {
        if (!icon) {
            return Promise.reject('No icon');
        }

        const url = 'http://esoicons.uesp.net/esoui/art/icons/' + icon + '.png';
        const path = Path.resolve(__dirname, '../temp', icon);
        const writer = fs.createWriteStream(path);

        try {
            // core.request
            const res = await axios({
                responseType: 'stream',
                method: 'get',
                url
            });

            res.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(path));
                writer.on('error', reject);
            });
        } catch (err) {
            return Promise.reject(err.message);
        }
    };

    drawImage = async (icons: string[]): Promise<string> => {
        if (icons.length === 0) {
            return this.core.media.luxury;
        }

        const MAX_COUNT = 7;

        const fileName = Path.resolve(__dirname, '../temp', 'luxury.jpg');
        const coordinates = [
            null,
            [{ x: 70, y: 70 }],
            [{ x: 12, y: 87 }, { x: 87, y: 87 }],
            [{ x: 22, y: 22 }, { x: 102, y: 22 }, { x: 22, y: 102 }],
            [{ x: 20, y: 22 }, { x: 102, y: 22 }, { x: 22, y: 102 }, { x: 102, y: 102 }],
            [{ x: 12, y: 12 }, { x: 87, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 }],
            [{ x: 12, y: 12 }, { x: 87, y: 12 }, { x: 162, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 }],
            [{ x: 12, y: 12 }, { x: 87, y: 12 }, { x: 162, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 }, { x: 87, y: 162 }]
        ];

        const wholeImage = await Jimp.read(__dirname + '/images/luxury.jpg');
        const iconsCount = ( icons.length > MAX_COUNT ? MAX_COUNT : icons.length ) as 1 | 2;

        const positions = coordinates[iconsCount];

        if( !positions ) {
            return this.core.media.luxury;
        }

        let i = 0;

        while (i < iconsCount) {
            const icon = icons[i];

            if (!icon) {
                i++;

                continue;
            }

            const { x, y } = positions[i];

            try {
                const iconBg = await Jimp.read(__dirname + '/images/bg.png');
                const iconWithoutBg = await Jimp.read(icon);

                const iconWithBg = iconBg.composite(iconWithoutBg, 4, 4); // Добавляет фон иконке

                wholeImage.composite(iconWithBg, x, y);
            } catch (err) {
                this.core.logger.error(
                    'DependencyError',
                    `An errror occured while trying to add an icon "${icon}" on image: ${err.message}`
                );
            }

            fs.unlink(icon, () => this.core.logger.log(`File "${icon}" was deleted.`));

            i++;
        }

        await wholeImage.quality(90).writeAsync(fileName);

        const file = fs.readFileSync(fileName);
        const { link } = await imgurUploader(file)
            .catch(({ message }: { message: string }) => ({ link: this.core.media.luxury, message }));

        fs.unlink(fileName, () => this.core.logger.log(`File "${fileName}" was deleted.`));

        return link;
    };

}

