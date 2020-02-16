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

const get = path => {
    const [type, cat, tag] = path.split( ',' );

    if( !type ) {
        return translations;
    }

    if( !cat ) {
        return translations[type] || NOT_FOUND;
    }

    if( !tag ) {
        return translations[type][cat] || NOT_FOUND;
    }

    return translations[type][cat][tag];
}

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

const getDropsDate = ( start, end, timezone ) => {
    const dates = {
        en: {
            start: moment( start ).tz( timezone ).locale( 'en' ),
            end: moment( end ).tz( timezone ).locale( 'en' )
        },
        ru: {
            start: moment( start ).tz( timezone ).locale( 'ru' ),
            end: moment( end ).tz( timezone ).locale( 'ru' )
        }
    };

    const translations = get( 'drops/dates' );

    const abbr = moment.tz.zone( timezone ).abbr( start );

    return Object.keys( dates ).reduce( ( description, key ) => {
        const start = dates[key].start;
        const end = dates[key].end;

        const replaces = {
            start_day: start.format( '[LL-Y]' ),
            start_time: start.format( 'LT' ),
            end_day: end.format( '[LL-Y]' ),
            end_time: end.format( 'LT' ),
            abbr
        };

        if( moment( start ).isSame( end, 'day' ) ) {
            description[key] = translations.one_day[key].render( replaces );
        } else {
            description[key] = translations.period[key].render( replaces );
        }

        return description;
    }, {});
};

const getDropsSending = ( date, lang, timezone ) => {
    const abbr = moment.tz.zone( timezone ).abbr( date );

    const time = moment( date ).tz( timezone );

    const dates_time = {
        en: `${time.locale( 'en' ).format( 'LT' )} (${abbr})`,
        ru: `${time.locale( 'ru' ).format( 'LT' )} (${abbr})`
    };

    const dates_date = {
        en: time.locale( 'en' ).format( '[LL-Y]' ),
        ru: time.locale( 'ru' ).format( '[LL-Y]' )
    };

    return {
        time: dates_time[lang],
        date: dates_date[lang]
    };
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

    const tType = get( type );

    if( tType.errors ) {
        return NOT_FOUND;
    }

    if( !category ) {
        return Object.keys( tType ).reduce( ( str, tCategory ) => {
            const translation = Object.keys( tType[tCategory]).reduce( ( strCat, tagName ) => {
                const translated = get( `${type}/${tCategory}/${tagName}` )[lang];
                const tag = translated.render( render[tagName]);

                return { ...strCat, [tagName]: tag };
            }, {});

            return { ...str, [tCategory]: translation };
        }, {});
    }

    const tCategory = get( type + '/' + category );

    if( tCategory.error ) {
        return NOT_FOUND;
    }

    if( tag ) {
        return get( `${type}/${category}/${tag}` )[lang] || NOT_FOUND;
    }

    return Object.keys( tCategory ).reduce( ( strCat, tagName ) => {
        const translated = get( `${type}/${category}/${tagName}` )[lang];
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
        start: startResult,
        end: endResult
    };
};

module.exports = {
    getDates,
    getRFCDate,
    getDropsSending,
    getDropsDate,
    getPledgesDate,

    errors,

    translate,
    translateDays
};
