import { Module } from './module';

import { CoreError } from '../services/core';
import { Route } from '../services/router';

import * as moment from 'moment-timezone';
import { zones } from 'moment-timezone/data/packed/latest.json';

import * as settingsConfig from '../configs/settings';

const types = {
    language: ['language', 'язык', 'lang'],
    merchantsLang: ['merchantsLang', 'торговцев', 'merchants'],
    pledgesLang: ['pledgesLang', 'обетов', 'pledges', 'триалов', 'trials', 'weekly', 'викли'],
    timezone: ['timezone', 'tz', 'время'],
};

export default class SettingsModule extends Module {
    name = 'settings';

    routes: Route[] = [
        { path: '/user', handler: 'get', method: 'GET' },
        { path: '/settings', handler: 'set', method: 'POST' },
    ];

    constructor(core: Core) {
        super(core);
    }

    get = async ({ settings, subscriptions = {} }: CoreRequest): Promise<ReplyOptions> => {
        const languages = this.core.config.languages;

        return { data: { settings, subscriptions, languages } };
    };

    isLanguage(value: string): value is language {
        return (this.core.config.languages as readonly string[]).includes(value);
    }

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

        const langRender = type === 'pledgesLang' || type === 'merchantsLang'
            ? this.translateLang(value.split('+'), lang)
            : this.core.translate(lang, 'settings', 'languages', lang) as string;

        const zone = type === 'timezone' ? this.getTimezone(value) : null;

        const languageSettings = ['pledgesLang', 'merchantsLang', 'language'];
        const translateType = languageSettings.includes(type) ? 'language' : type;

        const translations = this.core.translate(lang, {
            success: {
                lang: langRender,
                prefix: value,
                timezone: zone || value
            }
        }, 'settings', translateType);

        const cleanConfig = type === 'language' ? this.cleanSettings(settings, project) : settings;

        this.core.setSettings(project, cleanConfig, { id, type, value: zone || value });

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
            value = this.getTimezone(value.trim());
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

        const compareType = type === 'pledgesLang' || type === 'merchantsLang'
            ? 'comboLang' : type;

        const { error, render = {}, condition } = compare[compareType];

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

    cleanSettings = (settings: Settings, project: project): Settings => {
        const { pledgesLang, merchantsLang } = this.core.settings.config.defaults[project];

        return {
            ...settings,
            pledgesLang,
            merchantsLang
        };
    };

    getTimezone = (value: string): string | false => {
        const abbr = new RegExp(value.replace(/\+/g, '\\+'), 'g');

        const zone = zones.filter(z => {
            const timezone = z.split('|')[0];

            if (timezone === value) {
                return true;
            }

            if (!abbr.test(z)) {
                return false;
            }

            const zone = moment.tz.zone(timezone);

            if( !zone ) {
                return false;
            }

            const zoneAbbr = zone.abbr(new Date().valueOf());

            if (zoneAbbr === value) {
                return true;
            }

            return false;
        }).map(z => z.split('|')[0]);

        return zone[0] || false;
    };
}