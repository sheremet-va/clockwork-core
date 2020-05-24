import { Module } from '../modules/module';

import { getModules } from '../services/utils';

export async function init(core: Core): Promise<Module[]> {
    const modules = await getModules<Module>(core, __dirname);

    return modules;
}