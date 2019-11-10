module.exports = ( core, db, project ) => {
    const get = async id => {
        return db.collection( `settings_${project}` )
            .findOne({ ownerId: id })
            .then( settings => settings )
            .catch( err => {
                core.logger.error(
                    `An error ocured while trying to get ${project} settings with params ${JSON.stringify( params )}: ${err}`
                );

                return null;
            });
    };

    const set = async params => {
        return db.collection( `settings_${project}` )
            .updateOne({ ownerId: params.ownerId }, { $set: params }, { upsert: true })
            .then( () => params )
            .catch( err => {
                core.logger.error(
                    `An error ocured while trying to set ${project} settings with params ${JSON.stringify( params )}: ${err}`
                );

                return null;
            });
    };

    return { get, set };
};