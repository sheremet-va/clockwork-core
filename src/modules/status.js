const cheerio = require( 'cheerio' );

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
    const getMaintenceTime = async () => {
        try {
            const res = await core.get( 'https://forums.elderscrollsonline.com/en/' );

            const $ = cheerio.load( res.data, { normalizeWhitespace: true });

            const message = $( '.DismissMessage' ).text().split( '\n' );

            const infoNames = [
                {
                    name: 'PC/Mac',
                    key: 'pc'
                },
                {
                    name: 'Xbox One',
                    key: 'xbox'
                },
                {
                    name: 'PlayStation',
                    key: 'ps'
                }
            ];

            return message.reduce( ( acc, mes ) => {
                const matchName = infoNames.find( inf => mes.search( inf.name ) !== -1 );

                if( matchName ) {
                    acc[matchName.key] = core.translations.getRFCDate( mes );
                }

                return acc;
            }, {});
        } catch( err ) {
            return false;
        }
    };

    const get = async () => {
        const translations = core.translate( 'commands/status' );

        const status = await core.info.get( 'status' );

        return { translations, data: status };
    };

    const send = async () => {
        const translations = core.translations.getCategory( 'commands', 'status' );

        const url = 'https://live-services.elderscrollsonline.com/status/realms';
        const oldStatus = await core.info.get( 'status' ) || {};

        const res = await core.get( url );

        const newStatus = getNewStatus( res.data );
        const changedByCode = Object.keys( newStatus )
            .filter( code => newStatus[code] !== oldStatus[code]);

        if( changedByCode.length === 0 ) {
            return;
        }

        const maintence = getMaintenceTime();

        const changed = changedByCode.reduce( ( changed, code ) => {
            changed[code] = newStatus[code];

            return changed;
        }, {});

        await core.info.set( 'status', { ...changed, maintence });

        statusSubscriptions( changed ).forEach( info => {
            return core.notify( info.name, {
                translations: {
                    ...translations,
                    ...maintence,
                    ...core.translations.getCategory( 'subscriptions', 'status' )
                },
                data: info.changed
            });
        });
    };

    const statusSubscriptions = changed => {
        const statuses = Object.keys( changed );

        if( statuses.includes( 'ps_eu' ) || statuses.includes( 'ps_us' ) ) {
            statuses.unshift( 'ps' );
        }

        if( statuses.includes( 'xbox_eu' ) || statuses.includes( 'xbox_us' ) ) {
            statuses.unshift( 'xbox' );
        }

        statuses.unshift( 'status' );

        return statuses.map( name => {
            return {
                name: `status${name.toUpperCase()}`,
                changed: getChanged( name, changed )
            };
        });
    };

    const getChanged = ( name, changed ) => {
        const obj = {};

        obj[name] = changed[name];

        switch( name ) {
            case 'status':
                return changed;
            case 'ps':
                return {
                    ps_eu: changed.ps_eu,
                    ps_us: changed.ps_us
                };
            case 'xbox':
                return {
                    xbox_eu: changed.xbox_eu,
                    xbox_us: changed.xbox_us
                };
            case 'eu':
            case 'na':
            case 'ps_eu':
            case 'ps_us':
            case 'pts':
            case 'xbox_eu':
            case 'xbox_us':
            default:
                return obj;
        }
    };

    return { send, get };
};