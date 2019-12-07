const moment = require( 'moment' );
const Path = require( 'path' );
const fs = require( 'fs' );

const NOW = moment();
const ONE_HOUR = 1;

const drops_schedule = JSON.parse(
    fs.readFileSync(
        Path.resolve( __dirname, 'dependencies', 'drops.json' ),
        'utf8'
    )
);

module.exports = core => {
    const dates = Object.keys( drops_schedule );

    const getDropsSending = ( send, foundDrops ) => {
        return Object.keys( send ).reduce( ( final, lang ) => {
            const sending = {
                time: core.translations.getDropsDay( 'time', foundDrops.sendingDate, lang ),
                date: core.translations.getDropsDay( 'day', foundDrops.sendingDate, lang )
            };

            final[lang] = send[lang].render( sending );

            return final;
        }, {});
    };

    const get = async request => {
        const lang = request.settings.language;
        const description = core.translate( 'drops/description' );

        const drops = dates.filter( key => {
            const [ start, end ] = key.split( ', ' );

            if ( moment( start ).isAfter( NOW ) || NOW.isBetween( start, end ) ) {
                return true;
            }
        })
            .map( key => {
                const drop = drops_schedule[key];

                const [ start, end ] = key.split( ', ' );

                const sending = {
                    time: core.translations.getDropsDay( 'time', drop.sendingDate, lang ),
                    date: core.translations.getDropsDay( 'day', drop.sendingDate, lang )
                };

                return {
                    when: core.translations.getDropsDate( start, end )[lang],
                    where: description[drop.where].render({ streamer: drop.streamer }),
                    info: description[drop.info].render({ streamer: drop.streamer }),
                    sending: description[drop.sending].render( sending ),
                    url: drop.url
                };
            });

        if( drops.length === 0 ) {
            throw new core.Error( 'NO_DROPS_INFO' );
        }

        const translations = core.translate( 'commands/drops' );

        return { translations, data: drops };
    };

    const send = async () => {
        // Checks if there is a translation after 10 minutes
        const dropsStartKey = dates.find( key => {
            const [ start ] = key.split( ', ' );

            const startDate = moment( start );
            const hourMore = moment( NOW ).add( ONE_HOUR, 'hours' );

            if( startDate.isSame( hourMore, 'hours' ) ) {
                return true;
            }
        });

        // Checks if you can get drops right now (only 19:00 MSK). \\ проверить чтобы 2жды одна и та же не слалась
        const dropsBetweenKey = dates.find( key => {
            const [ start, end ] = key.split( ', ' );

            const startDate = moment( start );
            const endDate = moment( end );

            if ( NOW.isBetween( startDate, endDate ) && NOW.hours() === 19 ) {
                return true;
            }
        });

        const key = dropsStartKey || dropsBetweenKey;

        if ( !key ) {
            return;
        }

        const foundDrops = drops_schedule[key];
        const translations = dropsStartKey
            ? { title: core.translations.getTranslation( 'drops', 'title', 'title_soon' ) }
            : { title: core.translations.getTranslation( 'drops', 'title', 'title_now' ) };

        const [ start, end ] = key.split( ', ' );
        const description = core.translations.getCategory( 'drops', 'description' );

        const drops = {
            when: core.translations.getDropsDate( start, end ),
            where: description[foundDrops.where].render({ streamer: foundDrops.streamer }),
            info: description[foundDrops.info].render({ streamer: foundDrops.streamer }),
            sending: getDropsSending( description[foundDrops.sending], foundDrops ),
            url: foundDrops.url
        };

        return core.notify( 'drops', { translations, data: drops });
    };

    return { send, get };
};