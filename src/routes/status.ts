import { Route } from '../services/router';
import { types } from '../services/utils';

const Statuses = types.strings([
    'eu',
    'na',
    'ps_eu',
    'ps_us',
    'pts',
    'xbox_eu',
    'xbox_us'
], { enum: ['UP', 'DOWN'] });

function getRender(api = false): object {
    return types.object({
        startDate: types.number,
        endDate: types.number,
        ...( api ? {} : {
            replaces: types.strings([
                'start_day',
                'start_time',
                'end_day',
                'end_time',
                'abbr'
            ])
        })
    });
}

function getDataSchema(api = false): object {
    const Render = getRender(api);

    const Maintenance = types.object({
        pc: Render,
        xbox: Render,
        ps: Render
    });

    return types.object({ ...Statuses.properties, maintenance: Maintenance });
}

const TranslationsSchema = types.strings([
    'title',
    'UP',
    'DOWN',
    'maintenance',
    'time',
    'eu',
    'na',
    'ps_eu',
    'ps_us',
    'pts',
    'xbox_eu',
    'xbox_us'
]);

const PostPeriod = types.object({
    start: types.string,
    end: types.string
});

export default [
    {
        path: '/status',
        handler: 'status',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({
                    translations: TranslationsSchema,
                    data: getDataSchema()
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/status/render/maintenance',
        handler: 'maintenance',
        method: 'POST',
        schema: {
            body: types.object({
                maintenance: types.object({
                    pc: PostPeriod,
                    xbox: PostPeriod,
                    ps: PostPeriod
                })
            }),
            response: {
                '2xx': types.object({
                    translations: types.object({
                        pc: getRender(),
                        xbox: getRender(),
                        ps: getRender()
                    })
                })
            }
        },
        version: '1.0.0'
    },
    {
        path: '/api/status',
        handler: 'apiStatus',
        method: 'GET',
        schema: {
            response: {
                '2xx': types.object({ data: getDataSchema(true) })
            }
        },
        api: true,
        version: '1.0.0'
    },
] as Route[];