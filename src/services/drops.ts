import moment from 'moment';
import * as cheerio from 'cheerio';

import { CronJob } from 'cron';

import { DropsController, DropItem } from '../controllers/drops';

const ESO_URL = 'https://www.elderscrollsonline.com';

export class DropsManager {
    drops: DropsController

    constructor(public core: Core) {
        this.drops = core.info.drops;

        // new CronJob('*/15 * * * * *', this.work).start();
        new CronJob('0 */10 * * * *', this.work).start();
        new CronJob('0 0 0 */1 * *', this.remove).start();
    }

    work = async (): Promise<void> => {
        const date = Math.round(new Date().valueOf() / 1000);

        const { data } = await this.core.request({
            url: ESO_URL + '/en-us/streamers',
            method: 'get',
            headers: {
                Cookie: `platform=ps4; accepts_cookies=true; block-cookies=no; age_gate=-2208988800%26${date}; country=United+States`
            }
        });

        const have = await this.drops.get(new Date().valueOf());

        const $ = cheerio.load(data as string);

        const drops = $('.event-item').map(async (_, node) => {
            const $node = $(node);
            const link = $node.find('a').attr('href');
            const image = $node.find('img').attr('src') || null;

            const { data: drop } = await this.core.request(ESO_URL + link);

            const $drop = $(drop);

            const dates = $drop.find('.special').text().trim().split('\n');
            const { startDate, endDate } = this.buildDates(dates[1].trim());

            const haveDrop = have.some(drop => drop.startDate === startDate && drop.endDate === endDate);

            if (haveDrop) {
                return 'skip';
            }

            const { sendingDate, sending } = this.getSending((dates[3] || '').trim());

            const details = $drop.find('.events-details').text();
            const { where, info, url, details: description } = this.buildDetails(details);

            return {
                startDate, endDate,
                where,
                url,
                info,
                image,
                streamer: 'Bethesda',
                description,
                sending,
                sendingDate: sendingDate === 0 ? sendingDate : endDate
            };
        }).get();

        void Promise.allSettled(drops).then(drops => {
            drops.forEach(result => {
                if (result.status !== 'fulfilled') {
                    void this.core.logger.error('CoreDropsError', result.reason);
                    return;
                }

                if (result.value === 'skip') {
                    return;
                }

                const drop = result.value as DropItem;

                this.core.logger.service(`Drops added to db: start ${drop.startDate}, end ${drop.endDate}`);

                void this.drops.set(drop);
            });
        });
    };

    remove = async (): Promise<void> => {
        this.core.logger.service('Drops `remove` service started.');

        const weekAgo = moment().subtract(1, 'week').valueOf();

        const have = await this.drops.get(weekAgo);
        const now = moment();

        const over = have.filter(drop => moment(drop.endDate).isBefore(now));

        if(!over.length) {
            this.core.logger.service('No drops were removed.');
        }

        const promises = over.map(({ startDate, endDate }) => {
            this.drops.remove(startDate, endDate);

            return { startDate, endDate };
        });

        await Promise.allSettled(promises).then(res => {
            res.forEach(result => {
                if (result.status === 'fulfilled') {
                    const { startDate, endDate } = result.value;

                    return this.core.logger.service(`Drop with params ${startDate} and ${endDate} was removed.`);
                }

                this.core.logger.error('CoreInternalError','CAN\'T REMOVE DROP: ' + result.reason);
            });
        });
    };

    getSendingString(dates: string[]): string {
        if (dates.length > 1) {
            return 'sending_every_day';
        }

        if(dates[0].includes('after the str')) {
            return 'sending_after_stream';
        }

        return 'sending_one_day';
    }

    getSending(dates: string): { sendingDate: number; sending: string } {
        const goOutDates = dates.split(dates.includes(',') ? ',' : ' - ');

        const sending = this.getSendingString(goOutDates);
        const sendingDate = sending === 'sending_after_stream' ? 0 : this.buildDate(goOutDates[0]);

        return { sendingDate, sending };
    }

    buildDates(date: string): { startDate: number; endDate: number } {
        const [start, end] = date.split(' - ');

        const startDate = this.buildDate(start);
        const endDate = this.buildDate(end);

        return { startDate, endDate };
    }

    buildDate(date: string): number {
        const cleanDate = date.replace('@ ', '').replace(/([\d]+)(PM|AM)/, '$1:00 $2');

        return new Date(cleanDate + (cleanDate.includes('EST') ? '' : ' EST')).valueOf();
    }

    buildDetails(details: string): { where: string; info: string; url: string; details: string } {
        const any: boolean = /ESO\sstream/i.test(details);
        const team: boolean = /Stream\sTeam/i.test(details);

        const where = this.getWhere({ any, team });
        const info = this.getInfo({ any, team });
        const url = this.getUrl({ any, team });

        return { where, info, url, details: details.trim() };
    }

    getUrl({ any = false, team = false, streamer = 'Bethesda' }): string {
        if (any || team) {
            return 'https://www.twitch.tv/directory/game/The%20Elder%20Scrolls%20Online';
        }

        return 'https://www.twitch.tv/' + streamer;
    }

    getWhere({ any = false, team = false }): string {
        if (any) {
            return 'where_any';
        }

        if (team) {
            return 'where_stream_team';
        }

        return 'where_streamer';
    }

    getInfo({ any = false, team = false }): string {
        if (any) {
            return 'info_any';
        }

        if (team) {
            return 'info_stream_team';
        }

        return 'info_watch_stream';

        // info_watch_streamer
        // info_watch_streamers
    }
}
