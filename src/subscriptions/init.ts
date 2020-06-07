import { CronJob } from 'cron';

import { getModules } from '../services/utils';

import * as fastify from 'fastify';

interface SubscriptionModule {
    name: string;
    cron: string;
    send: () => Promise<void>;
}

export async function init(core: Core, app: fastify.FastifyInstance): Promise<void> {
    const modules = await getModules<SubscriptionModule>(core, __dirname);

    modules.forEach(({ name, cron, send }) => {
        core.logger.log(`[CRON] Initiating ${name}.`);

        app.get(`/cron/${name}`, async () => {
            console.log(`[CRON] Starting ${name} (${cron}) cron script.`);

            await send();

            return { name, cron };
        });

        if(!cron) {
            return;
        }

        new CronJob(cron, send).start();
    });
}