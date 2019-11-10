const translations = require( './translation.json' );
const moment = require( 'moment' );

const formats = {
    en: 'MMMM D',
    ru: 'D MMMM'
};

Object.keys( formats )
    .forEach( key => moment.updateLocale( key, {
        longDateFormat: {
            '[LL-Y]': formats[key]
        }
    }) );

const errors = translations.errors;
const NOT_FOUND = {
    errors: {
        NOT_FOUND: errors.NOT_FOUND
    }
};

const getAll = () => translations;

const getType = type => {
    return translations[type] || NOT_FOUND;
};

const getCategory = ( type, cat ) => {
    const translatedType = getType( type );

    if( !translatedType.errors ) {
        return translatedType[cat] || NOT_FOUND;
    }

    return NOT_FOUND;
};

const getTranslation = ( type, cat, tag ) => {
    const translatedCat = getCategory( type, cat );

    if( !translatedCat.errors ) {
        return translations[type][cat][tag] || NOT_FOUND;
    }

    return NOT_FOUND;
};

const getPledgesDate = ( days, lang ) => {
    const day = moment().add( days, 'days' );

    return {
        date: {
            en: day.locale( 'en' ).format( '[LL-Y]' ),
            ru: day.locale( 'ru' ).format( '[LL-Y]' )
        }[lang],
        day: {
            en: day.locale( 'en' ).format( 'dddd' ),
            ru: day.locale( 'ru' ).format( 'dddd' )
        }[lang]
    };
};

const getDropsDate = ( start, end ) => {
    const dates = {
        en: {
            start: moment( start ).utc().locale( 'en' ),
            end: moment( end ).utc().locale( 'en' )
        },
        ru: {
            start: moment( start ).locale( 'ru' ),
            end: moment( end ).locale( 'ru' )
        }
    };

    const translations = getCategory( 'drops', 'dates' );

    return Object.keys( dates )
        .reduce( ( description, key ) => {
            const start = dates[key].start;
            const end = dates[key].end;

            const replaces = {
                start_day: start.format( '[LL-Y]' ),
                start_time: start.format( 'LT' ),
                end_day: end.format( '[LL-Y]' ),
                end_time: end.format( 'LT' )
            };

            if( moment( start ).isSame( end, 'day' ) ) {
                description[key] = translations.one_day[key].render( replaces );
            } else {
                description[key] = translations.period[key].render( replaces );
            }

            return description;
        }, {});
};

const getDropsDay = ( type, date, lang ) => {
    const dates_time = {
        en: `${moment( date ).utc().format( 'LT' )} UTC`,
        ru: `${moment( date ).format( 'LT' )} МСК`
    };

    const dates_date = {
        en: moment( date ).utc().locale( 'en' ).format( '[LL-Y]' ),
        ru: moment( date ).locale( 'ru' ).format( '[LL-Y]' )
    };

    if( type === 'time' ) {
        return lang ? dates_time[lang] : dates_time;
    }

    return lang ? dates_date[lang] : dates_date;
};

const getDates = ( days = 0 ) => {
    const day = moment().add( days, 'days' );

    return {
        en: day.locale( 'en' ).format( '[LL-Y]' ),
        ru: day.locale( 'ru' ).format( '[LL-Y]' )
    };
};

const translate = ( path, lang ) => {
    const [ type, category, tag ] = path.split( '/' );

    const translatedType = getType( type );

    if( translatedType.errors ) {
        return NOT_FOUND;
    }

    if( !category ) {
        return Object.keys( translatedType )
            .reduce( ( str, translatedCategory ) => {
                str[translatedCategory] = Object.keys( translatedType[translatedCategory])
                    .reduce( ( strCat, translatedTag ) => {
                        strCat[translatedTag] = getTranslation( type, translatedCategory, translatedTag )[lang];

                        return strCat;
                    }, {});
                return str;
            }, {});
    }

    const translatedCategory = getCategory( type, category );

    if( translatedCategory.error ) {
        return NOT_FOUND;
    }

    if( !tag ) {
        return Object.keys( translatedCategory )
            .reduce( ( strCat, translatedTag ) => {
                strCat[translatedTag] = getTranslation( type, category, translatedTag )[lang];

                return strCat;
            }, {});
    }

    return getTranslation( type, category, tag )[lang] || NOT_FOUND;
};

const translateDays = ( day, lang ) => {
    const days = {
        en: [ 'day', 'days' ],
        ru: [ 'день', 'дня', 'дней' ]
    };

    return day.declOfNumber( days[lang], lang );
};

module.exports = {
    getAll,
    getType,
    getDates,
    getCategory,
    getDropsDay,
    getDropsDate,
    getPledgesDate,
    getTranslation,

    errors,

    translate,
    translateDays
};
