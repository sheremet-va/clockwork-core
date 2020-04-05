import imgurUploader from 'imgur-uploader';
import moment from 'moment-timezone';
import cheerio from 'cheerio';
import axios from 'axios';
import Jimp from 'jimp';

import * as Path from 'path';
import * as fs from 'fs';

import { Module } from './module';
import { LuxuryInfo, LuxuryItem } from '../controllers/info';

import { CoreError } from '../services/core';
import { Route } from '../services/router';

import { Category } from '../translation/translation';

const furnitureIcons = JSON.parse(
    fs.readFileSync(
        Path.resolve(__dirname, 'dependencies', 'furniture.json'), // TODO don't save "/esoui/art/icons/"
        'utf8'
    )
);

export default class Luxury extends Module {
    name = 'luxury';

    routes: Route[] = [
        { path: '/luxury', handler: 'get', method: 'GET' },
    ];

    constructor(core: Core) {
        super(core);
    }

    send = async ({ link, date }): Promise<void> => {
        const { data } = await this.core.request(link);

        const items = this.items(data as string);
        const translated = items.map(({ name, price, isNew }) => ({ name, price, isNew })); // core.translations.getFurniture( icon.item )

        const promises = items.map(item => {
            if (item.icon) {
                return this.downloadIcon(item.icon);
            }
        });

        const icons = await Promise.allSettled(promises).then(result =>
            result.map(icon => icon.status === 'fulfilled' && icon.value).filter(noFalse => noFalse)
        );

        const image = await this.drawImage(icons);

        await this.info.set('luxury', { items: translated, date, link, image });

        // TODO добавить языковые настройки
        const translations = this.core.translations.get('merchants/luxury') as Category;

        return this.notify('luxury', { translations, data: { items: translated, image, link, date }, });
    };

    get = async (): Promise<ReplyOptions> => {
        const now = moment().utc();

        if (now.day() !== 0 && now.day() !== 6) {
            throw new CoreError('UNEXPECTED_LUXURY_DATE');
        }

        const luxury = await this.info.get('luxury') as LuxuryInfo;

        const date = moment(luxury.date);

        if (
            !date.isSame(now, 'day') &&
            !date.isSame(now.subtract(1, 'd'), 'day')
        ) {
            throw new CoreError('DONT_HAVE_ITEMS_YET');
        }

        const translations = this.core.translate('merchants/luxury') as Category;

        return { translations, data: luxury };
    };

    items = (body: string): (LuxuryItem & { icon: string })[] => {
        const $ = cheerio.load(body);

        return $('.entry-content ul').first().children().map((i, el) => {
            const fullName = $(el).text().replace(/’/g, '\'').trim();

            if (!/([^\d]+)/.test(fullName) || fullName.includes('http')) {
                return 'URL';
            }

            const name = /(^[^\d]+)/.exec(fullName)[0].trim();
            const price = /([\d,g]{3,})/.exec(fullName)[0].trim();
            const isNew = fullName.search(/NEW/i) !== -1;
            const icon = furnitureIcons[name]
                ? furnitureIcons[name].replace('/esoui/art/icons/', '')
                : null;

            return { name, price, icon, isNew };
        }).get().filter((e: LuxuryItem & { icon: string } | 'URL') => e !== 'URL');
    };

    downloadIcon = async (icon: string): Promise<string> => {
        if (!icon) {
            return Promise.reject('No icon');
        }

        const url = 'http://esoicons.uesp.net/esoui/art/icons/' + icon;
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
        const iconsCount = icons.length > MAX_COUNT ? MAX_COUNT : icons.length;

        let i = 0;

        while (i < iconsCount) {
            const icon = icons[i];

            if (!icon) {
                i++;

                continue;
            }

            const { x, y } = coordinates[iconsCount][i];

            try {
                const iconBg = await Jimp.read(__dirname + '/images/bg.png');
                const iconWithoutBg = await Jimp.read(icon);

                const iconWithBg = iconBg.composite(iconWithoutBg, 4, 4); // Добавляет фон иконке

                wholeImage.composite(iconWithBg, x, y);
            } catch (err) {
                this.core.logger.error(`An errror occured while trying to add an icon "${icon}" on image: ${err.message}`);
            }

            fs.unlink(icon, () => this.core.logger.log(`File "${icon}" was deleted.`));

            i++;
        }

        await wholeImage.quality(90).writeAsync(fileName);

        const file = fs.readFileSync(fileName);
        const { link } = await imgurUploader(file)
            .catch(({ message }) => ({ link: this.core.media.luxury, message }));

        fs.unlink(fileName, () => this.core.logger.log(`File "${fileName}" was deleted.`));

        return link;
    };

}

