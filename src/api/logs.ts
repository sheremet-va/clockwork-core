export default class ApiLogs {
    constructor(private core: Core) { }

    log = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { params, body } = request;

        this.core.logs.set(params.type, body);

        return {};
    };
}