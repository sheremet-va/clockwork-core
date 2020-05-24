import { Module } from './module';

// TODO patchnotes for xbox, ps

export default class Patch extends Module {
    name = 'patch';

    constructor(core: Core) {
        super(core);
    }
}