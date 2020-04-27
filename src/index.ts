// Node 12.12 required (for Promise.allSettled)

import { promisify } from 'util';
import { MongoClient } from 'mongodb';

import { readdir as readSync } from 'fs';
import * as fastify from 'fastify';

import { CoreError, Core } from './services/core';

import middleware from './services/middleware';

import router from './services/router';
import subscriptions from './services/subscriptions';

import * as config from './configs/main';

const readdir = promisify(readSync);

const app = fastify();

const init = async (core: Core): Promise<void> => {
    const { checkAccess, prepare } = middleware(core);

    app.register(checkAccess);
    app.register(prepare);

    const moduleFiles = await readdir('./src/modules/');

    const promises = moduleFiles.map(async file => {
        if (!file.endsWith('.ts') || file.includes('module')) {
            return;
        }

        const module = await import(`./modules/${file}`);

        return new module.default(core);
    }, {});

    const modules = await Promise.all(promises)
        .then((modules: ModuleController[]) => modules.filter(noFalse => noFalse))
        .catch(err => {
            core.logger.error(err);

            process.exit(1);
        });

    const routes = router(modules);

    app.register(routes);

    subscriptions(core, modules);

    app.setErrorHandler((
        err: CoreError | fastify.FastifyError,
        request: CoreRequest | fastify.FastifyRequest,
        reply: CoreReply | fastify.FastifyReply<HttpResponse>
    ): void => {
        if (err instanceof CoreError && 'error' in reply) {
            reply.error(err.message, err.renderObject);

            return;
        }

        reply.code(500);

        core.logger.error(
            `Error from ${request.ip}: \n${err.stack}`
            + `\n\nPARAMS: ${JSON.stringify(request.params)},`
            + `\nQUERY: ${JSON.stringify(request.query)},`
            + `\nBODY: ${JSON.stringify(request.body)}.`
        );
    });

    app.listen(core.config.PORT, () => core.logger.log(`Listening ${core.config.PORT} port.`));
};

MongoClient
    .connect(config.db.url, { useUnifiedTopology: true })
    .then(async client => {
        const db = client.db('clockwork-core');

        const core = new Core(db);

        // функцию которая создаст папочку для логов и изображений в моделях + сделает миграцию и создаст temp

        await init(core);
    })
    .catch(console.error);