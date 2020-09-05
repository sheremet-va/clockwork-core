import * as fastify from 'fastify';

import { bridge } from '../api/logs';

export function init() {
    return async (
        app: fastify.FastifyInstance,
        _: any,
        done: (err?: fastify.FastifyError) => void
    ): Promise<void> => {
        app.get('/ws/logs', { websocket: true }, (connection) => {
            bridge.$on('log', value => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                connection.socket.send(JSON.stringify(value));
            });
        });

        done();
    };
}