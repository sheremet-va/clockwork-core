const moment = require( 'moment' );
const Path = require( 'path' );
const fs = require( 'fs' );

const __module = {
    name: 'drops',
    path: '/drops',
    time: '0 50 */1 * * *'
};

const ONE_HOUR = 1;

const drops_schedule = JSON.parse(
    fs.readFileSync(
        Path.resolve( __dirname, 'dependencies', 'drops.json' ),
        'utf8'
    )
);

module.exports = function() {
    const dates = Object.keys( drops_schedule );

    const getDropsSending = ( send, foundDrops ) => {
        return Object.keys( send ).reduce( ( final, lang ) => {
            const sending = {
                time: this.translations.getDropsDay( 'time', foundDrops.sendingDate, lang ),
                date: this.translations.getDropsDay( 'day', foundDrops.sendingDate, lang )
            };

            return {
                ...final,
                [lang]: send[lang].render( sending )
            };
        }, {});
    };

    const get = async ({ settings: { language: lang } }) => {
        const now = moment();

        const description = this.translate( 'drops/description' );

        const drops = dates.filter( key => {
            const [start, end] = key.split( ', ' );

            if ( moment( start ).isAfter( now ) || now.isBetween( start, end ) ) {
                return true;
            }
        })
            .map( key => {
                const drop = drops_schedule[key];

                const [start, end] = key.split( ', ' );

                const sending = {
                    time: this.translations.getDropsDay( 'time', drop.sendingDate, lang ),
                    date: this.translations.getDropsDay( 'day', drop.sendingDate, lang )
                };

                return {
                    when: this.translations.getDropsDate( start, end )[lang],
                    where: description[drop.where].render({ streamer: drop.streamer }),
                    info: description[drop.info].render({ streamer: drop.streamer }),
                    sending: description[drop.sending].render( sending ),
                    url: drop.url
                };
            });

        if( drops.length === 0 ) {
            throw new this.Error( 'NO_DROPS_INFO' );
        }

        const translations = this.translate( 'commands/drops' );

        return { translations, data: drops };
    };

    const send = async () => {
        const now = moment();

        // Checks if there is a translation after 10 minutes
        const dropsStartKey = dates.find( key => {
            const [start] = key.split( ', ' );

            const startDate = moment( start );
            const hourMore = moment( now ).add( ONE_HOUR, 'hours' );

            if( startDate.isSame( hourMore, 'hours' ) ) {
                return true;
            }
        });

        // Checks if you can get drops right now (only 19:00 MSK). \\ проверить чтобы 2жды одна и та же не слалась
        const dropsBetweenKey = dates.find( key => {
            const [start, end] = key.split( ', ' );

            const startDate = moment( start );
            const endDate = moment( end );

            if ( now.isBetween( startDate, endDate ) && now.hours() === 19 ) {
                return true;
            }
        });

        const key = dropsStartKey || dropsBetweenKey;

        if ( !key ) {
            return;
        }

        const foundDrops = drops_schedule[key];
        const translations = {
            title: this.translations.getTranslation( 'drops', 'title', dropsStartKey ? 'title_soon' : 'title_now' )
        };

        const [start, end] = key.split( ', ' );
        const description = this.translations.getCategory( 'drops', 'description' );

        const drop = {
            when: this.translations.getDropsDate( start, end ),
            where: description[foundDrops.where].render({ streamer: foundDrops.streamer }),
            info: description[foundDrops.info].render({ streamer: foundDrops.streamer }),
            sending: getDropsSending( description[foundDrops.sending], foundDrops ),
            url: foundDrops.url
        };

        return this.notify( 'drops', { translations, data: drop });
    };

    return { ...__module, send, get };
};