import Drops from '../modules/drops';

export default class ApiDrops extends Drops {
    constructor(core: Core) {
        super(core);
    }

    when = async (
        {
            query: { start, end },
            settings: { timezone }
        }: CoreRequest<{ start: number; end: number }>
    ): Promise<ReplyOptions> => {

        const translations = this.core.dates.drops(start, end, timezone);

        return { translations };
    }

    sending = async (
        {
            query: { start },
            settings: { timezone, language }
        }: CoreRequest<{ start: number }>
    ): Promise<ReplyOptions> => {

        const data = this.core.dates.dropsSending(start, language, timezone);

        return { data };
    }

    drops = async (request: CoreRequest): Promise<ReplyOptions> => {
        const translations = this.core.translate(request.settings.language, 'commands', 'drops');
        const data = await this.get(request);

        return { translations, data };
    }

    apiDrops = async (): Promise<ReplyOptions> => {
        const data = await this.getDrops();

        return { data };
    }
}