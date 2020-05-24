import Status from '../modules/status';

export default class ApiStatus extends Status {
    constructor(core: Core) {
        super(core);
    }

    status = async (request: CoreRequest): Promise<ReplyOptions> => {
        const data = await this.get(request);
        const translations = this.core.translate(request.settings.language, 'commands', 'status');

        return { translations, data };
    };

    apiStatus = async (request: CoreRequest): Promise<ReplyOptions> => {
        const data = await this.get(request);

        return { data };
    };

    maintenance = async ({ settings, body: { maintenance } }: CoreRequest): Promise<ReplyOptions> => {
        const translations = this.core.dates.maintenance(maintenance, settings);

        return { translations };
    }
}