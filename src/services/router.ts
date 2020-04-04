import commands from './commands';

import fastify from 'fastify';

export default function (modules: ModuleController[]) {
    return (
        app: fastify.FastifyInstance,
        options: fastify.RegisterOptions<HttpServer, HttpRequest, HttpResponse>,
        done: (err?: fastify.FastifyError) => void
    ): void => {
        modules.forEach(mod => {
            mod.routes.forEach(({ path, handler, method, schema }) => {
                if (!path || !handler || !mod[handler]) {
                    return;
                }

                const options = {
                    method: method || 'GET',
                    url: path,
                    handler: mod[handler],
                    ...(schema ? { schema } : {})
                };

                app.route(options);
            });

            mod.api.forEach(({ path, handler, version, method, schema }) => {
                if (!path || !handler || !version || !mod[handler]) {
                    return;
                }

                const options = {
                    method: method || 'GET',
                    url: `/api/${path}`,
                    version,
                    handler: mod[handler],
                    ...(schema ? { schema } : {})
                };

                app.route(options);
            });
        });

        app.get('/commands', commands);

        done();
    };
}

export declare type Route = {
    path: string;
    handler: string;
    method?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
    version?: string;
    schema?: fastify.RouteSchema;
}