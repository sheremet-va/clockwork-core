const axios = require( 'axios' );

const REPEAT_IN_SECONDS = 10000;
const REPEAT_NOTIFY_LIMIT = 10;

const GET_LIMIT = 5;

module.exports = core => {
    const projects = core.config.projects;

    core.post = async ( project, options, limit = 1 ) => {
        if( limit > REPEAT_NOTIFY_LIMIT ) {
            return Promise.reject({ project });
        }

        const url = projects[project].url + options.url;

        options.data.token = core.config.token;

        try {
            const res = await axios({
                method: 'post',
                data: options.data,
                url
            });

            return { status: res.data.result, project };
        } catch ( err ) {
            core.logger.error(
                `[${
                    limit.declOfNumber([ 'try', 'tries' ], 'en' )
                }] Error while attempting to post ${options.url} to ${project}: ${err}`
            );

            await core.wait( REPEAT_IN_SECONDS );

            return core.post( project, options, ++limit );
        }
    };

    core.notify = async ( name, data ) => {
        const promises = Object.keys( projects )
            .map( project =>
                core.post( project, {
                    url: `/subscriptions/${name}`,
                    data
                })
            );

        Promise.allSettled( promises )
            .then( result =>
                result.forEach( res => {
                    if( res.status === 'fulfilled' ) {
                        core.logger.sub( name, res.value.project, res.value.status );
                    } else {
                        // Отправить сообщение в дискорд/телеграм, что не смог отправить
                        core.logger.error(
                            `Number of attempts while trying post "${name}" subscription to ${res.reason.project} exceeded.`
                        );
                    }
                })
            );
    };

    core.get = async ( options, tries = 1 ) => {
        if( tries > GET_LIMIT ) {
            return {
                result: 'error',
                message: 'Number of attempts exceeded.',
                statusCode: 500
            };
        }

        return axios.get( options )
            .then( res => ({ result: 'ok', data: res.data }) )
            .catch( err => {
                core.logger.error(
                    `Error at core.get "${options.url || options}" (${tries.declOfNumber([ 'try', 'tries' ], 'en' )}): ${err}`
                );

                return core.get( options, ++tries );
            });
    };

    core.error = ( reply, lang, errorCode, render = {}) => {
        if( core.translations.errors[errorCode]) {
            reply.send({
                result: 'error',
                message: core.translations.errors[errorCode][lang].render( render ),
                errorCode
            });
        } else {
            reply.send({ result: 'error', errorCode });
        }

        return false;
    };

    core.send = ( reply, options ) => {
        return reply.send({
            result: 'ok',
            ...options
        });
    };

    core.getSettings = async ( project, id ) => {
        const projectInfo = projects[project];
        const defaults = projectInfo.vk
            ? core.config.defaultVkSettings
            : core.config.defaultSettings;

        const data = await core.settings[project].get( id ) || {};

        return Object.keys( defaults ).reduce( ( returnObject, key ) => {
            returnObject[key] = data[key] ? data[key] : defaults[key];

            return returnObject;
        }, {});
    };

    core.setSettings = ( project, options ) => {
        const { id, type, value } = options;
        const settings = { ownerId: id };

        settings[type] = value;

        return core.settings[project].set( settings );
    };

    core.getSubs = ( project, id ) => {
        const defaults = core.config.defaultSubs;

        const data = core.subs[project].get( id ) || {};

        return Object.keys( defaults ).reduce( ( returnObject, key ) => {
            returnObject[key] = data[key] ? data[key] : defaults[key];

            return returnObject;
        }, {});
    };

    core.wait = require( 'util' ).promisify( setTimeout );

    Object.defineProperty( String.prototype, 'render', {
        value( replaces ) {
            return Object.keys( replaces )
                .reduce( ( final, replace ) => final
                    .replace( new RegExp( `{{\\s+${replace}\\s+}}`, 'g' ), replaces[replace]), this );
        }
    });

    Object.defineProperty( Object.prototype, 'render', {
        value( replaces ) {
            return Object.keys( this ).reduce( ( final, lang ) => {
                final[lang] = this[lang].render( replaces );

                return final;
            }, {});
        }
    });

    Object.defineProperty( Number.prototype, 'declOfNumber', {
        value( array, lang ) {
            switch( lang ) {
                case 'ru':
                    return `${this} ${array[( this % 10 === 1 && this % 100 !== 11 )
                        ? 0
                        : this % 10 >= 2 && this % 10 <= 4 && ( this % 100 < 10 || this % 100 >= 20 )
                            ? 1
                            : 2]}`;
                case 'en':
                default:
                    return `${this} ${array[this > 1 ? 1 : 0]}`;
            }
        }
    });

    /**
     *
     */

    core.media = {
        luxury: 'https://i.imgur.com/DYHHd1i.png'
    };

    process.on( 'uncaughtException', err =>
        core.logger.error( `Uncaught Exception: ${
            err.stack.replace( new RegExp( `${__dirname}/`, 'g' ), './' )
        }` ) );

    process.on( 'ReferenceError', err =>
        core.logger.error( `ReferenceError: ${
            err.stack.replace( new RegExp( `${__dirname}/`, 'g' ), './' )
        }` ) );

    process.on( 'unhandledRejection', err =>
        core.logger.error( `Unhandled rejection: ${err.stack}` ) );

    process.on( 'warning', err =>
        core.logger.error( `warning: ${err.stack}` ) );
};