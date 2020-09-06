import * as fastify from 'fastify';

import { bridge } from '../controllers/logs';

import axios from 'axios';

export function init() {
    return async (
        app: fastify.FastifyInstance,
        _: any,
        done: (err?: fastify.FastifyError) => void
    ): Promise<void> => {
        app.get('/ws/logs/error', { websocket: true }, (connection) => {
            bridge.$on('log', async value => {
                if(value.action !== 'error') {
                    return;
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                connection.socket.send(JSON.stringify(value));
            });
        });
        app.get('/ws/logs/command', { websocket: true }, (connection) => {
            bridge.$on('log', async value => {
                if(value.action !== 'command') {
                    return;
                }

                const { data: user } = await axios.get(`http://localhost:3033/users/${value.authorId}`);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                connection.socket.send(JSON.stringify({
                    ...value,
                    user: {
                        id: user.id,
                        tag: user.tag,
                        avatar: user.avatarURL
                    }
                }));
            });
        });

        done();
    };
}