import commands from './commands';

import { Module } from '../modules/module';

import * as fastify from 'fastify';
import { FastifySchema } from 'fastify';

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
        const { method, path, version, handler, schema, api: isApi = false, rights = [] } = api;

        const options = {
            method: method || 'GET',
            url: path,
            version,
            handler: module[handler as 'handler'],
            ...(schema ? {
                schema: {
                    ...schema,
                    querystring: { ...defaultSchema.querystring, ...((schema.querystring as any) || {}) }
                }
            } : {}),
            attachValidation: true,
            config: { api: isApi, rights }
        };

        app.route(options);
    });
}

export default function ( modules: Module[]) {
    return async (
        app: fastify.FastifyInstance,
        _: any,
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

        app.route({
            method: 'GET',
            url: '/seht/commands',
            version: '1.0.0',
            handler: commands,
            config: { api: true }
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
    schema?: FastifySchema;
    rights?: string[];
}