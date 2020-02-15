const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

const __module = {
    name: 'patch',
    path: '/patch-notes',
    time: '20 */2 * * * *'
};

// TODO patchnotes for xbox, ps

module.exports = function() {
    const MAX_LENGTH = 1990;

    const getDescription = property => {
        const text = property.text();

        if( !/<br \/>([^>]+)<br \/>/.test( text ) ) {
            return '';
        }

        return text.match( /<br \/>([^>]+)<br \/>/ )[1]
            .replace( /&rsquo;/gi, '\'' )
            .trim()
            .substr( 0, MAX_LENGTH );
    };

    const getImage = description => {
        const html = description.html();

        if( !/src="([^\s]+)"/.test( html ) ) {
            return null;
        }

        return html.match( /src="([^\s]+)"/ )[1].replace( /-\d+x\d+/, '' );
    };

    const send = async () => {
        const url = 'https://forums.elderscrollsonline.com/en/categories/patch-notes/feed.rss';
        const old = await this.info.get( 'patch' );

        const { data } = await this.get( url );

        const $ = cheerio.load( data, { normalizeWhitespace: true, xmlMode: true });

        const patch = $( 'item' ).filter( ( _, news ) => {
            const $news = $( news );

            const date = $news.find( 'pubDate' ).text();
            const title = $news.find( 'title' ).text();
            const link = $news.find( 'link' ).text();

            if(
                title.startsWith( 'PC/Mac Patch Notes' ) &&
                moment().isSame( date, 'day' ) &&
                old.link !== link
            ) {
                return true;
            }
        }).get()[0];

        if( !patch ) {
            return;
        }

        const $patch = $( patch );
        const $description = $patch.find( 'description' );

        const description = {
            title: $patch.find( 'title' ).text(),
            link: $patch.find( 'link' ).text(),
            description: getDescription( $description ),
            image: getImage( $description )
        };

        this.info.set( 'patch', description );

        const translations = this.translations.getCategory( 'commands', 'patch' );

        return this.notify( 'patch', { translations, data: description });
    };

    const get = async () => {
        const patch = await this.info.get( 'patch' );

        const translations = this.translate( 'commands/patch' );

        return { translations, data: patch };
    };

    return { ...__module, send, get };
};