import { Route } from '../services/router';

export default [
    {
        path: '/seht/discord/guilds',
        handler: 'guilds',
        method: 'GET',
        version: '1.0.0',
        rights: ['owner'],
        api: true
    },
    {
        path: '/seht/discord/guilds/:guildId',
        handler: 'getGuildById',
        method: 'GET',
        version: '1.0.0',
        rights: ['owner'],
        api: true
    }
] as Route[];