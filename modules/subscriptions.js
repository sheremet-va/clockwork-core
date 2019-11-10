// sub
// unsub
// subs

module.exports = core => {
    const send = () => true;
    const get = () => true;
    const set = () => true;
    const sub = ( request, reply ) => {
        const lang = request.settings.language;
        const { name, id } = request.params;
        const subs = request.subs;

        if( id === '0' ) {
            return reply.error( 'DONT_HAVE_RIGHTS_TO_SUBSCRIBE' );
        }

        const aliases = core.config.subsAliases;
        const subName = Object.keys( aliases ).findIndex( sub => aliases[sub].includes( name ) );

        if( subName === -1 ) {
            return reply.error( 'INCORRECT_SUBSCRIPTION_NAME', { sub: name });
        }

        const ids = subs[name].split( ',' );

        if( ids.includes( id ) ) {
            return reply.error( 'ALREADY_SUBSCRIBED', { sub: name });
        }

        const translations = core.translate( 'commands/subscriptions', lang );

        // core.subscribe( request.info, { name, id });

        return reply.ok({ translations });
    };
    const unsub = () => true;

    return { send, get, set, sub, unsub };
};