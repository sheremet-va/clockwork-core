// const drop = {
//     startDate: 'timestamp',
//     endDate: 'timestamp',
//     where: 'string',
//     url: 'string',
//     info: 'string',
//     sending: 'string',
//     sendingDate: 'timestamp'
// };

module.exports = function( db ) {
    const get = now => {
        return db.collection( 'drops' )
            .find(
                { endDate: { $gte: now } },
                { projection: { _id: 0 } }
            )
            .toArray()
            .catch( err => this.logger.error(
                `An error ocured while trying to get drops: ${err.message}`
            ) );
    };

    const set = params => {
        return db.collection( 'drops' )
            .updateOne(
                {
                    startDate: params.startDate,
                    endDate: params.endDate
                },
                { $set: params },
                { upsert: true }
            )
            .then( () => params )
            .catch( err => {
                this.logger.error( `An error ocured while trying to set drops with params ${
                    JSON.stringify( params )
                }: ${err.message}` );
            });
    };

    const remove = ( startDate, endDate ) => {
        return db.collection( 'drops' )
            .remove(
                {
                    startDate,
                    endDate
                }
            )
            .then( () => ({ startDate, endDate }) )
            .catch( err => err );
    }

    return { get, set, remove };
};