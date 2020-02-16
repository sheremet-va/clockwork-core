const cheerio = require( 'cheerio' );

const __module = {
    name: 'status',
    path: '/status',
    time: '30 */3 * * * *'
};

const getNewStatus = response => {
    const data = response.zos_platform_response;

    if( data.result_message !== 'success' ) {
        return [];
    }

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

    return Object.entries( data.response )
        .reduce( ( status, [code, value]) => {
            const alias = status_aliases[code];

            if( alias ) {
                return { ...status, [alias]: value };
            }

            return status;
        }, {});
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
            name: `status${name !== 'status' ? name.toUpperCase() : ''}`,
            changed: getChanged( name, changed )
        };
    });
};

const getChanged = ( name, changed ) => {
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
            return { ...changed, [name]: changed[name] };
    }
};

const areAllServersUp = statuses => {
    return !Object.values( statuses ).some( status => status === 'DOWN' );
};

module.exports = function() {
    const getMaintenceTime = async changed => {
        if( areAllServersUp( changed ) ) {
            return {};
        }

        try {
            const { data } = await this.request( 'https://forums.elderscrollsonline.com/en/' );

            const $ = cheerio.load( data, { normalizeWhitespace: true });

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

            return message.reduce( ( acc, body ) => {
                const matchName = infoNames.find( inf => body.search( inf.name ) !== -1 );

                if( !matchName || /(Over|No maintenance)/i.test( body ) ) {
                    return acc;
                }

                return {
                    ...acc,
                    [matchName.key]: this.translations.getRFCDate( body )
                };
            }, {});
        } catch( err ) {
            return {};
        }
    };

    const get = async () => {
        const translations = this.translate( 'commands/status' );

        const status = await this.info.get( 'status' );

        return { translations, data: status };
    };

    const send = async () => {
        const translations = this.translations.get( 'commands/status' );

        const url = 'https://live-services.elderscrollsonline.com/status/realms';
        const old = await this.info.get( 'status' );

        const { data } = await this.request( url );

        const status = getNewStatus( data );
        const changedByCode = Object.keys( status )
            .filter( code => status[code] !== old[code]);

        if( changedByCode.length === 0 ) {
            return;
        }

        const maintence = await getMaintenceTime( changedByCode );

        const changed = changedByCode.reduce(
            ( changed, code ) => ({ ...changed, [code]: status[code] }), {});

        await this.info.set( 'status', { ...changed, maintence });

        statusSubscriptions( changed ).forEach( info => {
            return this.notify( info.name, {
                translations: {
                    ...translations,
                    ...maintence,
                    ...this.translations.get( 'subscriptions/status' )
                },
                data: info.changed
            });
        });
    };

    /* const conf = [
        {
            method: 'GET',
            url: '/status',
            schema: {
                query: {
                    project: { type: 'string', default: 'assistant' },
                    id: { type: 'integer', required: true }
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            result: { type: 'string' },
                            data: { type: 'object' },
                            translations: { type: 'object' }
                        }
                    }
                }
            },
            handler: get,
            api: {

            }
        }
    ]; */

    return { ...__module, send, get };
};