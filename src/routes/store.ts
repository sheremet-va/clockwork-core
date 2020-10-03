import { Route } from '../services/router';

export default [
    {
        path: '/store',
        handler: 'find',
        method: 'GET',
        version: '1.0.0'
    },
    {
        path: '/seht/store/category/:category',
        handler: 'getByCategory',
        method: 'GET',
        version: '1.0.0',
        rights: ['owner', 'managers'],
        api: true
    },
    {
        path: '/seht/store/categories',
        handler: 'getCategories',
        method: 'GET',
        version: '1.0.0',
        rights: ['owner', 'managers'],
        api: true
    },
    {
        path: '/store/update',
        handler: 'update',
        method: 'POST',
        version: '1.0.0'
    },
    {
        path: '/seht/store/update',
        handler: 'update',
        method: 'POST',
        version: '1.0.0',
        rights: ['owner', 'managers'],
        api: true
    }
] as Route[];
