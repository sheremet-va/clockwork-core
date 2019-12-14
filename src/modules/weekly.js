const cheerio = require( 'cheerio' );

module.exports = function() {
    const get = async ({ settings: { language: lang } }) => {
        const weekly = await this.info.get( 'weekly' );

        const translations = this.translate( 'commands/weekly' );

        const rendered = Object.keys( weekly )
            .reduce( ( final, region ) => ({ ...final, [region]: weekly[region][lang] }), {});

        return { translations, data: rendered };
    };

    const send = async () => {
        const translations = this.translations.getCategory( 'commands', 'weekly' );

        const url = 'https://esoleaderboards.com/trial/weekly';
        const oldTrials = await this.info.get( 'weekly' );

        const { data } = await this.get( url );

        const $ = cheerio.load( data );

        const newTrials = $( 'strong', '.header' )
            .map( ( i, el ) => $( el ).text().trim() )
            .get()
            .filter( name => name.search( 'Megaserver' ) === -1 );

        if( newTrials[0] === oldTrials.eu.en || newTrials[1] === oldTrials.na.en ) {
            return;
        }

        const changed = newTrials.reduce( ( obj, trial, i ) => {
            const region = i === 0 ? 'eu' : 'na';

            return {
                ...obj,
                [region]: this.translate( `instances/trials/${trial}` )
            };
        }, {});

        await this.info.set( 'weekly', changed );

        return this.notify( 'weekly', { translations, data: changed });
    };

    return { send, get };
};