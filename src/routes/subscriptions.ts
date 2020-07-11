import { Route } from '../services/router';
import { types } from '../services/utils';

const SubDescriptions = types.object({
    title: types.string,
    description: types.string,
    name: types.string,
    aliases: types.array(types.string)
});

const DataSchema = types.subscriptions();
const TranslationsBaseSchema = types.object({
    title: types.string,
    to_subscribe: types.string,
    no_subscriptions: types.string,
    notice: types.string,
    aliases: types.string,
    subscription: types.string,
    subscribed_to: types.string,
    status: types.string,
    status_ps: types.string,
    status_xbox: types.string,
    merchants: types.string,
    news: types.string,
    other: types.string,
    subscriptions: types.array(SubDescriptions),
    groups: types.object({
        status: types.array(types.string),
        status_ps: types.array(types.string),
        status_xbox: types.array(types.string),
        merchants: types.array(types.string),
        news: types.array(types.string),
        other: types.array(types.string)
    })
});

const BodySchema = types.object({
    name: types.string,
    channelId: types.string,
    subject: types.string,
    type: types.string,
});

const TranslationsPostSchema = types.strings([
    'title',
    'success_channel',
    'success_user'
]);

export default [
    {
        path: '/subscriptions',
        handler: 'get',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    data: DataSchema,
                    translations: TranslationsBaseSchema
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/subscriptions/sub',
        handler: 'sub',
        method: 'POST',
        schema: {
            body: BodySchema,
            response: {
                '2xx': types.object({ translations: TranslationsPostSchema })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/subscriptions/unsub',
        handler: 'unsub',
        method: 'POST',
        schema: {
            body: BodySchema,
            response: {
                '2xx': types.object({ translations: TranslationsPostSchema })
            }
        },
        version: '1.0.0'
    },
] as Route[];