const cheerio = require( 'cheerio' );
const moment = require( 'moment' );

module.exports = core => {
    const MAX_LENGTH = 1990;

    const getDescription = property => {
        if( /<br \/>([^>]+)<br \/>/.test( property.text() ) ) {
            return property.text()
                .match( /<br \/>([^>]+)<br \/>/ )[1]
                .replace( /&rsquo;/gi, '\'' )
                .trim()
                .substr( 0, MAX_LENGTH );
        }

        return '';
    };

    const getImage = description => {
        if( /src="([^\s]+)"/.test( description.html() ) ) {
            return description.html()
                .match( /src="([^\s]+)"/ )[1]
                .replace( /-\d+x\d+/, '' );
        }

        return null;
    };

    const send = async () => {
        const url = 'https://forums.elderscrollsonline.com/en/categories/patch-notes/feed.rss';
        const oldPatch = await core.info.get( 'patch' );

        const res = await core.get( url );

        const $ = cheerio.load( res.data, { normalizeWhitespace: true, xmlMode: true });

        const patch = $( 'item' ).filter( ( i, news ) => {
            const date = $( news ).find( 'pubDate' ).text();
            const title = $( news ).find( 'title' ).text();
            const link = $( news ).find( 'link' ).text();

            if( title.startsWith( 'PC/Mac Patch Notes' )
                && moment().isSame( date )
                && oldPatch.link !== link ) {
                return true;
            }
        }).get()[0];

        if( !patch ) {
            return;
        }

        const description = {
            title: $( patch ).find( 'title' ).text(),
            link: $( patch ).find( 'link' ).text(),
            description: getDescription( $( patch ).find( 'description' ) ),
            image: getImage( $( patch ).find( 'description' ) )
        };

        core.info.set( 'patch', description );

        const translations = core.translations.getCategory( 'commands', 'patch' );

        return core.notify( 'patch', { translations, data: description });
    };

    const get = ( request, reply ) => {
        const patch = core.info.get( 'patch' );

        const translations = core.translate( 'commands/patch' );

        return reply.with({ translations, data: patch });
    };

    return { send, get };
};