const getNewStatus = response => {
    const data = response.zos_platform_response;

    const status_aliases = {
        // PC
        'The Elder Scrolls Online (EU)': 'eu',
        'The Elder Scrolls Online (NA)': 'na',
        'The Elder Scrolls Online (PTS)': 'pts',

        // PS4
        'The Elder Scrolls Online (PS4 - EU)': 'ps_eu',
        'The Elder Scrolls Online (PS4 - US)': 'ps_us',

        // XBox
        'The Elder Scrolls Online (XBox - US)': 'xbox_us',
        'The Elder Scrolls Online (XBox - EU)': 'xbox_eu',
    };

    if( data.result_message === 'success' ) {
        return Object.keys( data.response )
            .reduce( ( status, code ) => {
                const alias = status_aliases[code];

                if( alias ) {
                    status[alias] = data.response[code];
                }

                return status;
            }, {});
    }

    return [];
};

module.exports = core => {
    const get = ( request, reply ) => {
        const lang = request.settings.language;

        const translations = core.translate( 'commands/status', lang );
        const status = core.info.get( 'status' );

        return reply.ok({ translations, data: status });
    };

    const send = async () => {
        const translations = core.translations.getCategory( 'commands', 'status' );

        const url = 'https://live-services.elderscrollsonline.com/status/realms';
        const oldStatus = core.info.get( 'status' ) || {};

        const res = await core.get( url );

        if( res && res.result !== 'ok' ) {
            return;
        }

        const newStatus = getNewStatus( res.data );
        const changedByCode = Object.keys( newStatus )
            .filter( code => newStatus[code] !== oldStatus[code]);

        if( changedByCode.length === 0 ) {
            return;
        }

        const changed = changedByCode.reduce( ( changed, code ) => {
            changed[code] = newStatus[code];

            return changed;
        }, {});

        Object.keys( changed )
            .forEach( code => core.info.set( 'status', changed[code], code ) );

        return core.notify( 'status', {
            translations: {
                ...translations,
                ...core.translations.getCategory( 'subscriptions', 'status' )
            },
            data: changed
        });
    };

    return { send, get };
};