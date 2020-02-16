// {
//     ownerId: 'string',
//     project: 'string',
//     settings: {
//         setting: 'string'
//     },
//     subscriptions: {
//         name: ['number']
//     }
// }

/**
 * @param {Object} db db connection
 * @param {String} project project name
 * @param {String} type request type
 * @returns {{get: Function, set: Function}}
 */
module.exports = function( db, project, type ) {

    /**
     * returns all info about the user
     * @param {Number} ownerId user id
     * @returns {Object}
     */
    const get = ownerId => {
        return db.collection( 'users' )
            .findOne(
                { ownerId, project },
                { projection: { _id: 0 } }
            )
            .catch( err => {
                this.logger.error(
                    `An error ocured while trying to get ${project} ${type}: ${err.message}`
                );

                return {};
            });
    };

    /**
     * updates or creates a document with user
     * @param {Number} ownerId user id
     * @returns {Object}
     */
    const set = ( ownerId, params ) => {
        return db.collection( 'users' )
            .updateOne(
                { ownerId, project },
                {
                    $set: {
                        ownerId,
                        project,
                        [type]: params
                    }
                },
                { upsert: true }
            )
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

    const getSubsByName = ( name, { condition, settings }) => {
        const field = `subscriptions.${name}`;

        return db.collection( 'users' )
            .find(
                {
                    [field]: { $exists: true }
                },
                {
                    projection: {
                        _id: 0,
                        ownerId: 1,
                        settings: 1,
                        [field]: 1
                    }
                }
            )
            .toArray()
            .then( docs => {
                return docs.reduce( ( all, doc ) => {
                    if( !condition( doc ) ) {
                        return { all };
                    }

                    const id = doc.ownerId;
                    const result = {
                        settings: { ...settings, ...doc.settings },
                        subscriptions: doc.subscriptions[name]
                    };

                    return { ...all, [id]: result };
                }, {});
            })
            .catch( err => {
                this.logger.error(
                    `An error ocured while trying to get ${project} subs by ${name} name: ${err.message}`
                );

                return {};
            });
    };

    return { get, set, getSubsByName };
};