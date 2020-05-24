import { Module } from './module';

export default class WeeklyModule extends Module {
    name = 'weekly';

    constructor(core: Core) {
        super(core);
    }
}