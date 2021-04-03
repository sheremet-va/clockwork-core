import Translate from '../modules/translate';

import { CoreError } from '../services/core';

import axios from 'axios';

type Tables = Record<string, {
    plural: string;
    aliases: string[];
    results: { ru: string; en: string }[];
}>;

export declare type TranslationsApiResult = {
    tableName: string;
    textRuOff: string;
    textFr: string;
    textDe: string;
    textEn: string;
}[];

export default class TranslateModule extends Translate {
    private tables: Tables = {
        'Достижение': {
            plural: 'Достижения',
            aliases: ['достижение', 'Достижение', 'достижения', 'Достижения', 'ачивка'],
            results: []
        },
        'Квест': {
            plural: 'Задания',
            aliases: ['задание', 'квест', 'Квест', 'задания', 'квесты', 'Квесты'],
            results: []
        },
        'Предмет': {
            plural: 'Предметы',
            aliases: ['предмет', 'Предмет', 'итем', 'предметы', 'Предметы', 'итемы'],
            results: []
        },
        'NPC': {
            plural: 'Персонажи',
            aliases: ['нип', 'нпс', 'персонаж', 'NPC', 'npc', 'НИП', 'нипы', 'персонажи', 'НИПЫ'],
            results: []
        },
        'Локация': {
            plural: 'Локации',
            aliases: ['лока', 'локация', 'Локация', 'локи', 'локации', 'Локации'],
            results: []
        },
        'Коллекционный предмет': {
            plural: 'Коллекционные предметы',
            aliases: ['коллекционные', 'коллекционки', 'коллекционка', 'колл'],
            results: []
        }
    };

    constructor(core: Core) {
        super(core);
    }

    private clean(value: string): string {
        return value.replace('<<player{', '').replace('}>>', '').replace(/\^\w+$/, '');
    }

    private isEmpty(object: Tables): boolean {
        return !Object.values(object).filter(({ results }) => results.length).length;
    }

    private getTable(search: string[]): [string, string[]] | [null, string[]] {
        const item = Object.entries(this.tables)
            .find(([, { aliases }]) => aliases.find(alias => {
                const regexp = new RegExp(alias, 'i');

                return search.some(el => regexp.test(el));
            }));

        if (item) {
            return [item[0], item[1].aliases];
        }

        return [null, []];
    }

    get = async (request: CoreRequest): Promise<ReplyOptions> => {
        const search: string = request.query.search;

        if (!search) {
            throw new CoreError('TRANSLATE_EMPTY_QUERY');
        }

        const args = search.split(' ');

        const [table, aliases] = this.getTable(args);
        const query = args
            .filter(word => !aliases.includes(word.toLowerCase()))
            .join(' ')
            .toLowerCase()
            .trim();

        if (query.length < 4) {
            throw new CoreError('TRANSLATE_TOO_SHORT_QUERY');
        }

        const encodedSearch = encodeURI(query).replace('&', '%26').replace('#', '%23').replace('#', '%24');

        const apiUrl = `http://ruesoportal.elderscrolls.net/searchservlet?searchtext=${encodedSearch}`;

        // try catch
        const { data } = await axios.get<string>(apiUrl);
        const empty = data === 'parseResponse([]);';

        const error = `TRANSLATE_NO_RESULTS${table ? '_TABLE' : ''}`;
        const render = { table, query };

        if (empty) {
            throw new CoreError(error, render);
        }

        const result = JSON.parse(data.replace('parseResponse(', '').replace(');', '')) as TranslationsApiResult;

        const skip = ['Описание способности', 'Описание коллекционного предмета'];
        const found: string[] = [];

        const translations = result.reduce((acc, { tableName, textRuOff, textEn }) => {
            if (!tableName || skip.includes(tableName) || !(tableName in acc)) {
                return acc;
            }

            const cleanedRu = this.clean(textRuOff);
            const cleanedEn = this.clean(textEn);

            if (cleanedRu === cleanedEn || found.includes(cleanedRu)) {
                return acc;
            }

            found.push(cleanedRu);

            acc[tableName].results.push({
                ru: cleanedRu,
                en: cleanedEn
            });

            return acc;
        }, { ...this.tables });

        if (this.isEmpty(translations)) {
            throw new CoreError(error, render);
        }

        if (table && translations[table] && !translations[table].results) {
            throw new CoreError(error, render);
        }

        return { translations, data: render };
    };
}
