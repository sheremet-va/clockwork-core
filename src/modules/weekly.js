const cheerio = require( 'cheerio' );

const __module = {
    name: 'weekly',
    path: '/weekly',
    time: '35 */10 * * * 1-2'
};

module.exports = function() {
    const get = async ({ settings: { language: lang } }) => {
        const weekly = await this.info.get( 'weekly' );

        const translations = this.translate( 'commands/weekly' );

        // @todo save only one version
        const rendered = Object.keys( weekly )
            .reduce( ( final, region ) => ({ ...final, [region]: weekly[region][lang] }), {});

        return { translations, data: rendered };
    };

    const send = async () => {
        const translations = this.translations.getCategory( 'commands', 'weekly' );

        const url = 'https://esoleaderboards.com/trial/weekly';
        const old = await this.info.get( 'weekly' );

        const { data } = await this.get( url );

        const $ = cheerio.load( data );

        const trials = $( 'strong', '.header' )
            .map( ( i, el ) => $( el ).text().trim() )
            .get()
            .filter( name => name.search( 'Megaserver' ) === -1 );

        if( trials[0] === old.eu.en || trials[1] === old.na.en ) {
            return;
        }

        const changed = trials.reduce( ( obj, trial, i ) => {
            const region = i === 0 ? 'eu' : 'na';

            return {
                ...obj,
                [region]: this.translate( `instances/trials/${trial}` )
            };
        }, {});

        await this.info.set( 'weekly', changed );

        return this.notify( 'weekly', { translations, data: changed });
    };

    return { ...__module, get, send };
};