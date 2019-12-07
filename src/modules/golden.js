const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

const getItems = body => {
    const $ = cheerio.load( body.replace( /’/g, '\'' ) );

    return $( '.entry-content > ul li' ).map( ( i, el ) => {
        if ( $( el ).text().search( /([^–]+)/ ) === -1 || $( el ).text().search( 'http' ) !== -1 ) {
            return 'URL';
        }

        const full_name = $( el ).text().match( /(^[^\d]+)/ )[0].trim().replace( /\*$/i, '' );
        const name = full_name.match( /(^[^–]+)/ )[0].trim().replace( '’', '\'' );
        const trait = full_name.match( /([^–]+$)/ )[0].trim();
        const price = $( el ).text().replace( full_name, '' ).trim();
        const can_sell = $( el ).text().search( /\*$/i ) !== -1;

        return {
            name,
            price,
            trait,
            can_sell
        };
    }).get().filter( e => e !== 'URL' );
};

module.exports = core => {
    const send = async data => {
        const link = data.link;
        const res = await core.get( link );

        const items = getItems( res.data );

        await core.info.set( 'golden', {
            date: data.date,
            link: data.link,
            items
        });

        const translatedItems = items.map( item => Object.assign( item, {
            // items.getItem( name )
            trait: core.translations.getTranslation( 'merchants', 'traits', item.trait )
        }) );

        const translations = core.translations.getCategory( 'merchants', 'golden' );

        return core.notify( 'golden', { translations, data: translatedItems });
    };

    const get = async request => {
        const lang = request.settings.language;
        const NOW = moment().utc();

        const golden = await core.info.get( 'golden' );

        if( NOW.day() !== 0 && NOW.day() !== 6 ) {
            throw new core.Error( 'UNEXPECTED_GOLDEN_DATE' );
        } else if( !moment( golden.date ).isSame( NOW, 'day' )
            && !moment( golden.date ).isSame( NOW.subtract( 1, 'd' ), 'day' ) ) {
            throw new core.Error( 'DONT_HAVE_ITEMS_YET' );
        }

        const translations = core.translate( 'commands/golden', {
            title: {
                date: core.translations.getDates()[lang]
            }
        });

        return { translations, data: golden };
    };

    return { send, get };
};