import Translations from '../modules/translations';

import { CoreError } from '../services/core';

export default class TranslationsModule extends Translations {
    constructor(core: Core) {
        super(core);
    }

    validatePrefix(value: string): void {
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
    }

    get = async (request: CoreRequest): Promise<ReplyOptions> => {
        const {
            query: { value },
            params: { type = '', category = '', tag = '' },
            settings: { language }
        } = request;

        const translations = this.core.translate(language, type, category, tag);

        if (category === 'prefix') {
            this.validatePrefix(value);
        }

        return { translations };
    };
}