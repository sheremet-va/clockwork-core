import { Module } from './module';

export default class TranslationsModule extends Module {
    name = 'translations';

    constructor(core: Core) {
        super(core);
    }
}