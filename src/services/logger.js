const moment = require( 'moment' );
// const fs = require( 'fs' );

exports.log = ( content, type = 'log' ) => {
    const timestamp = `[${moment().format( 'YYYY-MM-DD HH:mm:ss' )}]:`;
    // const day = `${moment().format( 'YYYY-MM-DD' )}`;

    const message = `${timestamp} (${type.toUpperCase()}) ${content}`;

    /* fs.appendFile( `logs/${day}-logs.txt`, `${message}\n`, err => {
        if ( err ) fs.writeFile( `logs/${day}-logs.txt`, `${message}\n`, error => {
            if ( error ) throw new Error( err );
        });
    }); */

    console.log( message );
};

exports.sub = ( name, project, result ) => this.log(
    `The ${name.toUpperCase()} subscription message was sent to "${project}" project with status ${result}.`,
    'sub'
);

exports.error = ( ...args ) => this.log( ...args, 'error' );
exports.warn = ( ...args ) => this.log( ...args, 'warn' );