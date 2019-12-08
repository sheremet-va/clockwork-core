const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

module.exports = Core => {
    const getImage = async url => {
        const page = await Core.get( url );

        const $ = cheerio.load( page.data );

        return $( '.lead-img', '.container' ).attr( 'src' );
    };

    const send = async () => {
        const url = 'http://files.elderscrollsonline.com/rss/en-us/eso-rss.xml';
        const oldNews = await Core.info.get( 'news' );

        const res = await Core.get( url );

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

        await Core.info.set( 'news', description );

        const translations = Core.translations.getCategory( 'commands', 'news' );

        return Core.notify( 'news', { translations, data: description });
    };

    return { send };
};