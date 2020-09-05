import Seht from '../modules/seht';
import { Bridge } from '../services/bridge';

export const bridge = new Bridge();

export default class ApiLogs {
    name = 'logs';

    seth: Seht;

    constructor(private core: Core) {
        this.seth = new Seht(core);
    }

    log = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { params, body, info: { project } } = request;

        await this.core.logs.set((params).type, { ...body, project });

        bridge.$emit('log', { ...body, project });

        return {};
    };

    getErrorTypes = async (request: CoreRequest, reply: CoreReply) => {
        const valid = await this.validate(request);

        if(!valid) {
            await Seht.replyError(reply);

            return {};
        }

        const types = await this.core.logs.getErrorTypes();

        return { data: types };
    }

    async validate(request: CoreRequest): Promise<boolean> {
        const user = await this.seth.getUserByIdentifier(request.headers.authorization!);

        return Boolean(user && this.core.seth.ownerId === user.id);
    }

    getErrors = async (request: CoreRequest, reply: CoreReply): Promise<ReplyOptions> => {
        const valid = await this.validate(request);

        if(!valid) {
            await Seht.replyError(reply);

            return {};
        }

        const logs = await this.core.logs.getErrors(request.query);

        return { data: logs };
    }
}