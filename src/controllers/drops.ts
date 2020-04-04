import { Db } from 'mongodb';

import { CoreError } from '../services/core';

export declare interface DropItem {
    startDate: number;
    endDate: number;
    where: string;
    url: string;
    streamer: string;
    info: string;
    sending: string;
    sendingDate: number;
    image: string;
}

export class DropsController {
    #db: Db;

    constructor(db: Db) {
        this.#db = db;
    }

    async get(now: number): Promise<DropItem[]> {
        try {
            return this.#db.collection('drops')
                .find({ endDate: { $gte: now } }, { projection: { _id: 0 } })
                .toArray();
        }
        catch (err) {
            throw new CoreError(`An error ocured while trying to get drops: ${err.message}`);
        }
    }

    async set(params: DropItem): Promise<DropItem> {
        try {
            await this.#db.collection('drops')
                .updateOne({
                    startDate: params.startDate,
                    endDate: params.endDate
                }, { $set: params }, { upsert: true });

            return params;
        }
        catch (err) {
            throw new CoreError(
                `An error ocured while trying to set drops with params ${JSON.stringify(params)}: ${err.message}`
            );
        }
    }

    async remove(startDate: number, endDate: number): Promise<{ startDate: number; endDate: number }> {
        try {
            await this.#db.collection('drops')
                .deleteOne({
                    startDate,
                    endDate
                });

            return ({ startDate, endDate });
        }
        catch (err) {
            throw new CoreError(
                `An error ocured while trying to remove drops: ${err.message}`
            );
        }
    }
}