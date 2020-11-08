import { Route } from '../services/router';

export default [
    {
        path: '/store/orders',
        handler: 'createOrder',
        method: 'PUT',
        api: true,
        version: '1.0.0'
    },
    {
        path: '/store/orders',
        handler: 'updateOrder',
        method: 'POST',
        api: true,
        version: '1.0.0'
    },
    {
        path: '/store/orders/status',
        handler: 'updateOrderStatus',
        method: 'POST',
        api: true,
        version: '1.0.0'
    },
    {
        path: '/store/orders/:orderID',
        handler: 'getOrderByID',
        method: 'GET',
        api: true,
        version: '1.0.0'
    },
    {
        path: '/store/orders/user/:userID',
        handler: 'getOrdersByUserID',
        method: 'GET',
        api: true,
        version: '1.0.0'
    },
    {
        path: '/store/config/:key',
        handler: 'getConfig',
        method: 'GET',
        api: true,
        version: '1.0.0'
    },
    {
        path: '/store/config/:key',
        handler: 'setConfig',
        method: 'POST',
        api: true,
        version: '1.0.0'
    },
    {
        path: '/store/config/:action/:key',
        handler: 'updateConfig',
        method: 'POST',
        api: true,
        version: '1.0.0'
    },
] as Route[];
