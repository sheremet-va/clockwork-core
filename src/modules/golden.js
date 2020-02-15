const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

const __module = {
    name: 'golden',
    path: '/golden'
};

const prepare = ( text, match, [what, how] = []) => {
    if( !match.test( text ) ) {
        return '';
    }

    const matched = text.match( match )[0].trim();

    return what ? matched.replace( what, how ) : matched;
};

const getItems = body => {
    const $ = cheerio.load( body );

    return $( '.entry-content > ul li' ).map( ( _, el ) => {
        const text = $( el ).text();

        if ( !/([^–]+)/.test( text ) || /http/.test( text ) ) {
            return 'URL';
        }

        const full_name = prepare( text, /(^[^\d]+)/, [/\*$/i, '']);
        const name = prepare( full_name, /(^[^–]+)/, ['’', '\'']);
        const trait = prepare( full_name, /([^–]+$)/ );

        const price = text.replace( full_name, '' ).trim();
        const can_sell = text.search( /\*$/i ) !== -1;

        return {
            name,
            price,
            trait,
            can_sell
        };
    }).get().filter( e => e !== 'URL' );
};

module.exports = function() {
    const send = async ({ link, date }) => {
        const { data } = await this.get( link );

        const items = getItems( data );

        await this.info.set( 'golden', { date, link, items });

        const translatedItems = items.map( item => Object.assign( item, {
            // items.getItem( name )
            trait: this.translations.getTranslation( 'merchants', 'traits', item.trait )
        }) );

        const translations = this.translations.getCategory( 'merchants', 'golden' );

        return this.notify( 'golden', { translations, data: translatedItems });
    };

    const get = async ({ settings: { language: lang } }) => {
        const now = moment().utc();

        if( now.day() !== 0 && now.day() !== 6 ) {
            throw new this.Error( 'UNEXPECTED_GOLDEN_DATE' );
        }

        const golden = await this.info.get( 'golden' );

        const date = moment( golden.date );

        if(
            !date.isSame( now, 'day' ) &&
            !date.isSame( now.subtract( 1, 'd' ), 'day' )
        ) {
            throw new this.Error( 'DONT_HAVE_ITEMS_YET' );
        }

        const render = {
            title: {
                date: this.translations.getDates()[lang]
            }
        };

        const translations = this.translate( 'commands/golden', render );

        return { translations, data: golden };
    };

    return { ...__module, send, get };
};