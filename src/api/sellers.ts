import Sellers from '../modules/sellers';
import { SellersController } from '../controllers/sellers';
import {CoreError} from '../services/core';

export default class ApiSellers extends Sellers {
    private sellers: SellersController;

    constructor(core: Core) {
        super(core);

        this.sellers = this.core.sellers;
    }

    createOrder = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { order } = request.body;

        await this.core.sellers.createOrder(order);

        return { data: { orderID: order.orderID } };
    }

    updateOrder = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { order, lifecycle } = request.body;

        await this.core.sellers.updateOrder(order, lifecycle);

        return { data: { orderID: order.orderID } };
    }

    updateOrderStatus = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { order, lifecycle } = request.body;

        await this.core.sellers.updateOrderState(order.orderID, lifecycle);

        return { data: { orderID: order.orderID } };
    }

    getOrderByID = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { orderID } = request.params;

        const order = await this.core.sellers.getOrder(orderID);

        return { data: order };
    }

    getOrdersByUserID = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { userID } = request.params;
        const query = request.query;

        const order = await this.core.sellers.getOrdersByUserID(userID, query);

        return { data: order };
    }

    getConfig = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { key } = request.params;
        const { path } = request.query;

        const config = await this.core.sellers.getConfig(key);

        if(path && path !== 'undefined' && typeof config === 'object' && config) {
            return { data: config[path] };
        }

        return { data: config };
    }

    setConfig = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { key } = request.params;
        const { path, value } = request.body;

        await this.core.sellers.setConfig(key, value, path);

        return {};
    }

    updateConfig = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { action, key } = request.params;
        const { value } = request.body;

        const config = await this.core.sellers.getConfig(key);

        if(!config || !Array.isArray(config) || !['remove', 'push'].includes(action)) {
            throw new CoreError(`Значения ${key} не найдено.`);
        }

        let result = [];

        if(action === 'remove') {
            result = config.filter(name => name !== value);
        }

        if(action === 'push') {
            config.push(value);

            result = config;
        }

        await this.core.sellers.setConfig(key, result);

        return {};
    }
}
