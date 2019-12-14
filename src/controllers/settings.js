// DEPRICATED

module.exports = ( db, project ) => {
    const get = id => {
        return db.collection( 'settings' )
            .findOne({
                ownerId: id,
                project
            }, {
                projection: { _id: 0, project: 0, ownerId: 0 }
            })
            .catch( err => {
                this.logger.error(
                    `An error ocured while trying to get ${project} settings: ${err.message}`
                );

                return {};
            });
    };

    // вызвать еще раз, но в Core - раз 10, если не получилось - кидать ошибку, но пропускать дальше
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
                this.logger.error(
                    `An error ocured while trying to set ${project} settings with params ${
                        JSON.stringify( params )
                    }: ${err.message}`
                );

                return {};
            });
    };

    return { get, set };
};