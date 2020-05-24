import Luxury from '../modules/luxury';

export default class ApiLuxury extends Luxury {
    constructor(core: Core) {
        super(core);
    }

    luxury = async (request: CoreRequest): Promise<ReplyOptions> => {
        const data = await this.get();
        const translations = this.core.translate(request.settings.language, 'merchants', 'luxury');

        return { translations, data };
    };

    apiLuxury = async (): Promise<ReplyOptions> => {
        const data = await this.get();

        return { data };
    };
}