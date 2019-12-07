const axios = require( 'axios' );

const REPEAT_IN_SECONDS = 10000;
const REPEAT_NOTIFY_LIMIT = 30;

const GET_LIMIT = 10;

module.exports = core => {
    const projects = core.config.projects;

    core.Error = class extends Error {
        constructor( message, render = {}) {
            super( message );

            this.result = 'error';
            this.message = message;
            this.code = 500;
            this.name = 'CoreError';
            this.render = render;
        }
    };

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
        } catch( err ) {
            core.logger.error(
                `[${limit} try] Error while attempting to post ${options.url} to ${project}: ${err.message}`
            );

            await core.wait( REPEAT_IN_SECONDS );

            return core.post( project, options, ++limit );
        }
    };

    core.notify = async ( name, data ) => {
        const promises = Object.keys( projects )
            .map( async project => {
                const subscribers = await core.getSubsByName( project, name );

                if( Object.keys( subscribers ).length ) {
                    return core.post( project, {
                        url: `/subscriptions/${name}`,
                        subscribers,
                        data
                    });
                }

                return Promise.reject({
                    message: `No one is subscribed to ${name} on "${project}" project.`,
                    type: 'warn'
                });
            });

        Promise.allSettled( promises )
            .then( result =>
                result.forEach( res => {
                    if( res.status === 'fulfilled' ) {
                        return res.value ? core.logger.sub( name, res.value.project, res.value.status ) : null;
                    }

                    const { type, message } = res.reason;

                    if( message ) {
                        return core.logger[type || 'error']( message );
                    }

                    // Отправить сообщение в дискорд/телеграм, что не смог отправить
                    return core.logger.error(
                        `Number of attempts while trying to post "${name}" subscription to ${res.reason.project} exceeded.`
                    );
                })
            );
    };

    core.get = async ( options, tries = 1 ) => {
        if( tries > GET_LIMIT ) {
            throw new Error( 'Number of attempts exceeded' );
        }

        return axios.get( options )
            .then( res => ({ result: 'ok', data: res.data }) )
            .catch( err => {
                core.logger.error(
                    `[${tries} try] Error at core.get "${options.url || options}": ${err.message}`
                );

                return core.get( options, ++tries );
            });
    };

    core.sendError = ( reply, lang, code, render = {}) => {
        if( core.translations.errors[code]) {
            reply.send({
                result: 'error',
                message: core.translations.errors[code][lang].render( render ),
                code
            });
        } else {
            reply.send({ result: 'error', code });
        }

        return false;
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

    core.getAllLanguages = async ( project ) => {
        return await core.settings[project].getAllLanguages();
    };

    core.getSubsByName = async ( project, name ) => {
        return await core.subscriptions[project].getByName( name );
    };

    core.setSettings = ( project, options ) => {
        const { id, type, value } = options;
        const settings = { ownerId: id };

        settings[type] = value;

        return core.settings[project].set( settings );
    };

    core.getSubscriptions = async ( project, id ) => {
        return await core.subscriptions[project].get( id ) || {};
    };

    core.setSubscriptions = async ( project, options ) => {
        const { id, name, channels } = options;
        const subscriptions = { ownerId: id };

        subscriptions[name] = channels;

        return core.subscriptions[project].set( subscriptions );
    };

    core.wait = require( 'util' ).promisify( setTimeout );

    Object.defineProperty( String.prototype, 'render', {
        value( replaces ) {
            if( replaces ) {
                return Object.keys( replaces )
                    .reduce( ( final, replace ) => final
                        .replace( new RegExp( `{{\\s*${replace}\\s*}}`, 'g' ), replaces[replace]), this );
            }

            return this;
        }
    });

    Object.defineProperty( Object.prototype, 'render', {
        value( replaces ) {
            if( replaces ) {
                return Object.keys( this ).reduce( ( final, lang ) => {
                    final[lang] = this[lang].render( replaces );

                    return final;
                }, {});
            }

            return this;
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