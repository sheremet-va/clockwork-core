import { Module } from './module';

import { StatusItem } from '../controllers/info';

import { replaces } from '../translation/dates';

interface StatusReply {
    eu?: 'UP' | 'DOWN';
    na?: 'UP' | 'DOWN';
    ps_eu?: 'UP' | 'DOWN';
    ps_us?: 'UP' | 'DOWN';
    pts?: 'UP' | 'DOWN';
    xbox_eu?: 'UP' | 'DOWN';
    xbox_us?: 'UP' | 'DOWN';
    maintenance?: Record<string, replaces>;
}

export default class Pledges extends Module {
    name = 'status';

    constructor(core: Core) {
        super(core);
    }

    async get({ settings }: CoreRequest): Promise<StatusItem> {
        const status = await this.info.get<StatusItem>('status');

        const render = this.core.dates.maintenance(status.maintenance || {}, settings);

        // status.maintenance = render;

        Object.assign(status, { maintenance: render });

        return status;
    }
}