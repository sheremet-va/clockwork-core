module.exports = Core => {
    const getInfo = ( toSub, request ) => {
        const { name, channelId, subject } = request.body;

        const subs = request.subs;

        if( channelId === 0 ) {
            throw new Core.Error( 'DONT_HAVE_RIGHTS_TO_SUBSCRIBE' );
        }

        const defaultAliases = Core.config.subsAliases;

        const aliases = Object.keys( defaultAliases )
            .reduce( ( obj, sub ) => {
                const languages = Object.keys( defaultAliases[sub]);

                obj[sub] = languages.reduce( ( acc, lang ) => [ ...acc, ...defaultAliases[sub][lang] ], []);

                return obj;
            }, {});

        const subName = Object.keys( aliases ).find( sub => aliases[sub].includes( name ) );

        if( !subName ) {
            throw new Core.Error( 'INCORRECT_SUBSCRIPTION_NAME', { sub: name });
        }

        const nameAlias = Core.translate( `subscriptions/aliases/${subName}` );

        const render = { sub: nameAlias, subject };

        if( toSub && subs[subName] && subs[subName].includes( channelId ) ) {
            if( subject === 'user' ) {
                throw new Core.Error( 'USER_ALREADY_SUBSCRIBED' );
            }

            throw new Core.Error( 'CHANNEL_ALREADY_SUBSCRIBED', render );
        } else if( !toSub && ( !subs[subName] || !subs[subName].includes( channelId ) ) ) {
            if( subject === 'user' ) {
                throw new Core.Error( 'USER_NOT_SUBSCRIBED' );
            }

            throw new Core.Error( 'CHANNEL_NOT_SUBSCRIBED', render );
        }

        return { subs, channelId, name: subName, subject, nameAlias };
    };

    const get = async request => {
        const settings = request.settings;

        const translated = {
            ...Core.translate( 'commands/subscriptions', {
                to_subscribe: { prefix: settings.prefix }
            }),
            subscriptions: {}
        };
        const descriptions = Core.translate( 'subscriptions/descriptions' );

        const lang = settings.language;

        const availableSubs = Core.config.subsByLanguages[lang];
        const defaultSubs = Core.config.subsByLanguages.en;
        const aliases = Core.config.subsAliases;

        const translations = Object.keys( descriptions )
            .reduce( ( obj, name ) => {
                if( availableSubs.includes( name ) || defaultSubs.includes( name ) ) {
                    const defaultAliases = aliases[name]['en'];

                    const title = lang === 'en'
                        ? defaultAliases[0]
                        : aliases[name][lang][0];

                    obj.subscriptions[name] = {
                        title,
                        description: descriptions[name]
                    };
                }
                return obj;
            }, translated );

        return { data: request.subs, translations };
    };

    const sub = request => {
        const { subs, name, subject, channelId, nameAlias } = getInfo( true, request );
        const { project, id } = request.info;

        const channels = subs[name] ? [ ...subs[name], channelId ] : [ channelId ];

        const translations = Core.translate( 'commands/subscribe', {
            success_channel: { subject, sub: nameAlias },
            success_user: { sub: nameAlias }
        });

        Core.setSubscriptions( project, { id, name, channels });

        return { translations };
    };

    const unsub = async request => {
        const { subs, name, subject, channelId, nameAlias } = getInfo( false, request );
        const { project, id } = request.info;

        const channels = subs[name].filter( id => id !== channelId );

        const translations = Core.translate( 'commands/unsubscribe', {
            success_channel: { subject, sub: nameAlias },
            success_user: { sub: nameAlias }
        });

        Core.setSubscriptions( project, { id, name, channels });

        return { translations };
    };

    return { get, sub, unsub };
};