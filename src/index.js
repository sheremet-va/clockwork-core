// Node 12.12 required (for Promise.allSettled)

const { promisify } = require( 'util' );
const { MongoClient } = require( 'mongodb' );
const readdir = promisify( require( 'fs' ).readdir );

const fastify = require( 'fastify' );

const Core = {
    translations: require( './translation/translation' ),
    logger: require( './services/logger' ),
    config: require( './config' ),

    subscriptions: {},
    settings: {}
};

const app = fastify();

const init = async () => {
    const { checkAccess, prepare } = require( './services/middleware' )( Core );

    app.register( checkAccess );
    app.register( prepare );

    const moduleFiles = await readdir( './src/modules/' );

    const modules = moduleFiles.reduce( ( modules, file ) => {
        if( !file.endsWith( '.js' ) ) {
            return modules;
        }

        modules[file.replace( '.js', '' )] = require( `./modules/${file}` )( Core );

        return modules;
    }, {});

    const router = require( './services/router' )( modules );

    app.register( router );
    require( './services/subscriptions' )( Core, modules );

    app.setErrorHandler( ( err, request, reply ) => {
        Core.logger.error( `Error from ${request.ip}: \n${err.stack}`
            + `\n\nPARAMS: ${JSON.stringify( request.params )},`
            + `\nQUERY: ${JSON.stringify( request.query )},`
            + `\nBODY: ${JSON.stringify( request.body )}.` );

        return reply.error( err.message, err.render );
    });

    app.listen( Core.config.PORT, () => Core.logger.log( `Listening ${Core.config.PORT} port.` ) );
};

MongoClient
    .connect( Core.config.db.url, { useUnifiedTopology: true })
    .then( client => {
        const db = client.db( 'clockwork-core' );

        Object.keys( Core.config.projects )
            .forEach( project => {
                Core.subscriptions[project] = require( './controllers/subscriptions' )( Core, db, project );
                Core.settings[project] = require( './controllers/settings' )( Core, db, project );
            });

        Core.info = require( './controllers/info' )( Core, db );
        Core.info.drops = require( './controllers/drops' )( Core, db );

        require( './services/util' )( Core );
        require( './migrations/migration' )( Core );

        init();
    })
    .catch( Core.logger.error );
    .catch( core.logger.error );