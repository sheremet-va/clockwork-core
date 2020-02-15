// Node 12.12 required (for Promise.allSettled)

const { promisify } = require( 'util' );
const { MongoClient } = require( 'mongodb' );
const readdir = promisify( require( 'fs' ).readdir );

const app = require( 'fastify' )();

const core = {
    translations: require( './translation/translation' ),
    logger: require( './services/logger' ),
    config: require( './configs/main' ),

    subscriptions: {
        config: require( './configs/subscriptions' )
    },
    settings: {
        config: require( './configs/settings' )
    }
};

const init = async () => {
    const { checkAccess, prepare } = require( './services/middleware' ).call( core );

    app.register( checkAccess );
    app.register( prepare );

    const moduleFiles = await readdir( './src/modules/' );

    const modules = moduleFiles.reduce( ( modules, file ) => {
        if( !file.endsWith( '.js' ) ) {
            return modules;
        }

        const [name] = file.split( '.' );

        return {
            ...modules,
            [name]: require( `./modules/${file}` ).call( core )
        };
    }, {});

    const router = require( './services/router' ).call( core, modules );

    app.register( router );

    require( './services/subscriptions' ).call( core, modules );

    app.setErrorHandler( ( err, request, reply ) => {
        if( err.name !== 'CoreError' ) {
            core.logger.error(
                `Error from ${request.ip}: \n${err.stack}`
                + `\n\nPARAMS: ${JSON.stringify( request.params )},`
                + `\nQUERY: ${JSON.stringify( request.query )},`
                + `\nBODY: ${JSON.stringify( request.body )}.`
            );
        }

        return reply.error( err.message, err.renderObject );
    });

    app.listen( core.config.PORT, () => core.logger.log( `Listening ${core.config.PORT} port.` ) );
};

MongoClient
    .connect( core.config.db.url, { useUnifiedTopology: true })
    .then( client => {
        const db = client.db( 'clockwork-core' );

        require( './services/util' ).call( core );

        Object.keys( core.config.projects )
            .forEach( project => {
                core.subscriptions[project] = require( './controllers/users' ).call( core, db, project, 'subscriptions' );
                core.settings[project] = require( './controllers/users' ).call( core, db, project, 'settings' );
            });

        core.info = require( './controllers/info' ).call( core, db );
        core.info.drops = require( './controllers/drops' ).call( core, db );

        require( './migrations/migration' )( core );

        init();
    })
    .catch( core.logger.error );