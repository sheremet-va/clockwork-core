import { Db, Collection } from 'mongodb';

import { SubscriptionsConfig, subsByLanguages } from '../configs/subscriptions';
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
    [key: string]: {
        settins: Settings;
        channels: string[];
    };
}

class UsersController {
    readonly #project: project;

    type: string;
    default: Settings;
    collection: Collection<User>;

    constructor(db: Db, project: project, type: string) {
        this.collection = db.collection<User>('users');
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
            const user = await this.collection
                .findOne<User>(
                {
                    ownerId,
                    project: this.#project
                },
                { projection: { _id: 0 } }
            );

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
            await this.collection
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
        defaultSettings: Settings,
        condition: (user: User) => boolean
    ): Promise<UsersObject> {
        const field = `subscriptions.${name}`;

        try {
            const docs = await this.collection
                .find<User>({
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
                .toArray();

            return docs.reduce((all, doc) => {
                const settings = { ...defaultSettings, ...(doc.settings || {}) };
                const subName = name as string;

                if( !subsByLanguages[settings.language].includes(subName) &&
                    !subsByLanguages.en.includes(subName)
                ) {
                    return all;
                }

                const passed = condition({
                    ...doc,
                    settings
                });

                if (!passed) {
                    return all;
                }

                const id = doc.ownerId;
                const result = {
                    settings: doc.settings,
                    channels: doc.subscriptions[name]
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