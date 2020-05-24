import { Module } from './module';

export default class News extends Module {
    name = 'news';

    constructor(core: Core) {
        super(core);
    }
}