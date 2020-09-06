import { Db } from 'mongodb';

import { CoreError } from '../services/core';

import { Bridge } from '../services/bridge';

type Action = 'error' | 'command';

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

type LogsFilters = {
    offset?: number;
    limit?: number;
    date_from?: Date;
    date_to?: Date;
    contains?: string;
    type?: string;
    project?: string;
}

type CommandsFilters = {
    offset?: number;
    limit?: number;
    date_from?: Date;
    date_to?: Date;
    command?: string;
    guildId?: string;
    project?: string;
}

export declare type Log = ErrorLog | CommandLog;

export const bridge = new Bridge();

export class LogsController {
    readonly #db: Db;

    private readonly ERRORS_COLLECTION = 'logs_error';
    private readonly COMMANDS_COLLECTION = 'logs_command';

    constructor(db: Db) {
        this.#db = db;
    }

    async set(action: Action, body: Log): Promise<void> {
        if ('date' in body) {
            body.date = new Date(body.date);
        }

        bridge.$emit('log', { action, ...body });

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

    async getErrors(filters: LogsFilters): Promise<{ data: ErrorLog[]; count: number }> {
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

    async getCommands(filters: CommandsFilters): Promise<{ data: CommandLog[]; count: number }> {
        const offset = Number(filters.offset) || 0;
        const limit = Number(filters.limit) || 30;

        type Query = {
            // date: {
            //     $gte: Date;
            //     $lt: Date;
            // };
            command?: string;
            project?: string;
            guildId?: string | null;
        }

        const query: Query = {
            // date: {
            //     $gte: filters.date_from || moment().subtract(1, 'year').toDate(),
            //     $lt: filters.date_to || new Date()
            // }
        };

        if(filters.command) {
            query.command = filters.command;
        }

        if(filters.project) {
            query.project = filters.project;
        }

        if(filters.guildId) {
            query.guildId = filters.guildId === 'null' ? null : filters.guildId;
        }

        const cursor = this.#db.collection(this.COMMANDS_COLLECTION)
            .find<CommandLog>(query)
            .skip(offset)
            .limit(limit)
            .sort({ _id: -1 });

        return {
            data: await cursor.toArray(),
            count: await cursor.count()
        };
    }
}