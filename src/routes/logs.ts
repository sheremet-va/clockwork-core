import { Route } from '../services/router';

export default [
    {
        path: '/logs/:type',
        handler: 'log',
        method: 'POST',
        version: '1.0.0'
    }
] as Route[];