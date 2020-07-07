import { Module } from './module';

export default class TranslateModule extends Module {
    name = 'translate';

    constructor(core: Core) {
        super(core);
    }
}