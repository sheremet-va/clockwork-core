const { CronJob } = require( 'cron' );

module.exports = ( Core, modules ) => {
    const merchants = require( './merchants' )( Core, modules.golden, modules.luxury );

    new CronJob( '0 50 */1 * * *', modules.drops.send ).start(); // DROPS subscription
    new CronJob( '5 */2 * * * *', modules.esn.send ).start(); // ESN-NEWS and RUESO subscriptions
    new CronJob( '10 */2 * * * 6', merchants.start ).start(); // GOLDEN and LUXURY subscriptions
    new CronJob( '10 */2 * * * 6', merchants.start ).start(); // GOLDEN and LUXURY subscriptions
    new CronJob( '15 */2 * * * *', modules.news.send ).start(); // NEWS subscription
    new CronJob( '20 */2 * * * *', modules.patch.send ).start(); // PATCH subscription
    new CronJob( '25 00 9 * * *', modules.pledges.send ).start(); // PLEDGES subscription
    new CronJob( '30 */3 * * * *', modules.status.send ).start(); // STATUS subscription
    new CronJob( '35 */10 * * * 1-2', modules.weekly.send ).start(); // WEEKLY subscription
};