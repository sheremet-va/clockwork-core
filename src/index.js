// Node 12.12 required (for Promise.allSettled)

const { promisify } = require( 'util' );
const { MongoClient } = require( 'mongodb' );
const readdir = promisify( require( 'fs' ).readdir );

const fastify = require( 'fastify' );

const core = {
    translations: require( './translation/translation' ),
    logger: require( './services/logger' ),
    config: require( './config' ),

    subscriptions: {},
    settings: {}
};

const app = fastify();

const init = async () => {
    const { checkAccess, prepare } = require( './services/middleware' )( core );

    app.register( checkAccess );
    app.register( prepare );

    const moduleFiles = await readdir( './src/modules/' );

    const modules = moduleFiles.reduce( ( modules, file ) => {
        if( !file.endsWith( '.js' ) ) {
            return modules;
        }

        modules[file.replace( '.js', '' )] = require( `./modules/${file}` )( core );

        return modules;
    }, {});

    const router = require( './services/router' )( modules );

    app.register( router );
    require( './services/subscriptions' )( core, modules );

    app.setErrorHandler( ( err, request, reply ) => {
        core.logger.error( `Error from ${request.ip}: \n${err.stack}`
            + `\n\nPARAMS: ${JSON.stringify( request.params )},`
            + `\nQUERY: ${JSON.stringify( request.query )},`
            + `\nBODY: ${JSON.stringify( request.body )}.` );

        return reply.error( err.message, err.render );
    });

    app.listen( core.config.PORT, () => core.logger.log( `Listening ${core.config.PORT} port.` ) );
};

MongoClient
    .connect( core.config.db.url, { useUnifiedTopology: true })
    .then( client => {
        const db = client.db( 'clockwork-core' );

        Object.keys( core.config.projects )
            .forEach( project => {
                core.subscriptions[project] = require( './controllers/subscriptions' )( core, db, project );
                core.settings[project] = require( './controllers/settings' )( core, db, project );
            });

        core.info = require( './controllers/info' )( core, db );
        core.info.drops = require( './controllers/drops' )( core, db );

        require( './services/util' )( core );
        require( './migrations/migration' )( core );

        init();
    })
    .catch( core.logger.error );