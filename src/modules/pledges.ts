import { Module } from './module';
import { CoreError } from '../services/core';

import * as moment from 'moment';

import { Item } from '../translation/translation';
import { Route } from '../services/router';

// засунуть в info?
// const dungeons = {
//     names: [],
//     masks: [],
//     maj: [0, 1, 2],
//     glirion: [3, 4, 5],
//     urgarlag: [6, 7, 8]
// };

export default class Pledges extends Module {
    name = 'pledges';
    cron = '25 00 9 * * *';

    routes: Route[] = [
        { path: '/pledges/:days', handler: 'get', method: 'GET' },
    ];

    constructor(core: Core) {
        super(core);
    }

    getPledges(days = 0): { [k in language]: string }[] {
        if (days < 0 || days > 31) {
            throw new CoreError('INCORRECT_PLEDGES_DATE');
        }

        // TODO place into db
        const pledgesMaj = [
            /*  0 */ 'Wayrest Sewers II',
            /*  1 */ 'Fungal Grotto I',
            /*  2 */ 'The Banished Cells II',
            /*  3 */ 'Darkshade Caverns I',
            /*  4 */ 'Elden Hollow II',
            /*  5 */ 'Wayrest Sewers I',
            /*  6 */ 'Spindleclutch II',
            /*  7 */ 'The Banished Cells I',
            /*  8 */ 'Fungal Grotto II',
            /*  9 */ 'Spindleclutch I',
            /* 10 */ 'Darkshade Caverns II',
            /* 11 */ 'Elden Hollow I'
        ];

        const pledgesGlirion = [
            /*  0 */ 'Arx Corinium',
            /*  1 */ 'Selene\'s Web',
            /*  2 */ 'City of Ash II',
            /*  3 */ 'Crypt of Hearts I',
            /*  4 */ 'Volenfell',
            /*  5 */ 'Blessed Crucible',
            /*  6 */ 'Direfrost Keep',
            /*  7 */ 'Vaults of Madness',
            /*  8 */ 'Crypt of Hearts II',
            /*  9 */ 'City of Ash I',
            /* 10 */ 'Tempest Island',
            /* 11 */ 'Blackheart Haven'
        ];

        const pledgesUrgarlag = [
            /*  0 */ 'Unhallowed Grave',
            /*  1 */ 'Imperial City Prison',
            /*  2 */ 'Ruins of Mazzatun',
            /*  3 */ 'White-Gold Tower',
            /*  4 */ 'Cradle of Shadows',
            /*  5 */ 'Bloodroot Forge',
            /*  6 */ 'Falkreath Hold',
            /*  7 */ 'Fang Lair',
            /*  8 */ 'Scalecaller Peak',
            /*  9 */ 'Moon Hunter Keep',
            /* 10 */ 'March of Sacrifices',
            /* 11 */ 'Depths of Malatar',
            /* 12 */ 'Frostvault',
            /* 13 */ 'Moongrave Fane',
            /* 14 */ 'Lair of Maarselok',
            /* 15 */ 'Icereach'
        ];

        const knownDate = moment([2019, 2, 12]);
        const now = moment();

        const daysLeft = now.hours() < 9
            ? now.diff(knownDate, 'd') - 1
            : now.diff(knownDate, 'd');

        const trueDays = days + daysLeft;

        const MajPledge = trueDays % pledgesMaj.length;
        const GlirionPledge = trueDays % pledgesGlirion.length;
        const UrgarlagPledge = trueDays % pledgesUrgarlag.length;

        return [
            this.getTranslations('pledges', pledgesMaj[MajPledge]),
            this.getTranslations('pledges', pledgesGlirion[GlirionPledge]),
            this.getTranslations('pledges', pledgesUrgarlag[UrgarlagPledge])
        ];

    }

    getMask(pledge: string): string {
        const masks = {
            'Fungal Grotto I': 'Kra\'gh',
            'Spindleclutch I': 'Swarm Mother',
            'The Banished Cells I': 'Shadowrend',
            'Darkshade Caverns I': 'Sentinel of Rkugamz',
            'Wayrest Sewers I': 'Slimecraw',
            'Elden Hollow I': 'Chokethorn',
            'Arx Corinium': 'Sellistrix',
            'Crypt of Hearts I': 'Ilambris',
            'City of Ash I': 'Infernal Guardian',
            'Direfrost Keep': 'Iceheart',
            'Volenfell': 'Tremorscale',
            'Tempest Island': 'Stormfist',
            'Blessed Crucible': 'Troll King',
            'Blackheart Haven': 'Pirate Skeleton',
            'Selene\'s Web': 'Selene',
            'Vaults of Madness': 'Grothdarr',
            'Fungal Grotto II': 'Spawn of Mephala',
            'Wayrest Sewers II': 'Scourge Harvester',
            'White-Gold Tower': 'Molag Kena',
            'Imperial City Prison': 'Lord Warden',
            'Ruins of Mazzatun': 'Mighty Chudan',
            'Cradle of Shadows': 'Velidreth',
            'The Banished Cells II': 'Maw of the Infernal',
            'Elden Hollow II': 'Nightflame',
            'Darkshade Caverns II': 'Engine Guardian',
            'Spindleclutch II': 'Blood Spawn',
            'Crypt of Hearts II': 'Nerien\'eth',
            'City of Ash II': 'Valkyn Skoria',
            'Bloodroot Forge': 'Earthgore',
            'Falkreath Hold': 'Domihaus',
            'Scalecaller Peak': 'Zaan',
            'Fang Lair': 'Thurvokun',
            'Moon Hunter Keep': 'Vykosa',
            'March of Sacrifices': 'Balorgh',
            'Frostvault': 'Stonekeeper',
            'Depths of Malatar': 'Symphony of Blades',
            'Moongrave Fane': 'Grundwulf',
            'Lair of Maarselok': 'Maarselok',
            'Icereach': 'Mother Ciannait',
            'Unhallowed Grave': 'Kjalnar\'s Nightmare'
        };

        const name = pledge as keyof typeof masks;

        return name in masks ? masks[name] : name;
    }

    getTranslations(subcat: string, dungeon: string): { [k in language]: string } {
        const matches = /( I| II)$/.exec(dungeon);
        const level = matches ? matches[0] : '';

        const instance = dungeon.replace(level, '');
        const translated = this.core.translations.get('instances', subcat, instance);

        const instances = {} as Record<string, Record<language, string>>;

        return Object.entries(translated).reduce((instances, [langCode, inst]) => {
            const newName = level ? inst + level : inst;

            return {
                ...instances,
                [dungeon]: {
                    ...instances[dungeon],
                    [langCode]: newName
                }
            };
        }, instances)[dungeon];
    }

    translate(strings: Item[], lang: language = 'en'): { [key: string]: string }[] {
        return strings.map(subject => ({
            en: subject.en,
            [lang]: subject[lang]
        }));
    }

    get = async ({ settings: { language: lang }, params }: CoreRequest): Promise<ReplyOptions> => {
        const days = parseInt(params.days);
        const pledges = this.getPledges(days);

        const masks = pledges.map(pledge =>
            this.getTranslations('masks', this.getMask(pledge.en)));

        const translations = this.core.translate(lang, {
            after_days: {
                days: this.core.dates.pluralize(days, lang)
            }
        }, 'commands', 'pledges');

        const options = {
            translations,
            data: {
                pledges: this.translate(pledges, lang),
                masks: this.translate(masks, lang)
            }
        };

        if (days > 0) {
            const { day, date } = this.core.dates.pledges(days, lang);

            options.translations.day = day;
            options.translations.date = date;
        }

        return options;
    };

    send = async (): Promise<void> => {
        const TOMORROW = 1;

        const today = this.getPledges();
        const tomorrow = this.getPledges(TOMORROW);

        const todayMasks = today.map(pledge =>
            this.getTranslations('masks', this.getMask(pledge.en)));
        const tomorrowMasks = today.map(pledge =>
            this.getTranslations('masks', this.getMask(pledge.en)));

        const translations = this.core.translations.get('commands', 'pledges');

        return this.notify('pledges', {
            translations,
            data: {
                today: { pledges: today, masks: todayMasks },
                tomorrow: { pledges: tomorrow, masks: tomorrowMasks }
            }
        });
    };
}