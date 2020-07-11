import Help from '../modules/help';

import commands from '../configs/commands';

export default class ApiHelp extends Help {
    constructor(core: Core) {
        super(core);
    }

    get = async ({ query: { project }, settings }: CoreRequest): Promise<ReplyOptions> => {
        const helps = this.core.translate(settings.language, 'help');
        const list = commands
            .filter(cmd => cmd.projects.includes(project))
            .map(({ name, aliases }) => {
                const help = helps[name] || {};

                const [title] = (help.usage || '').split(' ');

                return { name, aliases, title, ...help };
            });

        const translations = this.core.translate(settings.language, 'commands', 'help');

        return { translations, data: list };
    };
}