const __module = {
    name: 'settings'
};

module.exports = function() {
    const get = async ({ settings }) => {
        return { data: settings };
    };

    const set = async request => {
        const {
            settings,
            info: { project, id },
            params: { type, value }
        } = request;

        const lang = type === 'language' && this.config.languages.includes( value )
            ? value
            : settings.language;

        const languageSettings = ['pledgesLang', 'merchantsLang', 'language'];
        const translateType = languageSettings.includes( type ) ? 'language' : type;

        const valid = validate( type, value, settings, lang );

        if( valid.error ) {
            throw new this.Error( valid.error, valid.render );
        }

        const langRender = type === 'pledgesLang' || type === 'merchantsLang'
            ? translateLang( value.split( '+' ), lang )
            : this.translations.translate( lang, `settings/languages/${lang}` );

        const translations = this.translations.translate( lang, `settings/${translateType}`, {
            success: {
                lang: langRender,
                prefix: value
            }
        });

        this.setSettings( project, { id, type, value });

        return { translations };
    };

    const validate = ( type, value, settings, lang ) => {
        const { available } = this.settings.config;
        const availableLangs = {
            ru: ['ru+en', 'ru', 'en+ru', 'en'],
            en: ['en']
        };

        if( !available.includes( type ) ) {
            return { error: 'CANT_SHANGE_THIS_SETTING' };
        }

        if( !value ) {
            return { error: 'EMPTY_SETTINGS', render: { setting: type } };
        }

        if( settings[type] === value ) {
            return { error: 'SAME_SETTINGS' };
        }

        const compare = {
            language: {
                condition: !this.config.languages.includes( value ),
                error: 'CANT_CHANGE_LANGUAGE',
                render: { langs: this.config.languages.join( ', ' ) }
            },
            prefix: {
                condition: value.length > 1,
                error: 'PREFIX_TOO_LONG',
                render: {}
            },
            comboLang: {
                condition: !availableLangs[lang].includes( value ),
                error: 'CANT_CHANGE_COMBO_LANG',
                render: { langs: availableLangs[lang].join( ', ' ) }
            }
        };

        const compareType = type === 'pledgesLang' || type === 'merchantsLang'
            ? 'comboLang' : type;

        const { error, render, condition } = compare[compareType];

        if( condition ) {
            return { error, render };
        }

        return true;
    };

    const translateLang = ( languages, lang ) => {
        return languages
            .map( confLang =>
                this.translations.translate( lang, `settings/languages/${confLang}` ) )
            .join( ', ' );
    };

    return { ...__module, get, set };
};