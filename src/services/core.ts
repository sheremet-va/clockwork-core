import axios, { AxiosRequestConfig } from 'axios';
import * as fastify from 'fastify';

import { Db } from 'mongodb';

import { User, SubscriptionsController, SettingsController } from '../controllers/users';
import { InfoController } from '../controllers/info';
import { GameItemsController, GameItem, Table } from '../controllers/gameItems';

import { Translations, RenderObject, TranslatedCategory, TranslatedType, Tag, Item } from '../translation/translation';
import { DropsManager } from '../services/drops';
import { Dates } from '../translation/dates';
import { Logger } from '../services/logger';

import * as config from '../configs/main';
import * as settingsConfig from '../configs/settings';
import * as subsConfig from '../configs/subscriptions';

const REPEAT_IN_SECONDS = 10000;

const LIMIT_REPEAT_GET = 10;

function build(logger: Logger): void {
    Object.defineProperty(String.prototype, 'render', {
        value(this: string, replaces?: Record<string, string>) {
            if (!replaces) {
                return this;
            }

            return Object.keys(replaces)
                .reduce((final, replace) => final
                    .replace(new RegExp(`{{\\s*${replace}\\s*}}`, 'g'), replaces[replace]), this);
        }
    });

    Object.defineProperty(Object.prototype, 'render', {
        value(
            this: Record<string, string | Record<string, string>>,
            replaces?: Record<string, string>
        ) {
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
            ( err.stack || err.message ).replace(new RegExp(`${__dirname}/`, 'g'), './')
        }`));

    process.on('unhandledRejection', (err: unknown) => {
        logger.error(`Unhandled rejection: ${err instanceof Error ? err.stack : err}`);
    });

    process.on('warning', (err: Error) =>
        logger.error(`warning: ${err.stack}`));
}

export class CoreError extends Error {
    public result = 'error';
    public code = 500;
    public name = 'CoreError';

    constructor(public message: string, public renderObject = {}) {
        super(message);
    }
}

type CoreSubscriptions = { [x in project]: SubscriptionsController } & { config: subsConfig.SubscriptionsConfig };
type CoreSettings = { [x in project]: SettingsController } & { config: settingsConfig.SettingsConfig };
type CoreUsers = { [x in project]: SubscriptionsController };

class BaseCore {
    readonly translations: Translations;
    readonly dates: Dates;
    readonly logger: Logger;
    readonly config: config.MainConfig;
    readonly projects: project[];

    readonly subscriptions = {} as CoreSubscriptions;
    readonly settings = {} as CoreSettings;
    readonly users = {} as CoreUsers;
    readonly info!: InfoController;

    private gameItems: GameItemsController;

    wait: (seconds: number) => Promise<void>;

    readonly media = {
        luxury: 'https://i.imgur.com/DYHHd1i.png'
    };

    constructor(db: Db) {
        this.dates = new Dates();
        this.translations = new Translations();
        this.logger = new Logger();
        this.config = config;

        this.projects = Object.keys(this.config.projects) as project[];

        this.info = new InfoController(db);

        this.gameItems = new GameItemsController(db);

        this.connect(db);

        this.wait = require('util').promisify(setTimeout);

        build(this.logger);
    }

    private connect(db: Db): void {
        new DropsManager(this);

        this.projects.forEach(project => {
            this.subscriptions[project] = new SubscriptionsController(db, project);
            this.settings[project] = new SettingsController(db, project);

            this.subscriptions.config = subsConfig;
            this.settings.config = settingsConfig;

            this.users[project] = this.subscriptions[project];
        });
    }

    async request(options: string | PostOptions, tries = 1): Promise<RequestResult> {
        const url = typeof options === 'string' ? options : options.url;

        if (tries > LIMIT_REPEAT_GET) {
            throw new CoreError(`Number of attempts to get "${url}" exceeded`);
        }

        const config = typeof options === 'string' ? { url: encodeURI(options), method: 'GET' } : options;

        return axios.request(config as AxiosRequestConfig)
            .then(({ data }) => ({ data }))
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
        error: string,
        render?: Record<string, string>
    ): false {
        const description = this.translations.translate(lang, render || null, 'errors', 'errors', error);
        const unknown = this.translations.translate(lang, null, 'errors', 'errors', 'UNKNOWN_ERROR');

        const descriptionFound = description !== error;
        const code = descriptionFound ? 406 : 500;
        const message = descriptionFound ? description : unknown;

        reply.code(code).send({ error, message });

        const request = reply.request;

        this.logger.error(
            `External Error: ${error} ${request.query.project}\t${request.query.id}\t${request.ip}`
        );

        return false;
    }

    async getUser(project: project, id: string): Promise<User> {
        return await this.users[project].get(id);
    }

    setSettings(
        project: project,
        was: Settings,
        { id, type, value }: {
            id: string;
            type: settingsConfig.available;
            value: language | string;
        }
    ): Promise<Settings> {
        const defaults = this.settings.config.defaults[project];
        const settings = { ...was, [type]: value };

        const rebuild = Object.entries(defaults)
            .filter(([key, value]) => settings[key as keyof Settings] !== value)
            .reduce((result, [key]) => ({ ...result, [key]: settings[key as keyof Settings] }), {}) as Settings;

        return this.settings[project].set(id, rebuild);
    }

    setSubscriptions(
        project: project,
        was: Subscriptions,
        { id, name = '', channels = [] }: { id: string; name: string; channels: string[] }
    ): Promise<Subscriptions> {
        const subscriptions = { ...was, [name]: channels };

        const rebuild = Object.entries(subscriptions)
            .filter(([, value]) => value.length !== 0)
            .reduce((result, [key, value]) => ({ ...result, [key]: value }), {}) as Subscriptions;

        return this.subscriptions[project].set(id, rebuild);
    }

    async getItem<T = GameItem>(name: string, language: string, table: Table): Promise<T | null> {
        return await this.gameItems.get<T>(name, language, table);
    }

    translate(lang: language, render: null | Record<string, RenderObject>, type: string): TranslatedType;
    translate(lang: language, render: null | Record<string, RenderObject>, type: string, category: string): TranslatedCategory;
    translate(lang: language, render: null | Record<string, RenderObject>, type: string, category: string, tag: string): Tag | Item;
    translate(lang: language, type: string): TranslatedType;
    translate(lang: language, type: string, category: string): TranslatedCategory;
    translate(lang: language, type: string, category: string, tag: string): Tag | Item;
    translate(
        lang: language,
        render: null | Record<string, RenderObject> | Record<string, string> | string,
        type = '',
        category = '',
        tag = ''
    ): TranslatedType | TranslatedCategory | Tag | Item | null {
        if( typeof render === 'string' ) {
            return this.translations.translate(
                lang,
                {},
                render,
                type,
                category
            );
        }

        if(tag) {
            return this.translations.translate(lang, render as Record<string, string>, type, category, tag);
        }

        if(category) {
            return this.translations.translate(lang, render as Record<string, RenderObject>, type, category);
        }

        return this.translations.translate(lang, render as Record<string, RenderObject>, type);
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

declare interface RequestResult {
    data: object | string;
}

declare global {
    class Core extends BaseCore {}

    interface Number {
        pluralize(variants: string[], lang: language): string;
    }

    interface String {
        render(options?: RenderObject | null): string;
    }

    interface Object {
        render(options?: RenderObject | null): RenderObject | string;
    }
}

export { BaseCore as Core };