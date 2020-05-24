import { Db, Collection } from 'mongodb';

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
    collection: Collection<DropItem>;

    constructor(db: Db) {
        this.collection = db.collection<DropItem>('drops');
    }

    async get(now: number): Promise<DropItem[]> {
        try {
            return this.collection
                .find({ endDate: { $gte: now } }, { projection: { _id: 0 } })
                .toArray();
        }
        catch (err) {
            throw new CoreError(`An error ocured while trying to get drops: ${err.message}`);
        }
    }

    async set<Params extends DropItem>(params: Params): Promise<DropItem> {
        try {
            await this.collection
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
            await this.collection
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