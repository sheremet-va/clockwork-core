import Seht from '../modules/seht';

export default class ApiLogs {
    name = 'logs';

    seht: Seht;

    constructor(private core: Core) {
        this.seht = new Seht(core);
    }

    log = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { params, body, info: { project } } = request;

        await this.core.logs.set((params).type, { ...body, project });

        return {};
    };

    getErrorTypes = async () => {
        const types = await this.core.logs.getErrorTypes();

        return { data: types };
    }

    getErrors = async (request: CoreRequest): Promise<ReplyOptions> => {
        const logs = await this.core.logs.getErrors(request.query);

        return { data: logs };
    }

    getCommands = async (request: CoreRequest): Promise<ReplyOptions> => {
        const logs = await this.core.logs.getCommands(request.query);

        return { data: logs };
    }
}