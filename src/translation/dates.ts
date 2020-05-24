import * as moment from 'moment-timezone';

import { Translations } from './translation';
import { CoreError } from '../services/core';
import { Maintenance } from '../subscriptions/status';
import { languages } from '../configs/main';
import { Logger } from '../services/logger';

export declare type replaces = {
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
    translate = new Translations();
    logger = new Logger();

    private zone(timezone: string): moment.MomentZone {
        const zone = moment.tz.zone(timezone);

        if( !zone ) {
            throw new CoreError('Invalid timezone: ' + timezone);
        }

        return zone;
    }

    private replaces(
        { start, end }: { start?: string | number; end?: string | number },
        { timezone, language }: { timezone: string; language: language }
    ): replaces {
        const abbr = this.zone(timezone).abbr(new Date().valueOf());

        const startDate = moment(start).tz(timezone).locale(language);
        const endDate = moment(end).tz(timezone).locale(language);

        return {
            startDate,
            endDate,
            replaces: {
                start_day: this.format(startDate, 'LLY'),
                start_time: startDate.format('LT'),
                end_day: this.format(endDate, 'LLY'),
                end_time: endDate.format('LT'),
                abbr
            }
        };
    }

    // TODO check moment types
    pledges(days: number, lang: language): { day: string; date: string } {
        const day = moment().add(days, 'days');

        return {
            date: this.format(day.locale(lang), 'LLY'),
            day: day.locale(lang).format('dddd')
        };
    }

    private format(date: moment.Moment, format: string): string {
        const formats = {
            LLY: {
                en: 'MMMM D',
                ru: 'D MMMM'
            },
            LLLT: {
                en: 'MMMM D, LT',
                ru: 'D MMMM с LT'
            }
        };

        const lang = date.locale() as language;

        return date.format(formats[format as keyof typeof formats][lang]);
    }

    drops(start: string | number, end: string | number, timezone: string): { [key in language]: string } {
        const translations = this.translate.get('drops', 'dates');

        const result = languages.reduce((description, language) => {
            const {
                startDate,
                endDate,
                replaces
            } = this.replaces({ start, end }, { timezone, language });

            const trCode = moment(startDate).isSame(endDate, 'day') ? 'one_day' : 'period';

            return {
                ...description,
                [language]: translations[trCode][language].render(replaces)
            };
        }, {}) as { [key in language]: string };

        return result;
    }

    dropsSending(date: number, lang: language, timezone: string): { time: string; date: string } {
        const abbr = this.zone(timezone).abbr(date);

        const time = moment(date).tz(timezone);

        return {
            time: time.locale(lang).format('LT') + ` (${abbr})`,
            date: this.format(time.locale(lang), 'LLY')
        };
    }

    maintenance(maintenance: Maintenance, settings: Settings): { [key: string]: replaces } {
        if (!Object.keys(maintenance)) {
            return {};
        }

        return Object.entries(maintenance).reduce((final, [platform, time]) => {
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
            en: this.format(day.locale('en'), 'LLY'),
            ru: this.format(day.locale('ru'), 'LLY')
        };
    }

    pluralize(day: number, lang: language): string {
        const days = {
            en: ['day', 'days'],
            ru: ['день', 'дня', 'дней']
        };

        return day.pluralize(days[lang], lang);
    }

    private log(message: string): void {
        try {
            throw new Error();
        } catch(err) {
            this.logger.error(
                `${message}\n` + err.stack
            );
        }
    }

    private time(time: string): string {
        const match = /\(([0-9:]+) UTC\)/.exec(time);

        if( !match ) {
            this.log(
                `Error while parsing ${time} time. Empty string returned.`
            );

            return '';
        }

        const [hour, min] = match[1].split(':');

        if (hour.length === 1) {
            return `0${hour}:${min}`;
        }

        return `${hour}:${min}`;
    }

    private day(day: string): string {
        const match_date = /\d+/.exec(day);
        const match_month = /\w+/.exec(day);

        if( !match_date || !match_month ) {
            this.log(
                `Can't parse ${day} day. (Date: ${match_date}, Month: ${match_month}) Empty string returned.`
            );

            return '';
        }

        const date = match_date[0];
        const month = match_month[0].slice(0, 3);

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

        if( !startTime || !endTime || !startDay ) {
            return {
                start: '',
                end: ''
            };
        }

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