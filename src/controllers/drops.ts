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

    async set<Params extends DropItem>(params: Params): Promise<DropItem> {
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

    async remove<Start extends number, End extends number>(
        startDate: Start,
        endDate: End
    ): Promise<{ startDate: Start; endDate: End }> {
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