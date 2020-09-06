import { Db } from 'mongodb';

import { CoreError } from '../services/core';

type Action = 'error' | 'command';

import moment from 'moment';

export declare interface ErrorLog {
    project: project | 'core';
    message: string;
    type: string;
    stack: string | null;
    date: Date;
}

export declare interface CommandLog {
    project: project | 'core';
    guildId: string;
    channelId: string;
    authorId: string;
    command: string;
    alias: string;
    arguments: string[];
    date: Date;
}

type Filters = {
    offset?: number;
    limit?: number;
    date_from?: Date;
    date_to?: Date;
    contains?: string;
    type?: string;
    project?: string;
}

export declare type Log = ErrorLog | CommandLog;

export class LogsController {
    readonly #db: Db;

    private readonly ERRORS_COLLECTION = 'logs_error';

    constructor(db: Db) {
        this.#db = db;
    }

    async set(action: Action, body: Log): Promise<void> {
        if ('date' in body) {
            body.date = new Date(body.date);
        }

        try {
            await this.#db.collection(`logs_${action}`).insertOne(body);
        }
        catch (err) {
            throw new CoreError(`An error ocured while trying to set a ${action} log: ${err.message}`);
        }
    }

    async getErrorTypes() {
        const collection = this.#db.collection('logs_error');

        return collection.distinct('type');
    }

    async getErrors(filters: Filters): Promise<{ data: ErrorLog[]; count: number }> {
        const offset = Number(filters.offset) || 0;
        const limit = Number(filters.limit) || 30;

        type Query = {
            // date: {
            //     $gte: Date;
            //     $lt: Date;
            // };
            $text?: { $search: string };
            type?: string;
            project?: string;
        }

        const query: Query = {
            // date: {
            //     $gte: filters.date_from || moment().subtract(1, 'year').toDate(),
            //     $lt: filters.date_to || new Date()
            // }
        };

        if(filters.contains) {
            query.$text = {
                $search: filters.contains
            };
        }

        if(filters.type) {
            query.type = filters.type;
        }

        if(filters.project) {
            query.project = filters.project;
        }

        const cursor = this.#db.collection(this.ERRORS_COLLECTION)
            .find<ErrorLog>(query)
            .skip(offset)
            .limit(limit)
            .sort({ _id: -1 });

        return {
            data: await cursor.toArray(),
            count: await cursor.count()
        };
    }
}