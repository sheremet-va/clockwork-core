import { Db } from 'mongodb';

import { CoreError } from '../services/core';

type Action = 'error' | 'command';

export declare interface ErrorLog {
    project: project;
    message: string;
    type: string;
    stack: string | null;
    date: Date;
}

export declare interface CommandLog {
    project: project;
    guildId: string;
    authorId: string;
    command: string;
    arguments: string[];
    ts: Date;
}

export declare type Log = ErrorLog | CommandLog;

export class LogsController {
    #db: Db;

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
}