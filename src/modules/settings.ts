import { Module } from './module';

export default class SettingsModule extends Module {
    name = 'settings';

    constructor(core: Core) {
        super(core);
    }

    isLanguage(value: string): value is language {
        return (this.core.config.languages as readonly string[]).includes(value);
    }
}