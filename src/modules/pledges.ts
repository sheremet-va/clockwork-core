import { Module } from './module';
import { CoreError } from '../services/core';

import { Table } from '../controllers/gameItems';

import moment from 'moment';

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

    readonly vendors = ['maj', 'glirion', 'urgarlag'];

    constructor(core: Core) {
        super(core);
    }

    getPledges(days = 0): Record<string, string> {
        if (isNaN(days) || days < 0 || days > 31) {
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
            /*  0 */ 'Cradle of Shadows',
            /*  1 */ 'Bloodroot Forge',
            /*  2 */ 'Falkreath Hold',
            /*  3 */ 'Fang Lair',
            /*  4 */ 'Scalecaller Peak',
            /*  5 */ 'Moon Hunter Keep',
            /*  6 */ 'March of Sacrifices',
            /*  7 */ 'Depths of Malatar',
            /*  8 */ 'Frostvault',
            /*  9 */ 'Moongrave Fane',
            /* 10 */ 'Lair of Maarselok',
            /* 11 */ 'Icereach',
            /* 12 */ 'Unhallowed Grave',
            /* 13 */ 'Stone Garden',
            /* 14 */ 'Castle Thorn',
            /* 15 */ 'Imperial City Prison',
            /* 16 */ 'Ruins of Mazzatun',
            /* 17 */ 'White-Gold Tower',
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

        return {
            maj: pledgesMaj[MajPledge],
            glirion: pledgesGlirion[GlirionPledge],
            urgarlag: pledgesUrgarlag[UrgarlagPledge]
        };

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
            'Blessed Crucible': 'The Troll King',
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
            'Spindleclutch II': 'Bloodspawn',
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
            'Unhallowed Grave': 'Kjalnar\'s Nightmare',
            'Stone Garden': 'Stone Husk',
            'Castle Thorn': 'Lady Thorn'
        };

        const name = pledge as keyof typeof masks;

        return name in masks ? masks[name] : name;
    }

    async translate(strings: Record<string, string>, lang: language, type: Table): Promise<Record<string, Record<language, string>>> {
        const promises = Object.entries(strings)
            .map(async ([trader, name]) => ({
                trader,
                name: await this.core.getItem('^' + name + '$', 'en', type) || { [lang]: name }
            }));

        const results = await Promise.allSettled(promises);

        return results.reduce((acc, result) => {
            if(result.status === 'rejected') {
                return acc;
            }

            const { trader, name } = result.value;

            const original = strings[trader];

            return {
                ...acc,
                [trader]: {
                    en: original,
                    [lang]: name[lang]
                }
            };
        }, {});
    }

    getMasks(pledges: Record<string, string>): Record<string, string> {
        return this.vendors.reduce((masks, trader) => {
            return { ...masks, [trader]: this.getMask(pledges[trader]) };
        }, {});
    }

    async get(
        { settings: { language: lang }, params }: CoreRequest
    ): Promise<{
            pledges: Record<string, Record<language, string>>;
            masks: Record<string, Record<language, string>>;
        }> {

        const days = parseInt((params).days);
        const pledges = this.getPledges(days);

        const masks = this.getMasks(pledges);

        return {
            pledges: await this.translate(pledges, lang, 'locations'),
            masks: await this.translate(masks, lang, 'sets')
        };
    }
}