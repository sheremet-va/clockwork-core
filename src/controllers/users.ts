import { Db } from 'mongodb';

import { SubscriptionsConfig } from '../configs/subscriptions';
import { defaults, SettingsConfig } from '../configs/settings';

import { CoreError } from '../services/core';

export declare interface User {
    ownerId: string;
    project: project;
    settings: Settings;
    subscriptions: Subscriptions;
}

declare global {
    type Subscriptions = {
        [key: string]: string[];
    }
}

export declare interface UsersObject {
    [key: string]: User[];
}

class UsersController {
    #db: Db;
    #project: project;

    type: string;
    default: Settings;

    constructor(db: Db, project: project, type: string) {
        this.#db = db;
        this.#project = project;

        this.default = defaults[this.#project];

        this.type = type;
    }

    async get(ownerId: string): Promise<User> {
        const defaults = {
            ownerId,
            project: this.#project,
            settings: this.default,
            subscriptions: {}
        };

        try {
            const user = await this.#db.collection('users')
                .findOne(
                    {
                        ownerId,
                        project: this.#project
                    },
                    { projection: { _id: 0 } }
                ) as User;

            if( !user ) {
                return defaults;
            }

            return {
                ...defaults,
                settings: { ...this.default, ...user.settings },
                subscriptions: user.subscriptions || {}
            };
        }
        catch (err) {
            throw new CoreError(`An error ocured while trying to get ${this.#project} ${this.type}: ${err.message}`);
        }
    }

    async set<T>(ownerId: string, params: T): Promise<T> {
        try {
            await this.#db.collection('users')
                .updateOne({
                    ownerId,
                    project: this.#project
                }, {
                    $set: {
                        ownerId,
                        project: this.#project,
                        [this.type]: params
                    }
                }, { upsert: true });
            return params;
        }
        catch (err) {
            const stringified = JSON.stringify(params);

            throw new CoreError(
                `An error ocured while trying to set ${this.#project} ${this.type} with params ${stringified}: ${err.message}`
            );
        }
    }

    async getSubsByName(
        name: keyof Subscriptions,
        settings: Settings,
        condition: (user: User) => boolean
    ): Promise<UsersObject> {
        const field = `subscriptions.${name}`;

        try {
            const docs = await this.#db.collection('users')
                .find({
                    project: this.#project,
                    [field]: { $exists: true }
                }, {
                    projection: {
                        _id: 0,
                        ownerId: 1,
                        settings: 1,
                        [field]: 1
                    }
                })
                .toArray() as User[];

            return docs.reduce((all, doc) => {
                const passed = condition({
                    ...doc,
                    settings: { ...settings, ...doc.settings }
                });

                if (!passed) {
                    return all;
                }

                const id = doc.ownerId;
                const result = {
                    settings: doc.settings,
                    subscriptions: doc.subscriptions[name]
                };
                return { ...all, [id]: result };
            }, {});
        }
        catch (err) {
            throw new CoreError(`An error ocured while trying to get ${this.#project} subs by ${name} name: ${err.message}`);
        }
    }
}

export class SubscriptionsController extends UsersController {
    config!: SubscriptionsConfig;

    constructor(db: Db, project: project) {
        super(db, project, 'subscriptions');
    }
}

export class SettingsController extends UsersController {
    config!: SettingsConfig;

    constructor(db: Db, project: project) {
        super(db, project, 'settings');
    }
}