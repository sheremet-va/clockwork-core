import * as fastify from 'fastify';

import { bridge } from '../controllers/logs';

export function init() {
    return async (
        app: fastify.FastifyInstance,
        _: any,
        done: (err?: fastify.FastifyError) => void
    ): Promise<void> => {
        app.get('/ws/logs/:action', { websocket: true }, (connection, req, params) => {
            bridge.$on('log', value => {
                if(params!.action === value.action) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    connection.socket.send(JSON.stringify(value));
                }
            });
        });

        done();
    };
}