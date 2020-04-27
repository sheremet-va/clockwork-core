import * as translations from './translations.json';

const errors = translations.errors;
const NOT_FOUND = {
    errors: {
        NOT_FOUND: errors.errors.NOT_FOUND
    }
};

class Translations {
    name: string;

    constructor() {
        this.name = 'translations';
    }

    get(): AllTranslations;
    get(type: string): Type;
    get(type: string, cat: string): Category;
    get(type: string, cat: string, tag: string): Item;
    get(type?: string, cat?: string, tag?: string): AllTranslations | Type | Category | Item {
        if (!type) {
            return translations;
        }

        const byType = translations[type as keyof typeof translations];

        if (!cat) {
            return byType || NOT_FOUND;
        }

        const byCat = byType[cat as keyof typeof byType];

        if (!tag) {
            return byCat || NOT_FOUND;
        }

        const byTag = byCat[tag as keyof typeof byCat];

        return byTag || {
            ru: tag,
            en: tag
        };
    }

    translate(lang: language, render: null | Record<string, RenderObject>, type: string): TranslatedType | null;
    translate(lang: language, render: null | Record<string, RenderObject>, type: string, category: string): TranslatedCategory | null;
    translate(lang: language, render: null | Record<string, RenderObject>, type: string, category: string, tag: string): Tag | Item;
    translate(
        lang: language,
        render: null | Record<string, RenderObject>,
        type: string,
        category?: string,
        tag?: string
    ): TranslatedType | TranslatedCategory | Tag | Item | null {
        const tType = this.get(type);

        if (typeof tType !== 'string' && 'errors' in tType && category !== 'errors') {
            return null;
        }

        if (!category) {
            return Object.keys(tType).reduce((str, tCategory) => {
                const translation = Object.keys(tType[tCategory]).reduce((strCat, tagName) => {
                    const translated = this.get(type, tCategory, tagName)[lang];
                    const tag = translated.render(render ? render[tagName] : null);

                    return { ...strCat, [tagName]: tag };
                }, {});

                return { ...str, [tCategory]: translation };
            }, {});
        }

        const tCategory = this.get(type, category);

        if (typeof tCategory !== 'string' && 'errors' in tCategory) {
            return null;
        }

        if (tag) {
            return this.get(type, category, tag)[lang] || tag;
        }

        return Object.keys(tCategory).reduce((result, tagName) => {
            const translated = this.get(type, category, tagName)[lang];
            const tErrors = this.get(type, category)[lang];

            const tag = (translated || tErrors).render(render ? render[tagName] : null);

            return { ...result, [!translated ? category : tagName]: tag };
        }, {});
    }
}

export type RenderObject = Record<string, Record<string, string>> | Record<string, string>;

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

export declare interface TranslatedCategory {
    [key: string]: Tag;
}

export declare interface TranslatedType {
    [key: string]: TranslatedCategory;
}

export { Translations };