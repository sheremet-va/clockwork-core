const cheerio = require( 'cheerio' );

module.exports = Core => {
    const get = async request => {
        const lang = request.settings.language;
        const weekly = await Core.info.get( 'weekly' );

        const translations = Core.translate( 'commands/weekly' );

        const rendered = Object.keys( weekly )
            .reduce( ( final, region ) => {
                final[region] = weekly[region][lang]; // Почему хранятся обе версии?

                return final;
            }, {});

        return { translations, data: rendered };
    };

    const send = async () => {
        const translations = Core.translations.getCategory( 'commands', 'weekly' );

        const url = 'https://esoleaderboards.com/trial/weekly';
        const oldTrials = await Core.info.get( 'weekly' );

        const res = await Core.get( url );

        const $ = cheerio.load( res.data );

        const newTrials = $( 'strong', '.header' ).map( ( i, el ) => $( el ).text().trim() ).get()
            .filter( name => name.search( 'Megaserver' ) === -1 );

        if( newTrials[0] === oldTrials.eu.en || newTrials[1] === oldTrials.na.en ) {
            return;
        }

        const changed = newTrials.reduce( ( obj, trial, i ) => {
            const region = i === 0 ? 'eu' : 'na';

            obj[region] = Core.translations.getTranslation( 'instances', 'trials', trial );

            return obj;
        }, {});

        Core.info.set( 'weekly', changed );

        return Core.notify( 'weekly', { translations, data: changed });
    };

    return { send, get };
};