import { Db, Collection } from 'mongodb';

interface OrderItem {
    name: string;
    link: string;
    image: string;
    crown_price: number;
    gold_price: number;
    amount: number;
}

type Lifecycle = [
    string,
    string,
    number
]; // [status, seller.discordID, date]

export type Order = {
    userID: string;
    products: OrderItem[];
    conversion: number;
    discount: number;
    crown_price: string;
    gold_price: string;
    name: string;
    guild: string;
    message: string;
    user: string;
    status: string;
    seller: null | string;
    sellerID: null | string;
    source: string;
    lifecycle: Lifecycle[];
    orderID: string;
}

export class SellersController {
    readonly orders: Collection<Order>;
    readonly config: Collection;

    readonly COLLECTION_ORDERS_NAME = 'sellers_orders';
    readonly COLLECTION_CONFIG_NAME = 'sellers_config';

    constructor(db: Db) {
        this.orders = db.collection<Order>(this.COLLECTION_ORDERS_NAME);
        this.config = db.collection(this.COLLECTION_CONFIG_NAME);
    }

    async getConfig(key: string) {
        const config = await this.config.findOne({ key });

        return config.value;
    }

    setConfig(key: string, value: unknown, path?: string) {
        const setValue = !path ? { value } : {
            ['value.' + path]: value
        };

        return this.config.updateOne({ key }, { $set: setValue });
    }

    async getOrder(): Promise<Order[]>
    async getOrder(orderID: string): Promise<Order | null>
    async getOrder(orderID?: string): Promise<Order | null | Order[]> {
        if(!orderID) {
            return await this.orders.find().toArray();
        }

        return this.orders.findOne({ orderID });
    }

    async getOrdersByUserID(userID: string, filter?: { status: string }): Promise<Order[]> {
        const filters: Record<string, string> = {};

        if(filter && filter.status) {
            filters.status = filter.status;
        }

        return this.orders.find({ userID, ...filters }).toArray();
    }

    // find(name: string): Promise<Order[]> {
    //     return this.orders.find<Order>({ $text: { $search: name } }, { projection: { _id: 0 } }).toArray();
    // }

    async createOrder(item: Order): Promise<Order> {
        await this.orders.insertOne(item);

        return item;
    }

    async updateOrder(item: Partial<Order> & { orderID: string }, state: Lifecycle): Promise<Order> {
        const order = await this.getOrder(item.orderID);

        if(!order) {
            throw new Error(`Заказа с ID ${item.orderID} не существует.`);
        }

        await this.orders
            .updateOne(
                { orderID: item.orderID },
                {
                    $set: { ...item, status: state[0] },
                    $push: { lifecycle: state }
                },
                { upsert: true });

        return order;
    }

    async updateOrderState(orderID: string, state: Lifecycle): Promise<boolean> {
        await this.orders
            .updateOne(
                { orderID },
                {
                    $set: { status: state[0] },
                    $push: { lifecycle: state }
                }
            );

        return true;
    }

    async bulkAddOrders(items: Order[]): Promise<boolean> {
        try {
            await this.orders.insertMany(items);

            return true;
        } catch (err) {
            return false;
        }
    }
}
