const moment = require( 'moment' );

const __module = {
    name: 'drops',
    path: '/drops',
    time: '0 50 */1 * * *'
};

const ONE_HOUR = 1;
const SENDING_HOUR = 19;

module.exports = function() {
    const getDrops = now => {
        return this.info.drops.get( now );
    };

    const get = async ({ settings: { language: lang, timezone } }) => {
        const drops = await getDrops( new Date().valueOf() );

        if( drops.length === 0 ) {
            throw new this.Error( 'NO_DROPS_INFO' );
        }

        const translations = this.translate( 'commands/drops' );
        const description = this.translate( 'drops/description' );

        const formated = drops.map( drop => {
            const sending = this.translations.getDropsSending( drop.sendingDate, lang, timezone );

            return {
                when: this.translations.getDropsDate( drop.startDate, drop.endDate, timezone )[lang],
                where: description[drop.where].render({ streamer: drop.streamer }),
                info: description[drop.info].render({ streamer: drop.streamer }),
                sending: description[drop.sending].render( sending ),
                image: drop.image || null,
                url: drop.url
            };
        });

        return { translations, data: formated };
    };

    const send = async () => {
        const now = moment();

        const drops = await getDrops( now.valueOf() );

        // Checks if there is a stream in 10 minutes
        const dropStart = drops.find( drop => {
            const startDate = moment( drop.startDate );
            const hourMore = moment().add( ONE_HOUR, 'hours' );

            if( startDate.isSame( hourMore, 'hours' ) ) {
                return true;
            }
        });

        // Checks if you can get drops right now (only 19:00 MSK).
        const dropBetween = drops.find( drop => {
            const startDate = moment( drop.startDate );
            const endDate = moment( drop.endDate );

            if ( now.isBetween( startDate, endDate ) ) {
                return true;
            }
        });

        const drop = dropStart || dropBetween;

        if ( !drop ) {
            return;
        }

        const translations = {
            title: this.translations.get( `drops/title/${dropStart ? 'title_soon' : 'title_now'}` )
        };

        const description = this.translations.get( 'drops/description' );

        const formatted = {
            ...drop,
            when: this.translations.get( 'drops/dates' ),
            where: description[drop.where].render({ streamer: drop.streamer }),
            info: description[drop.info].render({ streamer: drop.streamer }),
            sending: description[drop.sending]
        };

        return this.notify( 'drops', { translations, data: formatted }, condition );
    };

    const condition = value => {
        const tz = value.settings.timezone;

        return moment( new Date() ).tz( tz ).hour() === SENDING_HOUR;
    };

    return { ...__module, send, get };
};