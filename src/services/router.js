module.exports = function( modules ) {
    return ( app, _, done ) => {
        // building ONLY `get` paths
        Object.values( modules ).forEach( ({ get, path }) => {
            if( !get || !path ) {
                return;
            }

            app.get( path, get );
        });

        app.post( '/subscriptions/sub', modules.subscriptions.sub );
        app.post( '/subscriptions/unsub', modules.subscriptions.unsub );

        app.post( '/settings/:type/:value', modules.settings.set );

        done();
    };
};