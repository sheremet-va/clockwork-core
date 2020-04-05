import axios, { AxiosRequestConfig } from 'axios';
import fastify from 'fastify';

import { Db } from 'mongodb';

import { User, SubscriptionsController, SettingsController, UsersObject } from '../controllers/users';
import { InfoController } from '../controllers/info';

import { Translations, translate } from '../translation/translation';
import { DropsManager } from '../services/drops';
import { Dates } from '../translation/dates';
import { Logger } from '../services/logger';

import * as config from '../configs/main';
import * as settingsConfig from '../configs/settings';
import * as subsConfig from '../configs/subscriptions';

const REPEAT_IN_SECONDS = 10000;

const LIMIT_REPEAT_NOTIFY = 30;
const LIMIT_REPEAT_GET = 10;

function build(logger: Logger): void {
    Object.defineProperty(String.prototype, 'render', {
        value(replaces) {
            if (!replaces) {
                return this;
            }

            return Object.keys(replaces)
                .reduce((final, replace) => final
                    .replace(new RegExp(`{{\\s*${replace}\\s*}}`, 'g'), replaces[replace]), this);
        }
    });

    Object.defineProperty(Object.prototype, 'render', {
        value(replaces) {
            if (!replaces) {
                return this;
            }

            return Object.keys(this)
                .reduce((final, lang) => ({ ...final, [lang]: this[lang].render(replaces) }), {});
        }
    });

    Object.defineProperty(Number.prototype, 'pluralize', {
        value(array: string[], lang: language) {
            switch (lang) {
                case 'ru':
                    return `${this} ${array[(this % 10 === 1 && this % 100 !== 11)
                        ? 0
                        : this % 10 >= 2 && this % 10 <= 4 && (this % 100 < 10 || this % 100 >= 20)
                            ? 1
                            : 2]}`;
                case 'en':
                default:
                    return `${this} ${array[this > 1 ? 1 : 0]}`;
            }
        }
    });

    process.on('uncaughtException', (err: Error) =>
        logger.error(`Uncaught Exception: ${
            err.stack.replace(new RegExp(`${__dirname}/`, 'g'), './')
        }`));

    process.on('unhandledRejection', (err: CoreError | Error) => {
        if (err.name === 'CoreError') {
            return logger.error(`CoreError: ${err.stack}`);
        }

        return logger.error(`Unhandled rejection: ${err.stack}`);
    });

    process.on('warning', (err: Error) =>
        logger.error(`warning: ${err.stack}`));
}

export class CoreError extends Error {
    public result = 'error';
    public code = 500;
    public name = 'CoreError';
    public renderObject: RenderObject;
    public message: string;

    constructor(message: string, render = {}) {
        super(message);

        this.message = message;
        this.renderObject = render;
    }
}

class BaseCore {
    translations: Translations;
    dates: Dates;
    logger: Logger;
    config: config.MainConfig;

    subscriptions: { [x in project]?: SubscriptionsController } & { config?: subsConfig.SubscriptionsConfig };
    settings: { [x in project]?: SettingsController } & { config?: settingsConfig.SettingsConfig };
    users: { [x in project]?: SubscriptionsController };
    info: InfoController;
    projects: project[];

    wait: (seconds: number) => Promise<void>;
    translate: translate;

    media = {
        luxury: 'https://i.imgur.com/DYHHd1i.png'
    };

    constructor() {
        this.dates = new Dates();
        this.translations = new Translations();
        this.logger = new Logger();
        this.config = config;

        this.subscriptions = {};
        this.settings = {};
        this.users = {};

        this.projects = Object.keys(this.config.projects) as project[];

        this.wait = require('util').promisify(setTimeout);

        build(this.logger);
    }

    connect(db: Db): void {
        this.buildInfo(db);

        this.projects.forEach(project => this.buildUser(db, project));
    }

    private buildInfo(db: Db): void {
        this.info = new InfoController(db);

        new DropsManager(this);
    }

    private buildUser(db: Db, project: project): void {
        this.subscriptions[project] = new SubscriptionsController(db, project);
        this.settings[project] = new SettingsController(db, project);

        this.subscriptions.config = subsConfig;
        this.settings.config = settingsConfig;

        this.users[project] = this.subscriptions[project];
    }

    async post(project: string, options: PostOptions, limit = 1): Promise<PostResult> {
        if (limit > LIMIT_REPEAT_NOTIFY) {
            return Promise.reject({ project });
        }

        const url = this.config.projects[project].url + options.url;

        options.data.token = this.config.token;

        try {
            const { data: { status } } = await axios({
                method: 'POST',
                data: options.data,
                url
            });

            return { status, project };
        } catch (err) {
            this.logger.error(
                `[${limit} try] Error while attempting to post ${options.url} to ${project}: ${err.message}`
            );

            await this.wait(REPEAT_IN_SECONDS);

            return this.post(project, options, ++limit);
        }
    }

    async request(options: string | PostOptions, tries = 1): Promise<RequestResult> {
        const url = typeof options === 'string' ? options : options.url;

        if (tries > LIMIT_REPEAT_GET) {
            throw new CoreError(`Number of attempts to get "${url}" exceeded`);
        }

        const config = typeof options === 'string' ? { url: options, method: 'GET' } : options;

        return axios(config as AxiosRequestConfig)
            .then(({ data }) => ({ result: 'ok', data }))
            .catch(async err => {
                this.logger.error(
                    `[${tries} try] Error at core.request "${url}": ${err.message}`
                );

                await this.wait(REPEAT_IN_SECONDS);

                return this.request(options, ++tries);
            });
    }

    sendError(
        reply: fastify.FastifyReply<HttpResponse>,
        lang: language,
        code: string,
        render?: object
    ): false {
        const error = this.translations.translate(lang, 'errors/errors/' + code, render);

        if (typeof error === 'string') {
            reply.code(500).send({
                result: 'error',
                message: error,
                code
            });
        } else {
            reply.code(500).send({ result: 'error', code });
        }

        // добавить в логгер

        return false;
    }

    async getUser(project: string, id: string): Promise<User> {
        const defaults = this.settings.config.defaults[project];

        const user = await this.users[project].get(id) || { settings: {}, subscriptions: {} };

        const settings = { ...defaults, ...user.settings };

        return { ...user, settings };
    }

    async getSubsByName(
        project: project,
        name: string,
        condition: (user: User) => boolean,
        settings: Settings
    ): Promise<UsersObject> {
        return await this.subscriptions[project].getSubsByName(name, settings, condition);
    }

    setSettings(
        project: project,
        was: Settings,
        { id, type, value }: { id: string; type: settingsConfig.available; value: language | string }
    ): Promise<Settings> {
        const defaults = this.settings.config.defaults[project];
        const settings = { ...was, [type]: value };

        const rebuild = Object.entries(defaults)
            .filter(([key, value]) => settings[key] !== value)
            .reduce((result, [key]) => ({ ...result, [key]: settings[key] }), {}) as Settings;

        return this.settings[project].set(id, rebuild) as Promise<Settings>;
    }

    setSubscriptions(
        project: project,
        was: Subscriptions,
        { id, name = '', channels = [] }: { id: string; name: string; channels: string[] }
    ): Promise<Subscriptions> {
        const subscriptions = { ...was, [name]: channels };

        const rebuild = Object.entries(subscriptions)
            .filter(([, value]) => value.length !== 0)
            .reduce((result, [key, value]) => ({ ...result, [key]: value }), {});

        return this.subscriptions[project].set(id, rebuild) as Promise<Subscriptions>;
    }
}

declare interface PostOptions {
    url?: string;
    method?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    headers?: {
        Cookie: string;
    };
}

declare interface PostResult {
    status: string;
    project: string;
}

declare interface PostResult {
    status: string;
    project: string;
}

declare interface RequestResult {
    result: string;
    data: object | string;
}

declare type RenderOption = {
    [key: string]: string;
} | {}

declare interface RenderObject {
    [key: string]: RenderOption;
}

declare global {
    class Core extends BaseCore { }

    interface Number {
        pluralize(variants: string[], lang: language): string;
    }

    interface String {
        render(options: object): object | string;
    }

    interface Object {
        render(options: object): object | string;
    }
}

export { BaseCore as Core };