import { Route } from '../services/router';

export default [
    {
        path: '/logs/:type',
        handler: 'log',
        method: 'POST',
        version: '1.0.0'
    },
    {
        path: '/seht/logs/errors',
        handler: 'getErrors',
        method: 'GET',
        version: '1.0.0',
        rights: ['owner'],
        api: true
    },
    {
        path: '/seht/logs/commands',
        handler: 'getCommands',
        method: 'GET',
        version: '1.0.0',
        rights: ['owner'],
        api: true
    },
    {
        path: '/seht/logs/types',
        handler: 'getErrorTypes',
        method: 'GET',
        version: '1.0.0',
        rights: ['owner'],
        api: true
    }
] as Route[];