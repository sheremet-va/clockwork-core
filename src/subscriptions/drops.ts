import * as moment from 'moment-timezone';

import Drops from '../modules/drops';

import { User } from '../controllers/users';

const ONE_HOUR = 1;
const SENDING_HOUR = 19;

export default class CronDrops extends Drops {
    cron = '0 */30 * * * *';

    constructor(core: Core) {
        super(core);
    }

    send = async (): Promise<void> => {
        const now = moment();

        const drops = await this.getDrops();

        // Checks if there is a stream in 10 minutes
        const dropStart = drops.find(drop => {
            const startDate = moment(drop.startDate);
            const hourMore = moment().add(ONE_HOUR, 'h');

            return startDate.isSame(hourMore, 'h');
        });

        // Checks if you can get drops right now.
        const dropBetween = drops.find(drop => {
            const startDate = moment(drop.startDate);
            const endDate = moment(drop.endDate);

            return (
                now.isBetween(startDate, endDate) &&
                !startDate.isSame(now, 'day')
            );
        });

        const drop = dropStart || dropBetween;

        if (!drop) {
            return;
        }

        const translations = {
            title: this.core.translations.get('drops', 'title', dropStart ? 'title_soon' : 'title_now'),
            ...this.core.translations.get('subscriptions', 'drops')
        };

        const description = this.core.translations.get('drops', 'description');

        const formatted = {
            ...drop,
            where: description[drop.where].render({ streamer: drop.streamer }),
            info: description[drop.info].render({ streamer: drop.streamer }),
            sending: description[drop.sending]
        };

        const startCondition = (): boolean => true;

        return this.notify(
            'drops',
            { translations, data: formatted },
            dropStart ? startCondition : this.condition
        );
    }

    condition(user: User): boolean {
        const tz = user.settings.timezone;

        return moment().tz(tz).hour() === SENDING_HOUR;
    }
}
