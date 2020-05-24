import { Module } from './module';

import { Item } from '../translation/translation';
import { DropItem } from '../controllers/drops';

import { CoreError } from '../services/core';

export declare type InfoTranslation =
    | 'info_any'
    | 'info_stream_team'
    | 'info_watch_stream'
    | 'info_watch_streamer'
    | 'info_watch_streamers';

export declare type SendingTranslation =
    | 'sending_every_day'
    | 'sending_one_day'
    | 'sending_after_stream';

export declare type WhereTranslation =
    | 'where_stream_team'
    | 'where_any'
    | 'where_streamer';

export declare interface DropInfo {
    endDate: number;
    startDate: number;
    image: string;
    info: InfoTranslation;
    sending: SendingTranslation;
    sendingDate: number;
    url: string;
    where: WhereTranslation;
}

export declare interface ApiDropItem {
    image: string | null;
    info: string;
    sending: string;
    url: string;
    where: string;
}

export declare interface CronSchema {
    translations: {
        title: Item;
        duration: Item;
        where: Item;
        when: Item;
        notice: Item;
        notice_description: Item;
    };
    data: {
        endDate: number;
        startDate: number;
        image: string;
        info: Item;
        sending: Item;
        sendingDate: number;
        url: string;
        where: Item;
    };
}

export default class Drops extends Module {
    name = 'drops';

    constructor(core: Core) {
        super(core);
    }

    async getDrops(): Promise<DropItem[]> {
        const now = new Date().valueOf();

        return this.core.info.drops.get(now);
    }

    async get({ settings: { language: lang, timezone } }: CoreRequest): Promise<ApiDropItem[]> {
        const drops = await this.getDrops();

        if (drops.length === 0) {
            throw new CoreError('NO_DROPS_INFO');
        }
        const description = this.core.translate(lang, 'drops', 'description');

        const formated = drops.map(drop => {
            const sending = this.core.dates.dropsSending(drop.sendingDate, lang, timezone);

            return {
                when: this.core.dates.drops(drop.startDate, drop.endDate, timezone)[lang],
                where: description[drop.where].render({ streamer: drop.streamer }),
                info: description[drop.info].render({ streamer: drop.streamer }),
                sending: description[drop.sending].render(sending),
                image: drop.image || null,
                url: drop.url
            };
        });

        return formated;
    }
}
