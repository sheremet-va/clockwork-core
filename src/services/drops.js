const { CronJob } = require( 'cron' );
const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

const ESO_URL = 'https://www.elderscrollsonline.com';

module.exports = function() {
    const work = async () => {
        const { data } = await this.request({
            url: ESO_URL + '/en-us/streamers',
            method: 'get',
            headers: {
                Cookie: 'platform=ps4; accepts_cookies=true; block-cookies=no; age_gate=-2208988800%261580794948; country=United+States'
            }
        });

        const have = await this.info.drops.get( new Date().valueOf() );

        const $ = cheerio.load( data );

        const drops = $( '.event-item' ).map( async ( _, node ) => {
            const $node = $( node );
            const link = $node.find( 'a' ).attr( 'href' );
            const image = $node.find( 'img' ).attr( 'src' ) || null;

            const { data: drop } = await this.request( ESO_URL + link );

            const $drop = $( drop );

            const dates = $drop.find( '.special' ).text().trim().split( '\n' );
            const { startDate, endDate } = buildDates( dates[1].trim() );

            const haveDrop = have.some( drop => drop.startDate === startDate && drop.endDate === endDate );

            if( haveDrop ) {
                return 'skip';
            }

            const { sendingDate, sending } = getSending(  dates[3].trim() );

            const details = $drop.find( '.events-details' ).text();
            const { where, info, url } = buildDetails( details );

            return {
                startDate, endDate,
                where,
                url,
                info,
                image,
                sending, sendingDate
            };
        }).get();

        Promise.allSettled( drops ).then( drops => {
            drops.forEach( ({ status, value: drop }) => {
                if( status !== 'fulfilled' || drop === 'skip' ) {
                    return;
                }

                this.info.drops.set( drop );
            });
        });
    };

    const remove = async () => {
        const have = await this.info.drops.get( new Date().valueOf() );
        const now = moment();

        const over = have.filter( drop => moment( drop.endDate ).isAfter( now ) );

        const promises = over.map( ({ startDate, endDate }) => {
            this.info.drops.remove( startDate, endDate );
        });

        await Promise.allSettled( promises ).then( res => {
            res.forEach( ({ status, reason, value: { startDate, endDate } }) => {
                if( status === 'fulfilled' ) {
                    return this.logger.log( `Drop with params ${startDate} and ${endDate} was removed.` );
                }

                this.logger.error( 'CAN\'T REMOVE DROP: ' + reason );
            });
        });
    };

    const getSendingString = dates => {
        if( dates.length > 1 ) {
            return 'sending_every_day';
        }

        return 'sending_one_day';
    };

    const getSending = dates => {
        const goOutDates = dates.split( ',' );

        const sendingDate = buildDate( goOutDates[0]);
        const sending = getSendingString( goOutDates );

        return { sendingDate, sending };
    };

    const buildDates = date => {
        const [start, end] = date.split( ' - ' );

        const startDate = buildDate( start );
        const endDate = buildDate( end );

        return { startDate, endDate };
    };

    const buildDate = date => {
        const cleanDate = date.replace( '@ ', '' ).replace( /([\d]+)(PM|AM)/, '$1:00 $2' );

        return new Date( cleanDate + ( /EST/.test( cleanDate ) ? '' : ' EST' ) ).valueOf();
    };

    const buildDetails = details => {
        const any = /ALL ESO streams/i.test( details );
        const team = /Stream Team/i.test( details );

        const where = getWhere({ any, team });
        const info = getInfo({ any, team });
        const url = getUrl({ any, team });

        return { where, info, url };
    };

    const getUrl = ({ any, team, streamer = 'Bethesda' }) => {
        if( any || team ) {
            return 'https://www.twitch.tv/directory/game/The%20Elder%20Scrolls%20Online';
        }

        return 'https://www.twitch.tv/' + streamer;
    };

    const getWhere = ({ any, team }) => {
        if( any ) {
            return 'where_any';
        }

        if( team ) {
            return 'where_stream_team';
        }

        return 'where_streamer';
    };

    const getInfo = ({ any, team }) => {
        if( any ) {
            return 'info_any';
        }

        if( team ) {
            return 'info_stream_team';
        }

        return 'info_watch_stream';

        // info_watch_streamer
        // info_watch_streamers
    };

    new CronJob( '0 0 12 */1 * *', work ).start();
    new CronJob( '0 0 0 */1 * *', remove ).start();
};