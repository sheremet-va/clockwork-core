import { CronJob } from 'cron';

import Store from '../modules/store';

export class StoreManager extends Store {
    constructor(core: Core) {
        super(core);

        new CronJob('10 30 */1 * * *', this.start).start();
    }
}
