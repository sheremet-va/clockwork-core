import { Route } from '../services/router';
import { types } from '../services/utils';

const DataSchema = types.strings([
    'title',
    'link',
    'description',
    'image'
]);

const TranslationsSchema = types.strings(['title']);

export default [
    {
        path: '/patch-notes',
        handler: 'patch',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    translations: TranslationsSchema,
                    data: DataSchema,
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/api/patch-notes',
        handler: 'patch',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({ data: DataSchema })
            }
        },
        api: true,
        version: '1.0.0'
    },
    {
        path: '/patch-pts',
        handler: 'pts',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    translations: TranslationsSchema,
                    data: DataSchema,
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/api/patch-pts',
        handler: 'pts',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({ data: DataSchema })
            }
        },
        api: true,
        version: '1.0.0'
    },
] as Route[];