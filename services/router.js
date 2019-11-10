module.exports = modules => {
    return ( app, opts, done ) => {
        app.get( '/drops', modules.drops.get );
        app.get( '/golden', modules.golden.get );
        app.get( '/luxury', modules.luxury.get );
        app.get( '/patch-notes', modules.patch.get );
        app.get( '/pledges/:days', modules.pledges.get );
        app.get( '/rueso', modules.esn.get );
        app.get( '/settings', modules.settings.get );
        app.get( '/status', modules.status.get );
        app.get( '/weekly', modules.weekly.get );

        app.get( '/subscriptions', modules.subscriptions.get );
        app.get( '/subscriptions/:name/:id/sub', modules.subscriptions.sub );
        app.get( '/subscriptions/:name/:id/unsub', modules.subscriptions.unsub );

        app.post( '/settings/:type/:value', modules.settings.set );

        done();
    };
};