import Pledges from '../modules/pledges';

export default class ApiPledges extends Pledges {
    constructor(core: Core) {
        super(core);
    }

    pledges = async (request: CoreRequest): Promise<ReplyOptions> => {
        const data = await this.get(request);

        const days = parseInt(request.params.days);
        const lang = request.settings.language;

        const translations = this.core.translate(lang, {
            after_days: {
                days: this.core.dates.pluralize(days, lang)
            }
        }, 'commands', 'pledges');

        const options = {
            translations,
            data
        };

        if (days > 0) {
            const { day, date } = this.core.dates.pledges(days, lang);

            options.translations.day = day;
            options.translations.date = date;
        }

        return { translations, data };
    };

    apiPledges = async (request: CoreRequest): Promise<ReplyOptions> => {
        const data = await this.get(request);

        const translate = (instance: Record<language, string>): string => instance[request.settings.language];

        const translated = {
            pledges: data.pledges.map( translate ),
            masks: data.masks.map( translate ),
        };

        return { data: translated };
    };
}