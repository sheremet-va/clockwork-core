// Node 12.12 required (for Promise.allSettled)

import { MongoClient } from 'mongodb';

import * as fastify from 'fastify';
import * as helmet from 'fastify-helmet';

import axios from 'axios';

import { CoreError, Core } from './services/core';

import middleware from './services/middleware';
import router from './services/router';
import initiator from './services/initiator';

import * as config from './configs/main';

import { init as initApi } from './api/init';
import { init as initSubscriptions } from './subscriptions/init';

const app = fastify();

const init = async (core: Core): Promise<void> => {
    const { checkAccess, prepare } = middleware(core);

    app.register(helmet);
    app.register(checkAccess);
    app.register(prepare);

    const modules = await initApi(core);

    const routes = router(modules);

    app.register(routes);

    await initSubscriptions(core, app);

    app.setErrorHandler((
        err: CoreError | fastify.FastifyError,
        request: CoreRequest | fastify.FastifyRequest,
        reply: CoreReply | fastify.FastifyReply<HttpResponse>
    ): void => {
        if (err instanceof CoreError && 'error' in reply) {
            reply.error(err.message, err.renderObject);

            return;
        }

        reply.code(500).send({ code: 'SERVER_ERROR', message: 'Something terrible happend...' });

        core.logger.error(
            `Error from ${request.ip}: \n${err.stack}`
            + `\n\nPARAMS: ${JSON.stringify(request.params)},`
            + `\nQUERY: ${JSON.stringify(request.query).replace(core.config.token, 'TRUSTED')},`
            + `\nBODY: ${JSON.stringify(request.body)}.`
        );
    });

    app.listen(core.config.PORT, () => core.logger.log(`Listening ${core.config.PORT} port.`));
};

initiator.run();

MongoClient
    .connect(config.db.url, { useUnifiedTopology: true })
    .then(async client => {
        const db = client.db('clockwork-core');

        const core = new Core(db);

        await init(core);

        const commands = await core.logs.findSubs();

        const promises = commands.map(c => {
            const [name] = c.arguments;

            if(!name) {
                return console.log('no name for ' + c.command)
            }

            const options = {
                url: `/subscriptions/sub?id=` + c.guildId,
                method: 'POST' as const,
                data: {
                    name,
                    channelId: c.channelId,
                    subject: 'Name',
                    type: 'guild'
                },
                headers: {
                    'Accept-Version': '1.0',
                    'Content-Type': 'application/json',
                }
            };

            return axios.request(options);
        })

        Promise.allSettled(promises).then((res) => {
            console.log(res);
        })
    })
    .catch(console.error);