import { Route } from '../services/router';
import { types } from '../services/utils';

const DataSchema = types.subscriptions();
const TranslationsBaseSchema = types.strings([
    'title',
    'to_subscribe',
    'no_subscriptions',
    'notice',
    'aliases',
    'subscription'
]);

const SubDescriptions = types.object({
    title: types.string,
    description: types.string,
    name: types.string,
    aliases: types.array(types.string)
});

const TranslationsSchema = {
    ...TranslationsBaseSchema,
    subscriptions: types.array(SubDescriptions)
};

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
                    translations: TranslationsSchema
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