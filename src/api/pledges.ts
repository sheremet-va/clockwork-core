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

    translateForApi(data: Record<string, Record<language, string>>, language: language): Record<string, string> {
        return Object.entries(data).reduce((pledges, [trader, name]) => {
            return { ...pledges, [trader]: name[language] };
        }, {});
    }

    apiPledges = async (request: CoreRequest): Promise<ReplyOptions> => {
        const language = request.settings.language;
        const data = await this.get(request);

        const pledges = this.translateForApi(data.pledges, language);
        const masks = this.translateForApi(data.masks, language);

        const translated = {
            pledges,
            masks,
        };

        return { data: translated };
    };
}