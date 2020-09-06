// Node 12.12 required (for Promise.allSettled)

import { MongoClient } from 'mongodb';

import fastify, { FastifyError, FastifyRequest, FastifyReply, RawServerBase } from 'fastify';
import helmet from 'fastify-helmet';
import websocketPlugin from 'fastify-websocket';

import { CoreError, Core } from './services/core';

import middleware from './services/middleware';
import router from './services/router';
import initiator from './services/initiator';

import * as config from './configs/main';

import { init as initApi } from './api/init';
import { init as initSubscriptions } from './subscriptions/init';
import { init as initWebsockets } from './websockets/init';

const app = fastify({ trustProxy: true });

import fastifyCors from 'fastify-cors';

const init = async (core: Core): Promise<void> => {
    const { checkAccess, prepare } = middleware(core);

    await Promise.all([
        app.register(
            fastifyCors,
            {
                methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
                origin: core.seht.origin
            }
        ),
        app.register(helmet),
        app.register(checkAccess),
        app.register(prepare),
        app.register(
            websocketPlugin,
            {
                handle: conn => conn.pipe(conn),
                options: { maxPayload: 1048576 }
            }
        )
    ]);

    const modules = await initApi(core);

    const routes = router(modules);

    await app.register(routes);

    await initSubscriptions(core, app);

    const websockets = initWebsockets();

    await app.register(websockets);

    app.setErrorHandler(async(
        err: CoreError | FastifyError,
        request: CoreRequest | FastifyRequest,
        reply: CoreReply | FastifyReply<RawServerBase>
    ): Promise<void> => {
        if (err instanceof CoreError && 'error' in reply) {
            reply.error(err.message, err.renderObject);

            return;
        }

        await reply.code(500).send({ code: 'SERVER_ERROR', message: 'Something terrible happend...' });

        core.logger.error(
            'CoreInternalError',
            `Error from ${request.ip}: \n${err.stack || ''}`
            + `\n\nPARAMS: ${JSON.stringify(request.params)},`
            + `\nQUERY: ${JSON.stringify(request.query).replace(core.config.token, 'TRUSTED')},`
            + `\nBODY: ${JSON.stringify(request.body)}.`
        );
    });

    app.listen(core.config.PORT, '::', (e, address) => core.logger.log(`Listening ${address} port.`));
};

initiator.run();

MongoClient
    .connect(config.db.url, { useUnifiedTopology: true })
    .then(async client => {
        const db = client.db('clockwork-core');

        const core = new Core(db);

        await init(core);
    })
    .catch(console.error);