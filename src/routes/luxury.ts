import { Route } from '../services/router';
import { types } from '../services/utils';

const LuxuryItem = types.object({
    name: types.string,
    price: types.string,
    isNew: types.boolean
});

const DataSchema = types.object({
    link: types.string,
    date: types.string,
    image: types.string,
    items: types.array(LuxuryItem)
});

const TranslationsSchema = types.strings([
    'title',
    'provided'
]);

export default [
    {
        path: '/luxury',
        handler: 'luxury',
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
        path: '/api/luxury',
        handler: 'apiLuxury',
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