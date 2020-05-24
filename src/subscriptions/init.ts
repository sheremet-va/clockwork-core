import { CronJob } from 'cron';

// import { Merchants } from '../services/merchants';
// import { Module } from '../modules/module';

import { getModules } from '../services/utils';

import * as fastify from 'fastify';

// import Golden from '../modules/golden';
// import Luxury from '../modules/luxury';

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

    // const merchants = new Merchants(core, );


    // const golden = modules.find(({ name }) => name === 'golden') as unknown as Golden;
    // const luxury = modules.find(({ name }) => name === 'luxury') as unknown as Luxury;

    // const merchants = new Merchants(core, golden, luxury);

    // modules.forEach(({ cron, send }) => {
    //     if (send && cron) {
    //         new CronJob(cron, send).start();
    //     }
    // });

    // new CronJob(merchants.cron, merchants.start).start(); // GOLDEN and LUXURY subscriptions
}