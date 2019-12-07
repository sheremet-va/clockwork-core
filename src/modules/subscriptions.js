module.exports = core => {
    const verify = ( toSub, request, reply ) => {
        const { name, channelId, subject } = request.body;

        const subs = request.subs;

        if( channelId === '0' ) {
            return reply.error( 'DONT_HAVE_RIGHTS_TO_SUBSCRIBE' );
        }

        const defaultAliases = core.config.subsAliases;

        const aliases = Object.keys( defaultAliases )
            .reduce( ( obj, sub ) => {
                const languages = Object.keys( defaultAliases[sub]);

                obj[sub] = languages.reduce( ( acc, lang ) => [ ...acc, ...defaultAliases[sub][lang] ], []);

                return obj;
            }, {});

        const subName = Object.keys( aliases ).find( sub => aliases[sub].includes( name ) );

        if( !subName ) {
            return reply.error( 'INCORRECT_SUBSCRIPTION_NAME', { sub: name });
        }

        const nameAlias = core.translate( `subscriptions/aliases/${subName}` );

        const render = { sub: nameAlias, subject };

        if( toSub && subs[subName] && subs[subName].includes( channelId ) ) {
            return subject === 'user'
                ? reply.error( 'USER_ALREADY_SUBSCRIBED' )
                : reply.error( 'CHANNEL_ALREADY_SUBSCRIBED', render );
        } else if( !toSub && ( !subs[subName] || !subs[subName].includes( channelId ) ) ) {
            return subject === 'user'
                ? reply.error( 'USER_NOT_SUBSCRIBED' )
                : reply.error( 'CHANNEL_NOT_SUBSCRIBED', render );
        }

        return { subs, channelId, name: subName, subject, nameAlias };
    };

    const get = ( request, reply ) => {
        const settings = request.settings;

        const translated = {
            ...core.translate( 'commands/subscriptions', {
                to_subscribe: { prefix: settings.prefix }
            }),
            subscriptions: {}
        };
        const descriptions = core.translate( 'subscriptions/descriptions' );

        const lang = settings.language;

        const availableSubs = core.config.subsByLanguages[lang];
        const defaultSubs = core.config.subsByLanguages.en;
        const aliases = core.config.subsAliases;

        const translations = Object.keys( descriptions )
            .reduce( ( obj, name ) => {
                if( availableSubs.includes( name ) || defaultSubs.includes( name ) ) {
                    const defaultAliases = aliases[name]['en'];

                    const alias = lang === 'en'
                        ? defaultAliases
                        : [ ...defaultAliases, ...aliases[name][lang] ];

                    obj.subscriptions[name] = {
                        aliases: alias,
                        description: descriptions[name]
                    };
                }
                return obj;
            }, translated );

        return reply.with({ data: request.subs, translations });
    };

    const sub = ( request, reply ) => {
        const verified = verify( true, request, reply );

        if( !verified ) {
            return;
        }

        const { subs, name, subject, channelId, nameAlias } = verified;
        const { project, id } = request.info;

        const channels = subs[name] ? [ ...subs[name], channelId ] : [ channelId ];

        const translations = core.translate( 'commands/subscribe', {
            success_channel: { subject, sub: nameAlias },
            success_user: { sub: nameAlias }
        });

        core.setSubscriptions( project, { id, name, channels });

        return reply.with({ translations });
    };

    const unsub = ( request, reply ) => {
        const verified = verify( false, request, reply );

        if( !verified ) {
            return;
        }

        const { subs, name, subject, channelId, nameAlias } = verified;
        const { project, id } = request.info;

        const channels = subs[name].filter( id => id !== channelId );

        const translations = core.translate( 'commands/unsubscribe', {
            success_channel: { subject, sub: nameAlias },
            success_user: { sub: nameAlias }
        });

        core.setSubscriptions( project, { id, name, channels });

        return reply.with({ translations });
    };

    return { get, sub, unsub };
};