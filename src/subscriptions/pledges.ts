import Pledges from '../modules/pledges';

export default class CronPledges extends Pledges {
    cron = '25 00 9 * * *';

    constructor(core: Core) {
        super(core);
    }

    send = async (): Promise<void> => {
        const TOMORROW = 1;

        const today = this.getPledges();
        const tomorrow = this.getPledges(TOMORROW);

        const todayMasks = this.getMasks(today);
        const tomorrowMasks = this.getMasks(tomorrow);

        const translations = this.core.translations.get('commands', 'pledges');

        return this.notify('pledges', {
            translations,
            data: {
                today: {
                    // REDO with more languages
                    pledges: await this.translate(today, 'ru', 'locations'),
                    masks: await this.translate(todayMasks, 'ru', 'sets')
                },
                tomorrow: {
                    pledges: await this.translate(tomorrow, 'ru', 'locations'),
                    masks: await this.translate(tomorrowMasks, 'ru', 'sets')
                }
            }
        });
    }
}