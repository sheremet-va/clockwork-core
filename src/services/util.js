const axios = require( 'axios' );

const REPEAT_IN_SECONDS = 10000;
const REPEAT_NOTIFY_LIMIT = 30;

const GET_LIMIT = 10;

module.exports = Core => {
    const projects = Core.config.projects;

    Core.Error = class extends Error {
        constructor( message, render = {}) {
            super( message );

            this.result = 'error';
            this.message = message;
            this.code = 500;
            this.name = 'CoreError';
            this.render = render;
        }
    };

    Core.post = async ( project, options, limit = 1 ) => {
        if( limit > REPEAT_NOTIFY_LIMIT ) {
            return Promise.reject({ project });
        }

        const url = projects[project].url + options.url;

        options.data.token = Core.config.token;

        try {
            const res = await axios({
                method: 'post',
                data: options.data,
                url
            });

            return { status: res.data.result, project };
        } catch( err ) {
            Core.logger.error(
                `[${limit} try] Error while attempting to post ${options.url} to ${project}: ${err.message}`
            );

            await Core.wait( REPEAT_IN_SECONDS );

            return Core.post( project, options, ++limit );
        }
    };

    Core.notify = async ( name, data ) => {
        const promises = Object.keys( projects )
            .map( async project => {
                const subscribers = await Core.getSubsByName( project, name );

                if( Object.keys( subscribers ).length ) {
                    return Core.post( project, {
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
                        return res.value ? Core.logger.sub( name, res.value.project, res.value.status ) : null;
                    }

                    const { type, message } = res.reason;

                    if( message ) {
                        return Core.logger[type || 'error']( message );
                    }

                    // Отправить сообщение в дискорд/телеграм, что не смог отправить
                    return Core.logger.error(
                        `Number of attempts while trying to post "${name}" subscription to ${res.reason.project} exceeded.`
                    );
                })
            );
    };

    Core.get = async ( options, tries = 1 ) => {
        if( tries > GET_LIMIT ) {
            throw new Error( 'Number of attempts exceeded' );
        }

        return axios.get( options )
            .then( res => ({ result: 'ok', data: res.data }) )
            .catch( err => {
                Core.logger.error(
                    `[${tries} try] Error at Core.get "${options.url || options}": ${err.message}`
                );

                return Core.get( options, ++tries );
            });
    };

    Core.sendError = ( reply, lang, code, render = {}) => {
        if( Core.translations.errors[code]) {
            reply.send({
                result: 'error',
                message: Core.translations.errors[code][lang].render( render ),
                code
            });
        } else {
            reply.send({ result: 'error', code });
        }

        return false;
    };

    Core.getSettings = async ( project, id ) => {
        const projectInfo = projects[project];
        const defaults = projectInfo.vk
            ? Core.config.defaultVkSettings
            : Core.config.defaultSettings;

        const data = await Core.settings[project].get( id ) || {};

        return Object.keys( defaults ).reduce( ( returnObject, key ) => {
            returnObject[key] = data[key] ? data[key] : defaults[key];

            return returnObject;
        }, {});
    };

    Core.getAllLanguages = async ( project ) => {
        return await Core.settings[project].getAllLanguages();
    };

    Core.getSubsByName = async ( project, name ) => {
        return await Core.subscriptions[project].getByName( name );
    };

    Core.setSettings = ( project, options ) => {
        const { id, type, value } = options;
        const settings = { ownerId: id };

        settings[type] = value;

        return Core.settings[project].set( settings );
    };

    Core.getSubscriptions = async ( project, id ) => {
        return await Core.subscriptions[project].get( id ) || {};
    };

    Core.setSubscriptions = async ( project, options ) => {
        const { id, name, channels } = options;
        const subscriptions = { ownerId: id };

        subscriptions[name] = channels;

        return Core.subscriptions[project].set( subscriptions );
    };

    Core.wait = require( 'util' ).promisify( setTimeout );

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

    Core.media = {
        luxury: 'https://i.imgur.com/DYHHd1i.png'
    };

    process.on( 'uncaughtException', err =>
        Core.logger.error( `Uncaught Exception: ${
            err.stack.replace( new RegExp( `${__dirname}/`, 'g' ), './' )
        }` ) );

    process.on( 'ReferenceError', err =>
        Core.logger.error( `ReferenceError: ${
            err.stack.replace( new RegExp( `${__dirname}/`, 'g' ), './' )
        }` ) );

    process.on( 'unhandledRejection', err =>
        Core.logger.error( `Unhandled rejection: ${err.stack}` ) );

    process.on( 'warning', err =>
        Core.logger.error( `warning: ${err.stack}` ) );
};