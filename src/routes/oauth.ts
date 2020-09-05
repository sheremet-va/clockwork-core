import { Route } from '../services/router';

export default [
    {
        path: '/api/discord/token/refresh',
        handler: 'discordRefreshToken',
        method: 'POST',
        version: '1.0.0',
        api: true
    },
    {
        path: '/api/discord/authorize',
        handler: 'discordAuthorize',
        method: 'POST',
        version: '1.0.0',
        api: true
    },
] as Route[];