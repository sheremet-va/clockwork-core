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
            this.renderObject = render;
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
                subscribers: options.subscribers,
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
                const url = `/subscriptions/${name}`;

                if( Object.keys( subscribers ).length ) {
                    return this.post( project, { url, subscribers, data });
                }

                return Promise.reject({
                    message: `No one is subscribed to ${name} on "${project}" project.`, type: 'warn'
                });
            });

        Promise.allSettled( promises )
            .then( result =>
                result.forEach( res => {
                    if( res.status === 'fulfilled' ) {
                        const { value, status, project } = res.value;

                        return value ? this.logger.sub( name, project, status ) : null;
                    }

                    const { type, message } = res.reason;

                    if( message ) {
                        return this.logger[type || 'error']( message );
                    }

                    // Отправить сообщение в дискорд/телеграм, что не смог отправить
                    return this.logger.error(
                        `Number of attempts while trying to post "${
                            name
                        }" subscription to ${res.reason.project} exceeded.`
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

    this.sendError = ( reply, lang = 'en', code = 'NOT_FOUND', render = {}) => {
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

    this.getUser = async ( project, id ) => {
        const defaults = this.settings.config.defaults[project];

        const user = await this.users[project].get( id ) || { settings: {}, subscriptions: {} };

        const settings = Object.entries( defaults )
            .reduce( ( result, [key, value]) =>
                ({ ...result, [key]: user.settings[key] ? user.settings[key] : value }), {});

        return { ...user, settings };
    };

    this.getSubsByName = async ( project, name ) => {
        return await this.subscriptions[project].getSubsByName( name );
    };

    this.setSettings = ( project, was, { id, type, value }) => {
        const defaults = this.settings.config.defaults[project];
        const settings = { ...was, [type]: value };

        const rebuild = Object.entries( defaults )
            .filter( ([key, value]) => settings[key] !== value )
            .reduce( ( result, [key]) => ({ ...result, [key]: settings[key] }), {});

        return this.settings[project].set( id, rebuild );
    };

    this.setSubscriptions = async ( project, was, { id, name, channels }) => {
        const subscriptions = { ...was, [name]: channels };

        const rebuild = Object.entries( subscriptions )
            .filter( ([, value]) => value.length !== 0 )
            .reduce( ( result, [key, value]) => ({ ...result, [key]: value }), {});

        return this.subscriptions[project].set( id, rebuild );
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

    process.on( 'uncaughtException', err => {
        this.logger.error( err.stack );
    }
        /* this.logger.error( `Uncaught Exception: ${
            err.stack.replace( new RegExp( `${__dirname}/`, 'g' ), './' )
        }` ) */ );

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