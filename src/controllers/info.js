module.exports = ( Core, db ) => {
    const get = name => {
        return db.collection( 'info' )
            .findOne({ name }, { projection: { _id: 0, name: 0 } })
            .catch( err => Core.logger.error(
                `An error ocured while trying to get info: ${err.message}`
            ) );
    };

    const set = ( name, params ) => {
        return db.collection( 'info' )
            .updateOne({ name }, { $set: { name, ...params } }, { upsert: true })
            .then( () => params )
            .catch( err => Core.logger.error(
                `An error ocured while trying to set info with params ${
                    JSON.stringify( params )
                }: ${err.message}`
            ) );
    };

    return { get, set };
};