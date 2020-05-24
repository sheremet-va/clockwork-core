import { Db } from 'mongodb';

import { CoreError } from '../services/core';

export declare interface GameItem {
    en: string;
    ru: string;
    de: string;
    fr: string;
}

export declare type Table = 'sets' | 'locations' | 'items'

export class GameItemsController {
    #db: Db;

    constructor(db: Db) {
        this.#db = db;
    }

    async get<T=GameItem>(name: string, by: string, table: Table): Promise<T | null> {
        const regExpName = new RegExp(name.trim().toLowerCase(), 'i');

        try {
            return await this.#db.collection(table)
                .findOne(
                    {
                        [by]: { $regex: regExpName }
                    },
                    { projection: { _id: 0 } }
                ) as T;
        }
        catch (err) {
            throw new CoreError(`An error ocured while trying to get a ${name} (${by}) game item: ${err.message}`);
        }
    }
}