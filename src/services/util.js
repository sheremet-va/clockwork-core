const axios = require( 'axios' );

const REPEAT_IN_SECONDS = 10000;

const LIMIT_REPEAT_NOTIFY = 30;
const LIMIT_REPEAT_GET = 10;

module.exports = function() {
    const projects = this.config.projects;

    this.Error = class extends Error {
        constructor( message, render = {}) {
            super( message );

            this.result = 'error';
            this.message = message;
            this.code = 500;
            this.name = 'CoreError';
            // this.render = render;
        }
    };

    this.post = async ( project, options, limit = 1 ) => {
        if( limit > LIMIT_REPEAT_NOTIFY ) {
            return Promise.reject({ project });
        }

        const url = projects[project].url + options.url;

        options.data.token = this.config.token;

        try {
            const { data: { status } } = await axios({
                method: 'post',
                data: options.data,
                url
            });

            return { status, project };
        } catch( err ) {
            this.logger.error(
                `[${limit} try] Error while attempting to post ${options.url} to ${project}: ${err.message}`
            );

            await this.wait( REPEAT_IN_SECONDS );

            return this.post( project, options, ++limit );
        }
    };

    this.notify = async ( name, data ) => {
        const promises = Object.keys( projects )
            .map( async project => {
                const subscribers = await this.getSubsByName( project, name );

                if( Object.keys( subscribers ).length ) {
                    return this.post( project, {
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
                        return res.value ? this.logger.sub( name, res.value.project, res.value.status ) : null;
                    }

                    const { type, message } = res.reason;

                    if( message ) {
                        return this.logger[type || 'error']( message );
                    }

                    // Отправить сообщение в дискорд/телеграм, что не смог отправить
                    return this.logger.error(
                        `Number of attempts while trying to post "${name}" subscription to ${res.reason.project} exceeded.`
                    );
                })
            );
    };

    this.get = async ( options, tries = 1 ) => {
        if( tries > LIMIT_REPEAT_GET ) {
            throw new this.Error( `Number of attempts to get "${options.url || options}" exceeded` );
        }

        return axios.get( options )
            .then( ({ data }) => ({ result: 'ok', data }) )
            .catch( err => {
                this.logger.error(
                    `[${tries} try] Error at core.get "${options.url || options}": ${err.message}`
                );

                return this.get( options, ++tries );
            });
    };

    this.sendError = ( reply, lang, code, render = {}) => {
        if( this.translations.errors[code]) {
            reply.send({
                result: 'error',
                message: this.translations.errors[code][lang].render( render ),
                code
            });
        } else {
            reply.send({ result: 'error', code });
        }

        // добавить в логгер

        return false;
    };

    this.getSettings = async ( project, id ) => {
        const defaults = this.settings.config.defaults[project];

        const settings = await this.settings[project].get( id ) || {};

        return Object.entries( defaults )
            .reduce( ( result, [key, value]) =>
                ({ ...result, [key]: settings[key] ? settings[key] : value }), {});
    };

    this.getAllLanguages = async ( project ) => {
        return await this.settings[project].getAllLanguages();
    };

    this.getSubsByName = async ( project, name ) => {
        return await this.subscriptions[project].getByName( name );
    };

    this.setSettings = ( project, { id, type, value }) => {
        const settings = { ownerId: id, [type]: value };

        return this.settings[project].set( settings );
    };

    this.getSubscriptions = async ( project, id ) => {
        return await this.subscriptions[project].get( id ) || {};
    };

    this.setSubscriptions = async ( project, { id, name, channels }) => {
        const subscriptions = { ownerId: id, [name]: channels };

        return this.subscriptions[project].set( subscriptions );
    };

    this.wait = require( 'util' ).promisify( setTimeout );

    Object.defineProperty( String.prototype, 'render', {
        value( replaces ) {
            if( !replaces ) {
                return this;
            }

            return Object.keys( replaces )
                .reduce( ( final, replace ) => final
                    .replace( new RegExp( `{{\\s*${replace}\\s*}}`, 'g' ), replaces[replace]), this );
        }
    });

    Object.defineProperty( Object.prototype, 'render', {
        value( replaces ) {
            if( !replaces ) {
                return this;
            }

            return Object.keys( this )
                .reduce( ( final, lang ) => ({ ...final, [lang]: this[lang].render( replaces ) }), {});
        }
    });

    Object.defineProperty( Number.prototype, 'pluralize', {
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

    this.media = {
        luxury: 'https://i.imgur.com/DYHHd1i.png'
    };

    process.on( 'uncaughtException', err =>
        this.logger.error( `Uncaught Exception: ${
            err.stack.replace( new RegExp( `${__dirname}/`, 'g' ), './' )
        }` ) );

    process.on( 'ReferenceError', err =>
        this.logger.error( `ReferenceError: ${
            err.stack.replace( new RegExp( `${__dirname}/`, 'g' ), './' )
        }` ) );

    process.on( 'unhandledRejection', err => {
        if( err.name === 'CoreError' ) {
            return this.logger.error( `CoreError: ${err.message}` );
        }

        return this.logger.error( `Unhandled rejection: ${err.stack}` );
    });

    process.on( 'warning', err =>
        this.logger.error( `warning: ${err.stack}` ) );
};