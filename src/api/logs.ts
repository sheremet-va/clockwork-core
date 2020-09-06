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

        const users = logs.data.map(({ authorId }) => authorId);

        const { data: usersInfo } = await this.core.request<{ id: string; tag: string; avatar: string }[]>({
            url: 'http://localhost:3033/users?ids=' + users.join(','),
            method: 'GET'
        });

        const formatted = logs.data.map(log => {
            const user = usersInfo.find(({ id }) => log.authorId === id);

            return {
                ...log,
                user
            };
        });

        return {
            data: {
                data: formatted,
                count: logs.count
            }
        };
    }
}