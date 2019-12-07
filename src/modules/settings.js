module.exports = core => {
    const get = ( request, reply ) => {
        return reply.with({ data: request.settings });
    };

    const set = ( request, reply ) => {
        const settings = request.settings;

        const { project, id } = request.info;
        const { type, value } = request.params;

        const lang = type === 'language' && core.config.languages.includes( value )
            ? value
            : settings.language;

        const languageSettings = [ 'pledgesLang', 'merchantsLang', 'language' ];
        const translateType = languageSettings.includes( type ) ? 'language' : type;

        const translations = core.translations.translate( lang, `settings/${translateType}` );

        const available = Object.keys( core.config.defaultSettings );
        const availableLangs = {
            ru: [ 'ru+en', 'ru', 'en+ru', 'en' ],
            en: [ 'en' ]
        };

        if( !available.includes( type ) ) {
            return reply.error( 'CANT_SHANGE_THIS_SETTING' );
        }

        if( !value ) {
            return reply.error( 'EMPTY_SETTINGS', { setting: type });
        }

        if( settings[type] === value ) {
            return reply.error( 'SAME_SETTINGS' );
        }

        if( type === 'language' ) {
            translations.success = buildKey( reply, value, lang );

            if( !translations.success ) {
                return;
            }
        } else if( type === 'prefix' ) {
            if( value.length > 1 ) {
                return reply.error( 'PREFIX_TOO_LONG' );
            }

            translations.success = translations.success.render({ prefix: value });
        } else if( type === 'pledgesLang' || type === 'merchantsLang' ) {
            if( !availableLangs[lang].includes( value ) ) {
                const langs = availableLangs[lang].join( ', ' );

                return reply.error( 'CANT_CHANGE_COMBO_LANG', { langs });
            }

            translations.success = translations.success
                .render({ lang: translateLang( value.split( '+' ) ) });
        }

        core.setSettings( project, { id, type, value });

        return reply.with({ translations });
    };

    const buildKey = ( reply, setting, lang ) => {
        const translations = core.translations.translate( lang, 'settings/language' );

        if( !setting || !core.config.languages.includes( setting ) ) {
            return core.sendError( reply, lang, 'CANT_CHANGE_LANGUAGE', {
                langs: translateLang( core.config.languages, lang )
            });
        }

        return translations.success.render({
            lang: core.translations.translate( setting, `settings/languages/${setting}` )
        });
    };

    const translateLang = ( languages, lang ) => {
        return languages
            .map( confLang => core.translations.translate( lang, `settings/languages/${confLang}` ) )
            .join( ', ' );
    };

    return { get, set };
};