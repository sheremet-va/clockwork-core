const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

module.exports = ( Core, golden, luxury ) => {
    const published = ( body, info ) => {
        const NOT_ELIGIBLE = 'NOT_ELIGIBLE';

        const $ = cheerio.load( body, { xmlMode: true });

        return $( 'item' ).map( ( i, item ) => {
            const title = $( item ).find( 'title' ).text();

            const isLuxury = title.search( /LUXURY FURNITURE VENDOR ITEMS/i ) !== -1;
            const isGolden = title.search( /GOLDEN VENDOR ITEMS/i ) !== -1;

            if( !isGolden && !isLuxury ) {
                return NOT_ELIGIBLE;
            }

            const type = isLuxury ? 'luxury' : 'golden';

            const link = $( item ).find( 'link' ).text();
            const date = $( item ).find( 'pubDate' ).text();

            const publishedToday = moment( date ).isSame( moment(), 'day' );

            if( !publishedToday
                || isLuxury && date === info.luxury.date
                || isGolden && date === info.golden.date ) {
                return NOT_ELIGIBLE;
            }

            return { link, date, type };
        }).get().filter( e => e !== NOT_ELIGIBLE );
    };

    const start = async () => {
        const info = {
            golden: await Core.info.get( 'golden' ), // { date: 'Fri, 18 Oct 2019 00:11:22 +0000' }
            luxury: await Core.info.get( 'luxury' ) // { date: 'Fri, 18 Oct 2019 00:16:46 +0000' }
        };

        if( moment( info.golden.date ).isSame( moment(), 'day' )
            && moment( info.luxury.date ).isSame( moment(), 'day' ) ) {
            return;
        }

        const benevolent_rss = 'http://benevolentbowd.ca/feed/';

        const res = await Core.get( benevolent_rss );

        published( res.data, info ).forEach( post => {
            if( post.type === 'luxury' ) {
                return luxury.send( post );
            }

            return golden.send( post );
        });
    };

    return { published, start };
};