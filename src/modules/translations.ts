import { Module } from './module';

import { Category, Tag } from '../translation/translation';

import { CoreError } from '../services/core';
import { Route } from '../services/router';

export default class TranslationsModule extends Module {
    name = 'translations';

    api: Route[] = [
        { path: '/translations/:type/:category/:tag', handler: 'get', method: 'GET', version: '1.0.0' },
        { path: '/translations/:type/:category', handler: 'sub', method: 'GET', version: '1.0.0' },
    ];

    constructor(core: Core) {
        super(core);
    }

    validatePrefix = (value: string): void => {
        if (!value) {
            throw new CoreError('EMPTY_SETTINGS');
        }

        const [prefix, old] = value.split(',');

        if (!prefix.length) {
            throw new CoreError('EMPTY_SETTINGS');
        }

        if (prefix === old) {
            throw new CoreError('SAME_SETTINGS');
        }

        if (prefix.length > 1) {
            throw new CoreError('PREFIX_TOO_LONG');
        }
    };

    get = async (request: CoreRequest): Promise<ReplyOptions> => {
        const {
            query: { value },
            params: { type, category, tag }
        } = request;

        const translations = this.core.translate(`${type}/${category}${tag ? '/' + tag : ''}`) as Category | Tag;

        if (category === 'prefix') {
            this.validatePrefix(value);
        }

        return { translations };
    };
}