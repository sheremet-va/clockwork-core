import SettingsBase from '../modules/settings';

import { CoreError } from '../services/core';

import { getTimezone } from '../services/utils';

import * as settingsConfig from '../configs/settings';

const types = {
    language: ['language', 'язык', 'lang'],
    merchantsLang: ['merchantsLang', 'торговцев', 'вендоров', 'merchants', 'vendors'],
    pledgesLang: ['pledgesLang', 'обетов', 'pledges', 'обеты', 'триалов', 'trials', 'weekly', 'викли'],
    timezone: ['timezone', 'tz', 'время'],
    newsLang: ['newsLang', 'новостей', 'news'],
    patchLang: ['patchLang', 'патчей', 'обновлений', 'обновления', 'patch', 'patch-note']
};

const comboLanguages = ['merchantsLang', 'pledgesLang', 'patchLang'] as const;

export default class SettingsModule extends SettingsBase {
    constructor(core: Core) {
        super(core);
    }

    get = async ({ settings, subscriptions = {} }: CoreRequest): Promise<ReplyOptions> => {
        const languages = this.core.config.languages;

        return { data: { settings, subscriptions, languages } };
    };

    set = async (request: CoreRequest): Promise<ReplyOptions> => {
        const {
            settings,
            info: { project, id },
            body: { type: setting, value: encValue }
        } = request;

        const foundType = Object.entries(types).find(([, types]) => types.includes(decodeURI(setting)));

        if (!foundType) {
            throw new CoreError('SETTINGS_NO_TYPE');
        }

        const [type] = foundType as settingsConfig.available[];
        const value = decodeURI(encValue);

        const lang = type === 'language' && this.isLanguage(value)
            ? value
            : settings.language;

        const valid = this.validate(type, value, settings, lang);

        if (typeof valid !== 'boolean') {
            throw new CoreError(valid.error || 'UNKNOWN_ERROR', valid.render);
        }

        const langRender = comboLanguages.includes(type as typeof comboLanguages[number])
            ? this.translateLang(value.split('+'), lang)
            : this.core.translate(lang, 'settings', 'languages', type === 'newsLang' ? value : lang) as string;

        const zone = type === 'timezone' ? getTimezone(value) : null;

        const languageSettings = ['pledgesLang', 'merchantsLang', 'newsLang', 'patchLang', 'language'];
        const translateType = languageSettings.includes(type) ? 'language' : type;

        const translations = this.core.translate(lang, {
            success: {
                lang: langRender,
                prefix: value,
                timezone: zone || value
            }
        }, 'settings', translateType);

        const cleanConfig = type === 'language' ? this.cleanSettings(settings, project, value as language) : settings;

        void this.core.setSettings(project, cleanConfig, { id, type, value: zone || value });

        return { translations };
    };

    validate = (
        type: settingsConfig.available,
        value: string | false,
        settings: Settings,
        lang: language
    ): true | { error?: string; render?: object } => {
        const { available } = this.core.settings.config;
        const availableLangs = {
            ru: ['ru+en', 'ru', 'en+ru', 'en'],
            en: ['en']
        };

        if (!available.includes(type)) {
            return { error: 'CANT_SHANGE_THIS_SETTING' };
        }

        if (!value) {
            return { error: 'EMPTY_SETTINGS', render: { setting: type } };
        }

        if (type === 'timezone') {
            value = getTimezone(value.trim());
        }

        if (settings[type] === value) {
            return { error: 'SAME_SETTINGS' };
        }

        const compare = {
            language: {
                condition: !this.isLanguage(value as string),
                error: 'CANT_CHANGE_LANGUAGE',
                render: { langs: this.core.config.languages.join(', ') }
            },
            prefix: {
                condition: (value as string).length > 1,
                error: 'PREFIX_TOO_LONG'
            },
            comboLang: {
                condition: !availableLangs[lang].includes(value as string),
                error: 'CANT_CHANGE_COMBO_LANG',
                render: { langs: availableLangs[lang].join(', ') }
            },
            timezone: {
                condition: typeof value === 'boolean',
                error: 'WRONG_TIMEZONE_OFFSET'
            }
        };

        const compareType = comboLanguages.includes(type as typeof comboLanguages[number])
            ? 'comboLang'
            : type === 'newsLang' ? 'language' : type;

        const { error, render = {}, condition } = compare[compareType as keyof typeof compare];

        if (condition) {
            return { error, render };
        }

        return true;
    };

    translateLang = (languages: string[], lang: language): string => {
        return languages
            .map(confLang =>
                this.core.translations.translate(lang, {}, 'settings', 'languages', confLang))
            .join(', ');
    };

    cleanSettings = (settings: Settings, project: project, lang: language): Settings => {
        let { pledgesLang, merchantsLang, newsLang, patchLang } = this.core.settings.config.defaults[project];

        const ifThen = <T extends string>(value: T, is: language, then: language) => value === is ? then : value;

        if(lang === 'en') {
            pledgesLang = 'en';
            merchantsLang = 'en';
            newsLang = 'en';
            patchLang = 'en';
        } else if(lang === 'ru') {
            pledgesLang = ifThen(settings.pledgesLang, 'en', 'ru');
            merchantsLang = ifThen(settings.merchantsLang, 'en', 'ru');
            newsLang = 'ru';
            patchLang = 'ru';
        }

        return {
            ...settings,
            patchLang,
            newsLang,
            pledgesLang,
            merchantsLang
        };
    };
}