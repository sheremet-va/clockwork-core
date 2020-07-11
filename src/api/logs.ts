export default class ApiLogs {
    name = 'logs';

    constructor(private core: Core) { }

    log = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { params, body, info: { project } } = request;

        this.core.logs.set(params.type, { ...body, project });

        return {};
    };
}