const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

module.exports = core => {
    const getImage = async url => {
        const page = await core.get( url );

        const $ = cheerio.load( page.data );

        return $( '.lead-img', '.container' ).attr( 'src' );
    };

    const send = async () => {
        const url = 'http://files.elderscrollsonline.com/rss/en-us/eso-rss.xml';
        const oldNews = await core.info.get( 'news' );

        const res = await core.get( url );

        const $ = cheerio.load( res.data, { normalizeWhitespace: true, xmlMode: true });

        const news = $( 'item' ).filter( ( i, news ) => {
            const date = $( news ).find( 'pubDate' ).text();
            const link = $( news ).find( 'link' ).text();

            if( moment().isSame( date ) && oldNews.link !== link ) {
                return true;
            }
        }).get()[0];

        if( !news ) {
            return;
        }

        const description = {
            title: $( news ).find( 'title' ).text(),
            link: $( news ).find( 'link' ).text(),
            description: $( news ).find( 'description' ).text()
        };

        description.image = await getImage( description.link );

        await core.info.set( 'news', description );

        const translations = core.translations.getCategory( 'commands', 'news' );

        return core.notify( 'news', { translations, data: description });
    };

    return { send };
};