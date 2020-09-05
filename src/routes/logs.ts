import { Route } from '../services/router';

export default [
    {
        path: '/logs/:type',
        handler: 'log',
        method: 'POST',
        version: '1.0.0'
    },
    {
        path: '/api/logs/errors',
        handler: 'getErrors',
        method: 'GET',
        version: '1.0.0',
        api: true
    },
    {
        path: '/api/logs/types',
        handler: 'getErrorTypes',
        method: 'GET',
        version: '1.0.0',
        api: true
    }
] as Route[];