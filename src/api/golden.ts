import Golden from '../modules/golden';

export default class ApiGolden extends Golden {
    constructor(core: Core) {
        super(core);
    }

    golden = async (request: CoreRequest): Promise<ReplyOptions> => {
        const data = await this.get();
        const translations = this.core.translate(request.settings.language, 'merchants', 'golden');

        return { translations, data };
    };

    apiGolden = async (): Promise<ReplyOptions> => {
        const data = await this.get();

        return { data };
    };
}