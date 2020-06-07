import { Db, Collection } from 'mongodb';

import { CoreError } from '../services/core';
import { Maintenance } from '../subscriptions/status';

import { DropsController } from './drops';
import { StoreController } from './store';

export declare interface StatusItem {
    name: string;
    eu?: 'UP' | 'DOWN';
    na?: 'UP' | 'DOWN';
    ps_eu?: 'UP' | 'DOWN';
    ps_us?: 'UP' | 'DOWN';
    pts?: 'UP' | 'DOWN';
    xbox_eu?: 'UP' | 'DOWN';
    xbox_us?: 'UP' | 'DOWN';
    maintenance?: Maintenance;
}

export declare interface PatchInfo {
    name: string;
    title: Record<language, string>;
    description: Record<language, string>;
    link: Record<language, string>;
    image: string;
}

export declare type GoldenItem = {
    name: string;
    price: string;
    trait: string;
    canSell: boolean;
    hasTypes: boolean;
}

export declare interface GoldenInfo {
    name: string;
    link: string;
    date: string;
    items: GoldenItem[];
}

export declare type LuxuryItem = {
    name: {
        en: string;
        ru: string;
        fr: string;
        de: string;
        icon: string;
    };
    price: string;
    isNew: boolean;
}

export declare interface LuxuryInfo {
    name: string;
    link: string;
    date: string;
    items: LuxuryItem[];
    image: string;
}

export declare interface NewsInfo {
    name: string;
    title: string;
    link: string;
    image: string;
    description: string;
}

declare interface Weekly {
    ru: string;
    en: string;
}

export declare interface WeeklyInfo {
    name: string;
    eu: Weekly;
    na: Weekly;
}

type Result = StatusItem | PatchInfo | GoldenInfo | WeeklyInfo | LuxuryInfo;

export class InfoController {
    collection: Collection;
    drops: DropsController;
    store: StoreController;

    constructor(db: Db) {
        this.collection = db.collection('info');

        this.drops = new DropsController(db);
        this.store = new StoreController(db);
    }

    async get<T>(name: string): Promise<T> {
        try {
            const result = await this.collection
                .findOne<T>({ name }, { projection: { _id: 0, name: 0 } });

            if( !result ) {
                throw new CoreError( `Can't get info with the name ${name}` );
            }

            return result;
        }
        catch (err) {
            throw new CoreError(
                `An error ocured while trying to get info: ${err.message}`
            );
        }
    }

    async set(name: string, params: object): Promise<object> {
        try {
            await this.collection
                .updateOne({ name }, {
                    $set: { name, ...params }
                }, { upsert: true });

            return params;
        }
        catch (err) {
            const stringifiedParams = JSON.stringify(params);

            throw new CoreError(`An error ocured while trying to set info with params ${stringifiedParams}: ${err.message}`);
        }
    }
}