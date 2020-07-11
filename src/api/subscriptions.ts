import SubscriptionsBase from '../modules/subscriptions';

import { RenderObject } from '../translation/translation';

import { CoreError } from '../services/core';

export default class SubscriptionsModule extends SubscriptionsBase {
    constructor(core: Core) {
        super(core);
    }

    getInfo(
        toSub: boolean,
        request: CoreRequest
    ): {
            subs: Subscriptions;
            channelId: string;
            name: string;
            subject: string;
            sub: string;
        } {

        const {
            name = '',
            channelId = '0',
            subject = '',
            type = 'channel'
        } = request.body as { name: string; channelId: string; subject: string; type: string };

        const subs = request.subscriptions;
        const lang = request.settings.language;

        if (channelId === '0') {
            throw new CoreError('DONT_HAVE_RIGHTS_TO_SUBSCRIBE');
        }

        const defaultAliases = this.core.subscriptions.config.subsAliases;

        const aliases = (Object.keys(defaultAliases) as (keyof typeof defaultAliases)[])
            .reduce((obj, sub) => {
                const languages = Object.values(defaultAliases[sub])
                    .reduce((acc: string[], value: string[]) => [...acc, ...value], []);

                return { ...obj, [sub]: languages };
            }, {}) as { [k: string]: string[] };

        const subName = Object.keys(aliases).find(sub => sub === name || aliases[sub].includes(name));

        if (!subName) {
            throw new CoreError('INCORRECT_SUBSCRIPTION_NAME', { sub: name });
        }

        const subsByLanguages = this.core.subscriptions.config.subsByLanguages;

        if(!subsByLanguages[lang].includes(subName) && !subsByLanguages.en.includes(subName)) {
            throw new CoreError('SUBSCRIPTION_UNSUPPORTED_LANGUAGE');
        }

        const nameAlias = this.core.translate(lang, 'subscriptions', 'aliases', subName) as string;

        const render = { sub: nameAlias, subject, type };

        this.validate(toSub, subs[subName], { channelId, render });

        return { subs, channelId, name: subName, subject, sub: nameAlias };
    }

    validate(
        toSub: boolean,
        subedChannels: string[],
        { channelId, render }: { channelId: string; render: RenderObject }
    ): void {
        const subject = render.type === 'user' ? 'USER' : 'CHANNEL';

        if (toSub && subedChannels && subedChannels.includes(channelId)) {
            throw new CoreError(subject + '_ALREADY_SUBSCRIBED', render);
        }

        if (!toSub && (!subedChannels || !subedChannels.includes(channelId))) {
            throw new CoreError(subject + '_NOT_SUBSCRIBED', render);
        }
    }

    get = async ({ settings: { language: lang }, subscriptions: data }: CoreRequest): Promise<ReplyOptions> => {
        const {
            subsByLanguages: { [lang]: subsByLang, en: defaultSubs },
            subsAliases: aliases,
            subsByGroups: groups
        } = this.core.subscriptions.config;

        const descriptions = this.core.translate(lang, 'subscriptions', 'descriptions');

        const subscriptions = Object.entries(descriptions)
            .filter(([name]) => subsByLang.includes(name) || defaultSubs.includes(name))
            .map(([subName, description]) => {
                const name = subName as keyof typeof aliases;
                const [defaultAlias] = aliases[name].en;

                const title = lang === 'en' // 'en' as a default
                    ? defaultAlias
                    : aliases[name][lang][0];

                return {
                    title,
                    description,
                    name,
                    aliases: [...(lang === 'en' ? [] : aliases[name].en), ...aliases[name][lang]]
                };
            });

        const translations = {
            ...this.core.translate(lang, 'commands', 'subscriptions'),
            ...this.core.translate(lang, 'subscriptions', 'categories'),
            subscriptions,
            groups
        };

        return { data, translations };
    };

    sub = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { subs, name, subject, channelId, sub } = this.getInfo(true, request);
        const { project, id } = request.info;

        const channels = subs[name] ? [...subs[name], channelId] : [channelId];

        const lang = request.settings.language;

        const translations = this.core.translate(lang, {
            success_channel: { subject, sub },
            success_user: { sub }
        }, 'commands', 'subscribe');

        this.core.setSubscriptions(project, subs, { id, name, channels });

        return { translations };
    };

    unsub = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { subs, name, subject, channelId, sub } = this.getInfo(false, request);
        const { project, id } = request.info;

        const channels = subs[name].filter(id => id !== channelId);

        const lang = request.settings.language;

        const translations = this.core.translate(lang, {
            success_channel: { subject, sub },
            success_user: { sub }
        }, 'commands', 'unsubscribe');

        this.core.setSubscriptions(project, subs, { id, name, channels });

        return { translations };
    };
}