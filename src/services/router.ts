import commands from './commands';

import * as fastify from 'fastify';

export default function (modules: ModuleController[]) {
    return (
        app: fastify.FastifyInstance,
        _: fastify.RegisterOptions<HttpServer, HttpRequest, HttpResponse>,
        done: (err?: fastify.FastifyError) => void
    ): void => {
        modules.forEach(mod => {
            mod.routes.forEach(({ path, handler, method, schema }) => {
                if (!path || !handler || !(handler in mod)) {
                    return;
                }

                const options = {
                    method: method || 'GET',
                    url: path,
                    handler: mod[handler as 'handler'],
                    ...(schema ? { schema } : {})
                };

                app.route(options);
            });

            mod.api.forEach(({ path, handler, version, method, schema }) => {
                if (!path || !handler || !version || !(handler in mod)) {
                    return;
                }

                const options = {
                    method: method || 'GET',
                    url: `/api${path}`,
                    version,
                    handler: mod[handler as 'handler'],
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