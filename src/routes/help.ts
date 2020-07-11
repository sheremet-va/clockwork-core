import { Route } from '../services/router';

export default [
    {
        path: '/help',
        handler: 'get',
        method: 'GET',
        version: '1.0.0'
    }
] as Route[];