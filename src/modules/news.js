const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

module.exports = function() {
    const getImage = async url => {
        const { data } = await this.get( url );

        const $ = cheerio.load( data );

        return $( '.lead-img', '.container' ).attr( 'src' );
    };

    const send = async () => {
        const url = 'http://files.elderscrollsonline.com/rss/en-us/eso-rss.xml';
        const oldNews = await this.info.get( 'news' );

        const { data } = await this.get( url );

        const $ = cheerio.load( data, { normalizeWhitespace: true, xmlMode: true });

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

        await this.info.set( 'news', description );

        const translations = this.translations.getCategory( 'commands', 'news' );

        return this.notify( 'news', { translations, data: description });
    };

    return { send };
};