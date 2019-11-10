const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

// const items = require('../info/golden.json')

const getItems = body => {
    const $ = cheerio.load( body.replace( /’/g, '\'' ) );

    return $( '.entry-content > ul li' ).map( ( i, el ) => {
        if ( $( el ).text().search( /([^–]+)/ ) === -1 || $( el ).text().search( 'http' ) !== -1 ) {
            return 'URL';
        }

        const full_name = $( el ).text().match( /(^[^\d]+)/ )[0].trim();
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
    const set = options => {
        core.info.set( 'golden', options.date, 'date' )
            .set( 'golden', options.url, 'url' )
            .set( 'golden', options.items, 'items' );

        return core.info.get( 'golden' );
    };

    const send = async data => {
        const url = data.url;
        const res = await core.get( url );

        if( res.result !== 'ok' ) {
            return;
        }

        const items = getItems( res.data );

        set({
            date: data.date,
            url: data.url,
            items
        });

        const translatedItems = items.map( item => Object.assign( item, {
            // items.getItem( name )
            trait: core.translations.getTranslation( 'merchants', 'traits', item.trait )
        }) );

        const translations = core.translations.getCategory( 'merchants', 'golden' );

        return core.notify( 'golden', { translations, data: translatedItems });
    };

    const get = ( request, reply )  => {
        const lang = request.settings.language;
        const NOW = moment().utc();

        const golden = core.info.get( 'golden' );

        if( NOW.day() !== 0 && NOW.day() !== 6 ) {
            return reply.error( 'UNEXPECTED_GOLDEN_DATE' );
        } else if( !moment( golden.date ).isSame( NOW, 'day' )
            && !moment( golden.date ).isSame( NOW.subtract( 1, 'd' ), 'day' ) ) {
            return reply.error( 'DONT_HAVE_ITEMS_YET' );
        }

        const translations = core.translate( 'commands/golden', lang );
        translations.title = translations.title.render({ date: core.translations.getDates()[lang] });

        return reply.ok({ translations, data: golden });
    };

    return { send, set, get };
};