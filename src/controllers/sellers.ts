import { Db, Collection } from 'mongodb';

interface OrderItem {
    name: string;
    link: string;
    amount: number;
    prices: {
        crown: number;
        gold: number;
    }
}

type LifecycleState = [
    string,
    null | string,
    number
]; // [status, seller.discordID | null, date]

export declare interface Order {
    items: OrderItem[]
    conversion: number;
    discount: number;
    guild: string;
    buyer: {
        tag: string;
        ID: string;
    }
    seller: {
        userID: string;
        discordID: string;
    }
    status: string;
    lifecycle: LifecycleState[];

    // internal
    source: string;
    message: string;
    orderID: string;
}

export class SellersController {
    readonly collection: Collection<Order>;

    readonly COLLECTION_NAME = 'sellers';

    constructor(db: Db) {
        this.collection = db.collection<Order>(this.COLLECTION_NAME);
    }

    async get(): Promise<Order[]>
    async get(orderID: string): Promise<Order | null>
    async get(orderID?: string): Promise<Order | null | Order[]> {
        if(!orderID) {
            return await this.collection.find().toArray();
        }

        return this.collection.findOne({ orderID });
    }

    find(name: string): Promise<Order[]> {
        return this.collection.find<Order>({ $text: { $search: name } }, { projection: { _id: 0 } }).toArray();
    }

    async create(item: Order): Promise<Order> {
        await this.collection
            .updateOne({ orderID: item.orderID }, {
                $set: item
            }, { upsert: false });

        return item;
    }

    async pushState(orderID: string, state: LifecycleState): Promise<boolean> {
        await this.collection
            .updateOne(
                { orderID },
                {
                    $push: state
                }
            );

        return true;
    }

    async write(items: Order[]): Promise<boolean> {
        try {
            await this.collection.insertMany(items);

            return true;
        } catch (err) {
            return false;
        }
    }
}
