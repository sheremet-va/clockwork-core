const { CronJob } = require( 'cron' );

module.exports = function( modules ) {
    const merchants = require( './merchants' ).call( this, modules.golden, modules.luxury );

    Object.values( modules ).forEach( ({ time, send }) => {
        if( !send || !time ) {
            return;
        }

        new CronJob( time, send ).start();
    });

    new CronJob( merchants.time, merchants.start ).start(); // GOLDEN and LUXURY subscriptions
};