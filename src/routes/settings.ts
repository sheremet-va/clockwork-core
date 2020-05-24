import { Route } from '../services/router';
import { types } from '../services/utils';

const DataSchema = types.object({
    settings: types.settings(),
    subscriptions: types.subscriptions(),
    languages: types.array(types.string)
});

const TranslationsSchema = types.strings(['success', 'ru', 'en']);

export default [
    {
        path: '/user',
        handler: 'get',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({ data: DataSchema })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/settings',
        handler: 'set',
        method: 'POST',
        schema: {
            body: types.object({
                type: types.string,
                value: types.string
            }),
            response: {
                '2xx': types.object({ translations: TranslationsSchema })
            }
        },
        version: '1.0.0'
    },
] as Route[];