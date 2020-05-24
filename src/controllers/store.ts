import { Db, Collection } from 'mongodb';
import { CoreError } from '../services/core';

export declare interface StoreItem {
    storeId: number;
    name: string;
    price: string;
    active: boolean;
}

export class StoreController {
    collection: Collection<StoreItem>;

    constructor(db: Db) {
        this.collection = db.collection('store');
    }

    async set({
        storeId = 0,
        name = '',
        price = '',
        active = true
    }: StoreItem): Promise<StoreItem> {
        try {
            await this.collection
                .updateOne({ storeId }, {
                    $set: {
                        storeId,
                        name,
                        price,
                        active
                    }
                }, { upsert: true });

            return ({
                storeId,
                name,
                price,
                active
            });
        }
        catch (err) {
            const params = JSON.stringify({
                storeId,
                name,
                price,
                active
            });

            throw new CoreError(
                `An error ocured while trying to set info with params ${params}: ${err.message}`
            );
        }
    }
}
