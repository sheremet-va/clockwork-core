import { Route } from '../services/router';
import { types } from '../services/utils';

const DataSchema = types.object({
    pledges: types.array(types.item()),
    masks: types.array(types.item()),
});

const TranslationsSchema = types.strings([
    'today',
    'tomorrow',
    'after_days',
    'mask',
    'maj',
    'glirion',
    'urgarlag',
    'day',
    'date'
]);

export default [
    {
        path: '/pledges/:days',
        handler: 'pledges',
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
        path: '/api/pledges/:days',
        handler: 'apiPledges',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    data: types.object({
                        pledges: types.array(types.string),
                        masks: types.array(types.string)
                    })
                })
            }
        },
        api: true,
        version: '1.0.0'
    },
] as Route[];