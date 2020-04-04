import * as translations from './translations.json';

const errors = translations.errors;
const NOT_FOUND = {
    errors: {
        NOT_FOUND: errors.errors.NOT_FOUND
    }
};

export declare type Tag = string;
export declare type Item = {
    [key in language]: Tag;
}

export declare interface Category {
    [key: string]: Item;
}

export declare interface Type {
    [key: string]: Category;
}

export declare interface AllTranslations {
    [key: string]: Type;
}

interface TranslatedCategory {
    [key: string]: Tag;
}

interface TranslatedType {
    [key: string]: TranslatedCategory;
}

class Translations {
    name: string;

    constructor() {
        this.name = 'translations';
    }

    get(path = ''): AllTranslations | Type | Category | Item | Tag {
        const [type, cat, tag] = path.split('/');

        if (!type) {
            return translations;
        }

        if (!cat) {
            return translations[type] || NOT_FOUND;
        }

        if (!tag) {
            return translations[type][cat] || NOT_FOUND;
        }

        // TODO сделать иначе
        return translations[type][cat][tag] || {
            ru: tag,
            en: tag
        };
    }

    translate(lang: language, path: string, render = {}): TranslatedType | TranslatedCategory | Tag {
        const [type, category, tag] = path.split('/');

        const tType = this.get(type);

        if (typeof tType !== 'string' && 'errors' in tType && category !== 'errors') {
            return null;
        }

        if (!category) {
            return Object.keys(tType).reduce((str, tCategory) => {
                const translation = Object.keys(tType[tCategory]).reduce((strCat, tagName) => {
                    const translated = this.get(`${type}/${tCategory}/${tagName}`)[lang];
                    const tag = translated.render(render[tagName]);

                    return { ...strCat, [tagName]: tag };
                }, {});

                return { ...str, [tCategory]: translation };
            }, {});
        }

        const tCategory = this.get(type + '/' + category);

        if (typeof tCategory !== 'string' && 'errors' in tCategory) {
            return null;
        }

        if (tag) {
            return this.get(`${type}/${category}/${tag}`)[lang] || {
                ru: tag,
                en: tag
            };
        }

        return Object.keys(tCategory).reduce((result, tagName) => {
            const translated = this.get(`${type}/${category}/${tagName}`)[lang];
            const tErrors = this.get(`${type}/${category}`)[lang];

            const tag = (translated || tErrors).render(render[tagName]);

            return { ...result, [!translated ? category : tagName]: tag };
        }, {});
    }
}

export declare type translate = (path: string, render?: object) => Type | Category | Tag;

export { Translations };