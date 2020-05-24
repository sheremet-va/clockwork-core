import { WeeklyInfo } from '../controllers/info';

import Weekly from '../modules/weekly';

export default class WeeklyModule extends Weekly {
    constructor(core: Core) {
        super(core);
    }

    weekly = async ({ settings: { language } }: CoreRequest): Promise<ReplyOptions> => {
        const data = await this.info.get<WeeklyInfo>('weekly');
        const translations = this.core.translate(language, 'commands', 'weekly');

        return { translations, data };
    };

    apiWeekly = async ({ settings: { language } }: CoreRequest): Promise<ReplyOptions> => {
        const weekly = await this.info.get<WeeklyInfo>('weekly');

        const translated = {
            na: weekly.na[language],
            eu: weekly.eu[language],
        };

        return { data: translated };
    };
}