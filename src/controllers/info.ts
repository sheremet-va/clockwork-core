import { Db } from 'mongodb';

import { CoreError } from '../services/core';
import { Maintenance } from '../modules/status';

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
    maintence?: Maintenance;
}

export declare interface PatchInfo {
    name: string;
    title: string;
    description: string;
    link: string;
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
    name: string;
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
    #db: Db;
    drops: DropsController;
    store: StoreController;

    constructor(db: Db) {
        this.#db = db;

        this.drops = new DropsController(db);
        this.store = new StoreController(db);
    }

    async get(name: string): Promise<Result> {
        try {
            return this.#db.collection('info')
                .findOne({ name }, { projection: { _id: 0, name: 0 } });
        }
        catch (err) {
            throw new CoreError(
                `An error ocured while trying to get info: ${err.message}`
            );
        }
    }

    async set(name: string, params: object): Promise<object> {
        try {
            await this.#db.collection('info')
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