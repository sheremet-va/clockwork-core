const translations = require( './translation.json' );
const moment = require( 'moment' );

const LLY_formats = {
    en: 'MMMM D',
    ru: 'D MMMM'
};

const LLLT_formats = {
    en: 'MMMM D, LT',
    ru: 'D MMMM с LT'
};

Object.keys( LLY_formats )
    .forEach( key => {
        moment.updateLocale( key, {
            longDateFormat: {
                '[LL-Y]': LLY_formats[key],
                '[LLLT]': LLLT_formats[key]
            }
        });
    });

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
    const tType = getType( type );

    if( !tType.errors ) {
        return tType[cat] || NOT_FOUND;
    }

    return NOT_FOUND;
};

const getTranslation = ( type, cat, tag ) => {
    const tCategory = getCategory( type, cat );

    if( !tCategory.errors ) {
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

    return Object.keys( dates ).reduce( ( description, key ) => {
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

const translate = ( lang, path, render = {}) => {
    const [type, category, tag] = path.split( '/' );

    const tType = getType( type );

    if( tType.errors ) {
        return NOT_FOUND;
    }

    if( !category ) {
        return Object.keys( tType ).reduce( ( str, tCategory ) => {
            const translation = Object.keys( tType[tCategory]).reduce( ( strCat, tagName ) => {
                const translated = getTranslation( type, tCategory, tagName )[lang];
                const tag = translated.render( render[tagName]);

                return { ...strCat, [tagName]: tag };
            }, {});

            return { ...str, [tCategory]: translation };
        }, {});
    }

    const tCategory = getCategory( type, category );

    if( tCategory.error ) {
        return NOT_FOUND;
    }

    if( tag ) {
        return getTranslation( type, category, tag )[lang] || NOT_FOUND;
    }

    return Object.keys( tCategory ).reduce( ( strCat, tagName ) => {
        const translated = getTranslation( type, category, tagName )[lang];
        const tag = translated.render( render[tagName]);

        return { ...strCat, [tagName]: tag };
    }, {});
};

const translateDays = ( day, lang ) => {
    const days = {
        en: ['day', 'days'],
        ru: ['день', 'дня', 'дней']
    };

    return day.pluralize( days[lang], lang );
};

const getTime = time => {
    const result = time.match( /\(([0-9:]+) UTC\)/ )[1];

    const [hour, min] = result.split( ':' );

    if( hour.length === 1 ) {
        return `0${hour}:${min}`;
    }

    return `${hour}:${min}`;
};

const buildDay = day => {
    const date = day.match( /\d+/ )[0];
    const month = day.match( /\w+/ )[0].slice( 0, 3 );

    return `${date} ${month}`;
};

const getRFCDate = string => {
    const [, date] = string.split( ' – ' );

    const [startDate, end] = date.split( ' - ' );
    const [day, start] = startDate.split( ', ' );

    const startTime = getTime( start );
    const endTime = getTime( end );
    const startDay = buildDay( day );
    const curYear = new Date().getFullYear();

    const [startResult, endResult] = [
        `${startDay} ${curYear} ${startTime} GMT`,
        `${startDay} ${curYear} ${endTime} GMT`
    ];

    return {
        en: `${getMoment( 'en', startResult ).format( '[LLLT]' )} - ${getMoment( 'en', endResult ).format( 'LT' )}`,
        ru: `${getMoment( 'ru', startResult ).format( '[LLLT]' )} до ${getMoment( 'ru', endResult ).format( 'LT' )}`
    };
};

const getMoment = ( lang, time ) => {
    return {
        en: moment( time ).utc().locale( 'en' ),
        ru: moment( time ).locale( 'ru' ),
    }[lang];
};

module.exports = {
    getAll,
    getType,
    getDates,
    getRFCDate,
    getCategory,
    getDropsDay,
    getDropsDate,
    getPledgesDate,
    getTranslation,

    errors,

    translate,
    translateDays
};
