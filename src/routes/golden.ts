import { Route } from '../services/router';
import { types } from '../services/utils';

const GoldenItem = types.object({
    name: types.object({
        en: types.string,
        ru: types.string
    }),
    price: types.object({
        gold: types.number,
        ap: types.number
    }),
    trait: types.array(types.item()),
    canSell: types.boolean,
    hasTypes: types.boolean
});

const DataSchema = types.object({
    link: types.string,
    date: types.string,
    items: types.array(GoldenItem)
});

const TranslationsSchema = types.strings([
    'title',
    'provided',
    'can_sell',
    'has_types'
]);

export default [
    {
        path: '/golden',
        handler: 'golden',
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
        path: '/api/golden',
        handler: 'apiGolden',
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