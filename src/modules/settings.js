module.exports = Core => {
    const get = async request => {
        return { data: request.settings };
    };

    const set = async request => {
        const settings = request.settings;

        const { project, id } = request.info;
        const { type, value } = request.params;

        const lang = type === 'language' && Core.config.languages.includes( value )
            ? value
            : settings.language;

        const languageSettings = [ 'pledgesLang', 'merchantsLang', 'language' ];
        const translateType = languageSettings.includes( type ) ? 'language' : type;

        const valid = validate( type, value, settings, lang );

        if( valid.error ) {
            throw new Core.Error( valid.error, valid.render );
        }

        const langRender = type === 'pledgesLang' || type === 'merchantsLang'
            ? translateLang( value.split( '+' ) )
            : Core.translations.translate( lang, `settings/languages/${lang}` );

        const translations = Core.translations.translate( lang, `settings/${translateType}`, {
            success: {
                lang: langRender,
                prefix: value
            }
        });

        Core.setSettings( project, { id, type, value });

        return { translations };
    };

    const validate = ( type, value, settings, lang ) => {
        const available = Object.keys( Core.config.defaultSettings );
        const availableLangs = {
            ru: [ 'ru+en', 'ru', 'en+ru', 'en' ],
            en: [ 'en' ]
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
                condition: !Core.config.languages.includes( value ),
                error: 'CANT_CHANGE_LANGUAGE',
                render: translateLang( Core.config.languages, lang )
            },
            prefix: {
                condition: value.length > 1,
                error: 'PREFIX_TOO_LONG',
                render: {}
            },
            comboLang: {
                condition: !availableLangs[lang].includes( value ),
                error: 'CANT_CHANGE_COMBO_LANG',
                render: availableLangs[lang].join( ', ' )
            }
        };

        const compareType = type === 'pledgesLang' || type === 'merchantsLang'
            ? 'comboLang'
            : type;

        const { error, render, condition } = compare[compareType];

        if( condition ) {
            return { error, render };
        }

        return true;
    };

    const translateLang = ( languages, lang ) => {
        return languages
            .map( confLang => Core.translations.translate( lang, `settings/languages/${confLang}` ) )
            .join( ', ' );
    };

    return { get, set };
};