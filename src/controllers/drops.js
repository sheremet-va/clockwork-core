module.exports = ( core, db ) => {
    const get = ( start, end ) => {
        return db.collection( 'drops' )
            .find({
                startDate: { $gte: start },
                endDate: { $ls: end }
            })
            .toArray()
            .catch( err => core.logger.error(
                `An error ocured while trying to get drops: ${err.message}`
            ) );
    };

    const set = params => {
        return db.collection( 'drops' )
            .updateOne({
                startDate: params.startDate,
                endDate: params.endDate
            }, { $set: params }, { upsert: true })
            .then( () => params )
            .catch( err => {
                core.logger.error( `An error ocured while trying to set drops with params ${
                    JSON.stringify( params )
                }: ${err.message}` );
            });
    };

    return { get, set };
};