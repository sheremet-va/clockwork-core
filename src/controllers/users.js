module.exports = function( db, project, type ) {
    const get = id => {
        return db.collection( 'users' )
            .findOne({
                ownerId: id,
                project
            }, {
                projection: { _id: 0, [type]: 1 }
            })
            .catch( err => {
                this.logger.error(
                    `An error ocured while trying to get ${project} ${type}: ${err.message}`
                );

                return {};
            });
    };

    const set = params => {
        return db.collection( 'users' )
            .updateOne({
                ownerId: params.ownerId, project
            }, {
                $set: {
                    ownerId: params.ownerId,
                    [type]: params.insert, // передавать вместе со старыми
                    project
                }
            }, { upsert: true })
            .then( () => params )
            .catch( err => {
                this.logger.error(
                    `An error ocured while trying to set ${project} subscriptions with params ${
                        JSON.stringify( params )
                    }: ${err.message}`
                );

                return {};
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
                    if( !channels ) {
                        return result;
                    }

                    return { ...result, [ownerId]: { language, channels } };
                }, {});
            })
            .catch( err => {
                this.logger.error(
                    `An error ocured while trying to get ${project} subs by ${name} name: ${err.message}`
                );

                return {};
            });
    };

    return { get, set, getByName };
};