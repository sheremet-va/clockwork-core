import { Db } from 'mongodb';

import { CoreError } from '../services/core';

type Action = 'error' | 'command';

import * as moment from 'moment';

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
    channelId: string;
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

    findSubs() {
        // {
            // "_id" : ObjectId("5f0becb6714f4d49decdc639"),
            // "guildId" : "547516303716646945",
            // "authorId" : "215358861647806464",
            // "command" : "pledges",
            // "arguments" : [ ],
            // "date" : ISODate("2020-07-13T05:10:14.023Z"),
            // "project" : "assistant"
        // }

        const names = [
            'sub',
            'subscribe',
            'подписаться',
            'подписать',
            'подписка'
        ];

        const start = moment('2020-08-29 12:12:00+0300');
        const end = moment('2020-09-03 11:00:00+0300');

        return this.#db.collection('logs_command').find<CommandLog>({
            name: { $in: names },
            channelId: { $exists: true },
            date: {
                $gt: start.toDate(),
                $lt: end.toDate()
            }
        }).toArray();
    }
}