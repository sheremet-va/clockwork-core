module.exports = ( core, db, project ) => {
    const get = id => {
        return db.collection( 'settings' )
            .findOne({
                ownerId: id,
                project
            }, {
                projection: { _id: 0, project: 0, ownerId: 0 }
            })
            .catch( err => {
                core.logger.error(
                    `An error ocured while trying to get ${project} settings: ${err.message}`
                );

                return null;
            });
    };

    const set = params => {
        return db.collection( 'settings' )
            .updateOne({
                ownerId: params.ownerId,
                project
            }, {
                $set: {
                    ...params,
                    project
                }
            }, { upsert: true })
            .then( () => params )
            .catch( err => {
                return core.logger.error(
                    `An error ocured while trying to set ${project} settings with params ${
                        JSON.stringify( params )
                    }: ${err.message}`
                );
            });
    };

    return { get, set };
};