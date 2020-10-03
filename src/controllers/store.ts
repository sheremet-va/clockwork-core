import { Db, Collection } from 'mongodb';
import { CoreError } from '../services/core';

export declare interface StoreItem {
    category: string;
    link: string;
    image: string;
    price: number;
    en: string;
    ru: string;
    storeID: string;
    active: boolean;
    currency: string;
}

export class StoreController {
    collection: Collection<StoreItem>;

    constructor(db: Db) {
        this.collection = db.collection<StoreItem>('store');
    }

    async get(): Promise<StoreItem[]>
    async get(ID: string): Promise<StoreItem | null>
    async get(ID?: string): Promise<StoreItem | null | StoreItem[]> {
        if(!ID) {
            return await this.collection.find().toArray();
        }

        return this.collection.find({ ID }).toArray();
    }

    find(name: string): Promise<StoreItem[]> {
        return this.collection.find<StoreItem>({ $text: { $search: name } }, { projection: { _id: 0 } }).toArray();
    }

    getByCategory(category: string): Promise<StoreItem[]> {
        return this.collection.find<StoreItem>({ category }, { projection: { _id: 0 } }).toArray();
    }

    getCategories(): Promise<string[]> {
        return  this.collection.distinct('category');
    }

    async set(item: StoreItem): Promise<StoreItem> {
        try {
            await this.collection
                .updateOne({ storeID: item.storeID, en: item.en }, {
                    $set: item
                }, { upsert: true });

            return item;
        }
        catch (err) {
            const params = JSON.stringify(item);

            throw new CoreError(
                `An error ocured while trying to set info with params ${params}: ${err.message}`
            );
        }
    }

    async write(items: StoreItem[]): Promise<boolean> {
        try {
            await this.collection.insertMany(items);

            return true;
        } catch (err) {
            return false;
        }
    }

    async deactivate(IDs: string[]) {
        try {
            await this.collection.updateMany({ storeID: { $in: IDs } }, { $set: { active: false } });
        } catch (err) {
            throw new CoreError(`An error occured while deactivating ${IDs.join(', ')}: ${err.message}`);
        }
    }

    async remove(IDs: string[]) {
        await this.collection.deleteMany({ storeID: { $in: IDs } });
    }
}
