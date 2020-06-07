import axios from 'axios';

import { InfoController } from '../controllers/info';
import { User, UsersObject } from '../controllers/users';
import { Category, Item } from '../translation/translation';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RequestHandler } from 'fastify';

declare interface NotifyOptions {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    translations?: Category | Item;
}

declare interface NotifyOptions {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    translations?: Category | Item;
}

declare interface PostResult {
    status: string;
    project: string;
}

declare interface PostResult {
    status: string;
    project: string;
}

declare interface PostOptions {
    url: string;
    data: NotifyOptions & {
        subscribers: UsersObject;
        settings: Settings;
        token?: string;
    };
}

const LIMIT_REPEAT_NOTIFY = 30;
const REPEAT_IN_SECONDS = 10000;

export abstract class Module {
    public name = '';
    public cron = '';

    // TODO REDO
    public handler!: RequestHandler;

    info: InfoController;

    constructor(public core: Core) {
        this.info = this.core.info;
    }

    async getSubsByName(
        project: project,
        name: keyof Subscriptions,
        condition: (user: User) => boolean,
        settings: Settings
    ): Promise<UsersObject> {
        const controller = this.core.subscriptions[project];

        return await controller.getSubsByName(name, settings, condition);
    }

    // TODO Subscriptions ErrorHandling
    async post(project: project, options: PostOptions, limit = 1): Promise<PostResult> {
        if (limit > LIMIT_REPEAT_NOTIFY) {
            return Promise.reject({ project, code: 'LIMIT_EXCEEDED' });
        }

        const url = this.core.config.projects[project].url + options.url;

        options.data.token = this.core.config.token;

        try {
            const { data: { status } } = await axios({
                method: 'POST',
                data: options.data,
                url
            });

            return { status, project };
        } catch (err) {
            this.core.logger.error(
                `[${limit} try] Error while attempting to post ${options.url} to ${project}: ${err.message}`
            );

            await this.core.wait(REPEAT_IN_SECONDS);

            return this.post(project, options, ++limit);
        }
    }

    async notify(
        name: Extract<keyof Subscriptions, string>,
        data: NotifyOptions,
        condition = (_user: User): boolean => true
    ): Promise<void> {
        const projects = this.core.config.projects;

        const promises = (Object.keys(projects) as project[])
            .map(async project => {
                const settings = this.core.settings.config.defaults[project];
                const subscribers = await this.getSubsByName(project, name, condition, settings);

                const hasSubscribers = Object.keys(subscribers).length;

                if (!hasSubscribers) {
                    return Promise.reject({ code: 'EMPTY_SUBSCRIBERS', project });
                }

                return this.post(
                    project,
                    {
                        url: `/subscriptions/${name}`,
                        data: {
                            ...data,
                            translations: {
                                ...data.translations,
                                footer: this.core.translations.get('subscriptions', 'footer', 'title'),
                                name: this.core.subscriptions.config.footerSubs[name]
                            },
                            subscribers,
                            settings
                        }
                    }
                );
            });

        Promise.allSettled(promises)
            .then(result =>
                result.forEach(res => {
                    if (res.status === 'fulfilled') {
                        const { status, project } = res.value;

                        return this.core.logger.sub(name, project, status);
                    }

                    const { code } = res.reason as { code: string };

                    if( !code ) {
                        return;
                    }

                    const messages = {
                        EMPTY_SUBSCRIBERS: {
                            type: 'warn' as const,
                            message: `No one is subscribed to "${name}" at ${res.reason.project}.`
                        },
                        LIMIT_EXCEEDED: {
                            type: 'error' as const,
                            message: `Number of attempts while trying to post "${name}" subscription to ${res.reason.project} exceeded.`
                        }
                    };

                    const message = messages[code as keyof typeof messages];

                    if (message) {
                        return this.core.logger[message.type](message.message);
                    }

                    // Отправить сообщение в дискорд/телеграм, что не смог отправить
                    return this.core.logger.error(
                        `Unknown error in "${name}" subscription: ${JSON.stringify(res.reason)}`
                    );
                })
            );
    }
}

declare global {
    class ModuleController extends Module {
        get(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        send(): Promise<void>;

        sub?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        unsub?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        set?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        maintenance?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        when?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        sending?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;

        handler: RequestHandler;
    }

    type Modules = {
        [key: string]: ModuleController;
    }
}