import { Route } from '../services/router';

export default [
    {
        path: '/translations/:type/:category/:tag',
        handler: 'get',
        method: 'GET',
        version: '1.0.0'
    },
    {
        path: '/translations/:type/:category',
        handler: 'get',
        method: 'GET',
        version: '1.0.0'
    },
] as Route[];