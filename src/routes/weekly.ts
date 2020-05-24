import { Route } from '../services/router';
import { types } from '../services/utils';

const DataSchema = types.object({
    eu: types.item(),
    na: types.item(),
});

const TranslationsSchema = types.strings(['title', 'provided']);

export default [
    {
        path: '/weekly',
        handler: 'weekly',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    data: DataSchema,
                    translations: TranslationsSchema
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/api/weekly',
        handler: 'apiWeekly',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    data: types.object({
                        eu: types.string,
                        na: types.string
                    })
                })
            }
        },
        version: '1.0.0'
    },
] as Route[];