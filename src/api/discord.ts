import Seht from '../modules/seht';

export default class ApiDiscord extends Seht {
    name = 'discord';

    constructor(core: Core) {
        super(core);
    }

    guilds = async (): Promise<ReplyOptions> => {
        const guilds = await this.request('/guilds');

        return { data: guilds };
    };

    getGuildById = async (request: CoreRequest): Promise<ReplyOptions> => {
        const guildId = request.params.guildId;

        const guild = await this.request(`/guilds/${guildId}`);

        return { data: guild };
    };

    getUserById = async (request: CoreRequest): Promise<ReplyOptions> => {
        const userId = request.params.userId;

        const user = await this.request(`/users/${userId}`);

        return { data: user };
    };
}