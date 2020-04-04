import { User } from '../controllers/users';
import { InfoController } from '../controllers/info';
import { Route } from '../services/router';

declare interface NotifyOptions {
    data?: any;
    translations?: any; // Category | Tags
}

export class Module {
    public core: Core;

    public name: string = null;
    public cron: string = null;

    public api: Route[] = [];
    public routes: Route[] = [];

    info: InfoController;

    constructor(core: Core) {
        this.core = core;

        this.info = this.core.info;
    }

    async get(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions> {
        return {};
    }

    async send(options?: object): Promise<void> {
        return;
    }

    async notify(name: string, data: NotifyOptions, condition = (user: User) => true): Promise<void> {
        const projects = this.core.config.projects;

        const promises = Object.keys(projects)
            .map(async project => {
                const settings = this.core.settings.config.defaults[project];
                const subscribers = await this.core.getSubsByName(project, name, condition, settings);

                if (!Object.keys(subscribers).length) {
                    return Promise.reject({
                        message: `No one is subscribed to ${name} on "${project}" project.`,
                        notify: false,
                        type: 'warn'
                    });
                }

                const url = `/subscriptions/${name}`;

                return this.core.post(
                    project,
                    {
                        url,
                        data: { ...data, subscribers, settings }
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

                    const { type, message, notify } = res.reason;

                    if ('notify' in res.reason && !notify) {
                        return;
                    }

                    if (message) {
                        return this.core.logger[type || 'error'](message);
                    }

                    // Отправить сообщение в дискорд/телеграм, что не смог отправить
                    return this.core.logger.error(
                        `Number of attempts while trying to post "${name}" subscription to ${res.reason.project} exceeded.`
                    );
                })
            );
    }
}

declare global {
    class ModuleController extends Module {
        core: Core;
        name: string;
        cron: string;
        info: InfoController;

        get(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        send(): Promise<void>;
        notify(name: string, data: ReplyOptions, condition?: (user: User) => boolean): Promise<void>;

        sub?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        unsub?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        set?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        maintenance?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        when?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
        sending?(request?: CoreRequest, reply?: CoreReply): Promise<ReplyOptions>;
    }

    type Modules = {
        [key: string]: ModuleController;
    }
}