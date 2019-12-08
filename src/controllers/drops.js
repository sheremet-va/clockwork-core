module.exports = ( Core, db ) => {
    const get = ( start, end ) => {
        return db.collection( 'drops' )
            .find({
                startDate: { $gte: start },
                endDate: { $ls: end }
            })
            .toArray()
            .catch( err => Core.logger.error(
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
                Core.logger.error( `An error ocured while trying to set drops with params ${
                    JSON.stringify( params )
                }: ${err.message}` );
            });
    };

    return { get, set };
};