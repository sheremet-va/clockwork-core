import Seht from '../modules/seht';

export default class ApiDiscord extends Seht {
    name = 'discord';

    constructor(core: Core) {
        super(core);
    }

    async request(path: string) {
        const res = await this.core.request({
            url: 'http://localhost:3033' + path,
            method: 'GET'
        });

        return res.data;
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
}