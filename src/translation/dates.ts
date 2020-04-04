import moment from 'moment-timezone';

import { Translations, Category } from './translation';
import { Maintenance } from '../modules/status';
import { languages } from '../configs/main';

import locales from './locales';

locales(moment);

type replaces = {
    startDate: moment.Moment;
    endDate: moment.Moment;
    replaces: {
        start_day: string;
        start_time: string;
        end_day: string;
        end_time: string;
        abbr: string;
    };
}

class Dates {
    translate: Translations;

    constructor() {
        this.translate = new Translations();
    }

    private replaces(
        { start, end }: { start?: number; end?: number },
        { timezone, language }: Settings
    ): replaces {
        const abbr = moment.tz.zone(timezone).abbr(new Date().valueOf());

        const startDate = moment(start).tz(timezone).locale(language);
        const endDate = moment(end).tz(timezone).locale(language);

        return {
            startDate,
            endDate,
            replaces: {
                start_day: startDate.format('[LL-Y]'),
                start_time: startDate.format('LT'),
                end_day: endDate.format('[LL-Y]'),
                end_time: endDate.format('LT'),
                abbr
            }
        };
    }

    // TODO check moment types
    pledges(days: number, lang: language): { day: string; date: string } {
        const day = moment().add(days, 'days');

        return {
            date: day.locale(lang).format('[LL-Y]'),
            day: day.locale(lang).format('dddd')
        };
    }

    drops(start: number, end: number, timezone: string): { [key in language]: string } {
        const translations = this.translate.get('drops/dates') as Category;

        const result = languages.reduce((description, language) => {
            const {
                startDate,
                endDate,
                replaces
            } = this.replaces({ start, end }, { timezone, language });

            const trCode = moment(startDate).isSame(endDate, 'day') ? 'one_day' : 'period';

            return {
                ...description,
                [language]: translations[trCode][language].render(replaces) as string
            };
        }, {}) as { [key in language]: string };

        return result;
    }

    dropsSending(date: number, lang: language, timezone: string): { time: string; date: string } {
        const abbr = moment.tz.zone(timezone).abbr(date);

        const time = moment(date).tz(timezone);

        return {
            time: time.locale(lang).format('LT') + ` (${abbr})`,
            date: time.locale(lang).format('[LL-Y]')
        };
    }

    maintence(maintence: Maintenance, settings: Settings): { [key: string]: replaces } {
        if (!Object.keys(maintence)) {
            return {};
        }

        return Object.entries(maintence).reduce((final, [platform, time]) => {
            const render = this.replaces(time, settings);

            return {
                ...final,
                [platform]: render
            };
        }, {});
    }

    // TODO check types
    date(time = new Date()): { en: string; ru: string } {
        const day = moment(time);

        return {
            en: day.locale('en').format('[LL-Y]'),
            ru: day.locale('ru').format('[LL-Y]')
        };
    }

    pluralize(day: number, lang: language): string {
        const days = {
            en: ['day', 'days'],
            ru: ['день', 'дня', 'дней']
        };

        return day.pluralize(days[lang], lang);
    }

    private time(time: string): string {
        const result = /\(([0-9:]+) UTC\)/.exec(time)[1];

        const [hour, min] = result.split(':');

        if (hour.length === 1) {
            return `0${hour}:${min}`;
        }

        return `${hour}:${min}`;
    }

    private day(day: string): string {
        const date = /\d+/.exec(day)[0];
        const month = /\w+/.exec(day)[0].slice(0, 3);

        return `${date} ${month}`;
    }

    RFC(string: string): { start: string; end: string } {
        const [, date] = string.split(' – ');

        const [startDate, end] = date.split(' - ');
        const [day, start] = startDate.split(', ');

        const startTime = this.time(start);
        const endTime = this.time(end);
        const startDay = this.day(day);
        const curYear = new Date().getFullYear();

        const [startResult, endResult] = [
            `${startDay} ${curYear} ${startTime} GMT`,
            `${startDay} ${curYear} ${endTime} GMT`
        ];

        return {
            start: startResult,
            end: endResult
        };
    }
}

export { Dates };