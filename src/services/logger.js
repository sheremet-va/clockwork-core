const moment = require( 'moment' );
const fs = require( 'fs' );
const { promisify } = require( 'util' );

const appendFile = promisify( fs.appendFile );
const writeFile = promisify( fs.writeFile );

exports.log = async ( content, type = 'log' ) => {
    const now = moment();

    const timestamp = `[${now.format( 'YYYY-MM-DD HH:mm:ss' )}]:`;
    const day = `${now.format( 'YYYY-MM-DD' )}`;

    const message = `${timestamp} (${type.toUpperCase()}) ${content}`;
    const path = `src/logs/${day}-logs.txt`;

    try {
        await appendFile( path, `${message}\n` );
    } catch ( e ) {
        await writeFile( path, `${message}\n` )
            .catch( console.error );
    }

    return console.log( message );
};

exports.sub = ( name, project, result ) => this.log(
    `The ${name.toUpperCase()} subscription message was sent to "${project}" project with status ${result}.`,
    'sub'
);

exports.error = ( ...args ) => this.log( ...args, 'error' );
exports.warn = ( ...args ) => this.log( ...args, 'warn' );