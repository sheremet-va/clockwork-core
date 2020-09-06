import { Route } from '../services/router';

export default [
    {
        path: '/seht/oauth2/discord/token/refresh',
        handler: 'discordRefreshToken',
        method: 'POST',
        version: '1.0.0',
        api: true
    },
    {
        path: '/seht/oauth2/discord/authorize',
        handler: 'discordAuthorize',
        method: 'POST',
        version: '1.0.0',
        api: true
    },
] as Route[];