import { Module } from './module';

export default class Help extends Module {
    name = 'help';

    constructor(core: Core) {
        super(core);
    }
}