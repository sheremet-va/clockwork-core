const __module = {
    name: 'subscriptions',
    path: '/subscriptions'
};

module.exports = function() {
    const getInfo = ( toSub, request ) => {
        const { name, channelId, subject } = request.body;

        const subs = request.subs;

        if( channelId === 0 ) {
            throw new this.Error( 'DONT_HAVE_RIGHTS_TO_SUBSCRIBE' );
        }

        const defaultAliases = this.subscriptions.config.subsAliases;

        const aliases = Object.keys( defaultAliases )
            .reduce( ( obj, sub ) => {
                const languages = Object.values( defaultAliases[sub])
                    .reduce( ( acc, value ) => [...acc, ...value], []);

                return { ...obj, [sub]: languages };
            }, {});

        const subName = Object.keys( aliases ).find( sub => aliases[sub].includes( name ) );

        if( !subName ) {
            throw new this.Error( 'INCORRECT_SUBSCRIPTION_NAME', { sub: name });
        }

        const nameAlias = this.translate( `subscriptions/aliases/${subName}` );

        const render = { sub: nameAlias, subject };

        validate( toSub, subs[subName], { channelId, render });

        return { subs, channelId, name: subName, subject, sub: nameAlias };
    };

    const validate = ( toSub, sub, { channelId, render }) => {
        if( toSub && sub && sub.includes( channelId ) ) {
            if( render.subject === 'user' ) {
                throw new this.Error( 'USER_ALREADY_SUBSCRIBED', render );
            }

            throw new this.Error( 'CHANNEL_ALREADY_SUBSCRIBED', render );
        } else if( !toSub && ( !sub || !sub.includes( channelId ) ) ) {
            if( render.subject === 'user' ) {
                throw new this.Error( 'USER_NOT_SUBSCRIBED', render );
            }

            throw new this.Error( 'CHANNEL_NOT_SUBSCRIBED', render );
        }
    };

    const get = async ({ settings: { prefix, language: lang }, subs }) => {
        const translated = {
            ...this.translate( 'commands/subscriptions', {
                to_subscribe: { prefix }
            }),
            subscriptions: []
        };

        const descriptions = this.translate( 'subscriptions/descriptions' );

        const {
            subsByLanguages: { [lang]: subsByLang, en: defaultSubs },
            subsAliases: aliases
        } = this.subscriptions.config;

        const translations = Object.entries( descriptions )
            .reduce( ( obj, [name, description]) => {
                if( !subsByLang.includes( name ) && !defaultSubs.includes( name ) ) {
                    return obj;
                }

                const [defaultAlias] = aliases[name].en;

                const title = lang === 'en'
                    ? defaultAlias
                    : aliases[name][lang][0];

                const subscriptionInfo = { title, description };

                return { ...obj, subscriptions: [...obj.subscriptions, subscriptionInfo] };
            }, translated );

        return { data: subs, translations };
    };

    const sub = async request => {
        const { subs, name, subject, channelId, sub } = getInfo( true, request );
        const { project, id } = request.info;

        const channels = subs[name] ? [...subs[name], channelId] : [channelId];

        const translations = this.translate( 'commands/subscribe', {
            success_channel: { subject, sub },
            success_user: { sub }
        });

        this.setSubscriptions( project, { id, name, channels });

        return { translations };
    };

    const unsub = async request => {
        const { subs, name, subject, channelId, sub } = getInfo( false, request );
        const { project, id } = request.info;

        const channels = subs[name].filter( id => id !== channelId );

        const translations = this.translate( 'commands/unsubscribe', {
            success_channel: { subject, sub },
            success_user: { sub }
        });

        this.setSubscriptions( project, { id, name, channels });

        return { translations };
    };

    return { ...__module, get, sub, unsub };
};