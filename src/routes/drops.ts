import { Route } from '../services/router';
import { types } from '../services/utils';

const DropItem = types.strings([
    'when',
    'where',
    'info',
    'sending',
    'image',
    'url'
]);

const DataSchema = types.array(DropItem);

const TranslationsSchema = types.strings([
    'notice_title',
    'notice_description',
    'title_closest'
]);

export default [
    {
        path: '/drops/translate/when',
        handler: 'when',
        method: 'GET',
        schema: {
            querystring: {
                start: types.number,
                end: types.number
            },
            response: {
                '2xx': types.object({
                    translations: types.object({
                        en: types.string,
                        ru: types.string
                    })
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/drops/render/sending',
        handler: 'sending',
        method: 'GET',
        schema: {
            querystring: { start: types.number },
            response: {
                '2xx': types.object({
                    data: types.object({
                        time: types.string,
                        date: types.string
                    })
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/drops',
        handler: 'drops',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    translations: TranslationsSchema,
                    data: DataSchema
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/api/drops',
        handler: 'apiDrops',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    data: types.array(types.object({
                        endDate: types.number,
                        startDate: types.number,
                        sendingDate: types.number,
                        sending: types.string,
                        image: types.string,
                        url: types.string
                    }))
                })
            }
        },
        api: true,
        version: '1.0.0'
    },
] as Route[];