import commands from './commands';

import { Module } from '../modules/module';

import * as fastify from 'fastify';

const defaultSchema = {
    querystring: {
        project: {
            type: 'string',
            enum: ['assistant']
        },
        id: { type: 'string' },
        token: { type: 'string' },
        language: { type: 'string' }
    }
};

async function addRoutes(
    app: fastify.FastifyInstance,
    module: Module
): Promise<void> {

    const routes: Route[] = (await import('../routes/' + module.name)).default;

    routes.forEach(api => {
        const { method, path, version, handler, schema, api: isApi = false } = api;

        const options = {
            method: method || 'GET',
            url: path,
            version,
            handler: module[handler as 'handler'],
            ...(schema ? {
                schema: {
                    ...schema,
                    querystring: { ...defaultSchema.querystring, ...(schema.querystring || {}) }
                }
            } : {}),
            attachValidation: true,
            config: { api: isApi }
        };

        app.route(options);
    });
}

export default function ( modules: Module[]) {
    return async (
        app: fastify.FastifyInstance,
        _: fastify.RegisterOptions<HttpServer, HttpRequest, HttpResponse>,
        done: (err?: fastify.FastifyError) => void
    ): Promise<void> => {
        const promises = modules.map(mod => addRoutes(app, mod));

        await Promise.all(promises)
            .catch(err => {
                console.error(err);

                process.exit(1);
            });

        app.route({
            method: 'GET',
            url: '/commands',
            version: '1.0.0',
            handler: commands,
            config: { api: false }
        });

        done();
    };
}

export declare type Route = {
    path: string;
    handler: string;
    method?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
    api?: boolean;
    version?: string;
    schema?: fastify.RouteSchema;
}