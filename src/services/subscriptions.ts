import { CronJob } from 'cron';

import { Merchants } from './merchants';

import Golden from '../modules/golden';
import Luxury from '../modules/luxury';

export default function (core: Core, modules: ModuleController[]): void {
    const golden = modules.find(({ name }) => name === 'golden') as unknown as Golden;
    const luxury = modules.find(({ name }) => name === 'luxury') as unknown as Luxury;

    const merchants = new Merchants(core, golden, luxury);

    modules.forEach(({ cron, send }) => {
        if (send && cron) {
            new CronJob(cron, send).start();
        }
    });

    new CronJob(merchants.cron, merchants.start).start(); // GOLDEN and LUXURY subscriptions
}