module.exports = ( core, db, project ) => {
    const get = id => {
        return db.collection( 'subscriptions' )
            .findOne({
                ownerId: id,
                project
            }, {
                projection: { _id: 0, project: 0, ownerId: 0 }
            })
            .catch( err => {
                core.logger.error(
                    `An error ocured while trying to get ${project} subscriptions: ${err.message}`
                );

                return null;
            });
    };

    const set = params => {
        return db.collection( 'subscriptions' )
            .updateOne({
                ownerId: params.ownerId, project
            }, {
                $set: {
                    ...params,
                    project
                }
            }, { upsert: true })
            .then( () => params )
            .catch( err => {
                return core.logger.error(
                    `An error ocured while trying to set ${project} subscriptions with params ${
                        JSON.stringify( params )
                    }: ${err.message}`
                );
            });
    };

    const getByName = name => {
        return db.collection( 'subscriptions' )
            .aggregate([
                {
                    $lookup: {
                        from: 'settings',
                        localField: 'ownerId',
                        foreignField: 'ownerId',
                        as: 'result'
                    }
                },
                { $unwind: '$result' },
                {
                    $project: {
                        _id: 0,
                        channels: `$${name}`,
                        language: '$result.language',
                        ownerId: 1
                    }
                }
            ])
            .toArray()
            .then( res => {
                return res.reduce( ( result, { ownerId, channels, language }) => {
                    if( channels ) {
                        result[ownerId] = { language, channels };
                    }

                    return result;
                }, {});
            })
            .catch( err => {
                core.logger.error(
                    `An error ocured while trying to get ${project} subs by ${name} name: ${err.message}`
                );

                return null;
            });
    };

    return { get, set, getByName };
};