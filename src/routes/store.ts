import { Route } from '../services/router';

export default [
    {
        path: '/store',
        handler: 'find',
        method: 'GET',
        version: '1.0.0'
    },
    {
        path: '/store/update',
        handler: 'update',
        method: 'GET',
        version: '1.0.0'
    }
] as Route[];
