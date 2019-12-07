const cheerio = require( 'cheerio' );

module.exports = core => {
    const get = ( request, reply ) => {
        const lang = request.settings.language;
        const weekly = core.info.get( 'weekly' );

        const translations = core.translate( 'commands/weekly' );

        const rendered = Object.keys( weekly )
            .reduce( ( final, region ) => {
                final[region] = weekly[region][lang]; // Почему хранятся обе версии?

                return final;
            }, {});

        return reply.with({ translations, data: rendered });
    };

    const send = async () => {
        const translations = core.translations.getCategory( 'commands', 'weekly' );

        const url = 'https://esoleaderboards.com/trial/weekly';
        const oldTrials = await core.info.get( 'weekly' );

        const res = await core.get( url );

        const $ = cheerio.load( res.data );

        const newTrials = $( 'strong', '.header' ).map( ( i, el ) => $( el ).text().trim() ).get()
            .filter( name => name.search( 'Megaserver' ) === -1 );

        if( newTrials[0] === oldTrials.eu.en || newTrials[1] === oldTrials.na.en ) {
            return;
        }

        const changed = newTrials.reduce( ( obj, trial, i ) => {
            const region = i === 0 ? 'eu' : 'na';

            obj[region] = core.translations.getTranslation( 'instances', 'trials', trial );

            return obj;
        }, {});

        core.info.set( 'weekly', changed );

        return core.notify( 'weekly', { translations, data: changed });
    };

    return { send, get };
};