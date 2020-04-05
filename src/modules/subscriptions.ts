import { Module } from './module';

import { Category, Tag } from '../translation/translation';

import { CoreError } from '../services/core';
import { Route } from '../services/router';

export default class SubscriptionsModule extends Module {
    name = 'subscriptions';
    path = '/subscriptions';

    routes: Route[] = [
        { path: '/subscriptions', handler: 'get', method: 'GET' },
        { path: '/subscriptions/sub', handler: 'sub', method: 'POST' },
        { path: '/subscriptions/unsub', handler: 'unsub', method: 'POST' },
    ];

    constructor(core: Core) {
        super(core);
    }

    getInfo = (
        toSub: boolean,
        request: CoreRequest
    ): {
        subs: Subscriptions;
        channelId: string;
        name: string;
        subject: string;
        sub: string;
    } => {
        const {
            name = '',
            channelId = '0',
            subject = ''
        } = request.body as { name: string; channelId: string; subject: string };

        const subs = request.subscriptions;

        if (channelId === '0') {
            throw new CoreError('DONT_HAVE_RIGHTS_TO_SUBSCRIBE');
        }

        const defaultAliases = this.core.subscriptions.config.subsAliases;

        const aliases = Object.keys(defaultAliases)
            .reduce((obj, sub) => {
                const languages = Object.values(defaultAliases[sub])
                    .reduce((acc: string[], value: string[]) => [...acc, ...value], []) as string[];

                return { ...obj, [sub]: languages };
            }, {}) as { [k: string]: string[] };

        const subName = Object.keys(aliases).find(sub => sub === name || aliases[sub].includes(name));

        if (!subName) {
            throw new CoreError('INCORRECT_SUBSCRIPTION_NAME', { sub: name });
        }

        const nameAlias = this.core.translate(`subscriptions/aliases/${subName}`) as Tag;

        const render = { sub: nameAlias, subject };

        this.validate(toSub, subs[subName], { channelId, render });

        return { subs, channelId, name: subName, subject, sub: nameAlias };
    };

    validate = (toSub: boolean, sub, { channelId, render }): void => {
        const subject = render.subject === 'user' ? 'USER' : 'CHANNEL';

        if (toSub && sub && sub.includes(channelId)) {
            throw new CoreError(subject + '_ALREADY_SUBSCRIBED', render);
        } else if (!toSub && (!sub || !sub.includes(channelId))) {
            throw new CoreError(subject + '_NOT_SUBSCRIBED', render);
        }
    };

    get = async ({ settings: { language: lang }, subscriptions }: CoreRequest): Promise<ReplyOptions> => {
        const translated = {
            ...this.core.translate('commands/subscriptions') as Category,
            subscriptions: []
        };

        const descriptions = this.core.translate('subscriptions/descriptions') as Category;

        const {
            subsByLanguages: { [lang]: subsByLang, en: defaultSubs },
            subsAliases: aliases
        } = this.core.subscriptions.config;

        const translations = Object.entries(descriptions)
            .reduce((obj, [name, description]) => {
                if (!subsByLang.includes(name) && !defaultSubs.includes(name)) {
                    return obj;
                }

                const [defaultAlias] = aliases[name].en;

                const title: string = lang === 'en' // 'en' as a default
                    ? defaultAlias
                    : aliases[name][lang][0];

                const subscriptionInfo = {
                    title,
                    description,
                    name,
                    aliases: [...(lang === 'en' ? [] : aliases[name].en), ...aliases[name][lang]]
                };

                return { ...obj, subscriptions: [...obj.subscriptions, subscriptionInfo] };
            }, translated);

        return { data: subscriptions, translations };
    };

    sub = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { subs, name, subject, channelId, sub } = this.getInfo(true, request);
        const { project, id } = request.info;

        const channels = subs[name] ? [...subs[name], channelId] : [channelId];

        const translations = this.core.translate('commands/subscribe', {
            success_channel: { subject, sub },
            success_user: { sub }
        }) as Category;

        this.core.setSubscriptions(project, subs, { id, name, channels });

        return { translations };
    };

    unsub = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { subs, name, subject, channelId, sub } = this.getInfo(false, request);
        const { project, id } = request.info;

        const channels = (subs[name] as string[]).filter(id => id !== channelId);

        const translations = this.core.translate('commands/unsubscribe', {
            success_channel: { subject, sub },
            success_user: { sub }
        }) as Category;

        this.core.setSubscriptions(project, subs, { id, name, channels });

        return { translations };
    };
}