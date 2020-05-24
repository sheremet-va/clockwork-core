import Patch from '../modules/patch';

import { PatchInfo } from '../controllers/info';

interface PatchReply {
    title: string;
    link: string;
    description: string;
    image: string;
}

export default class ApiPatch extends Patch {
    constructor(core: Core) {
        super(core);
    }

    translate(patch: PatchInfo, lang: language): PatchReply {
        const title = patch.title[lang];
        const link = patch.link[lang];
        const description = patch.description[lang];

        return {
            title,
            link,
            description,
            image: patch.image
        };
    }

    patch = async ({ settings: { language: lang } }: CoreRequest): Promise<ReplyOptions> => {
        const patch = await this.core.info.get<PatchInfo>('patch');
        const translations = this.core.translate(lang, 'commands', 'patch');

        return { translations, data: this.translate(patch, lang) };
    };

    pts = async ({ settings: { language: lang } }: CoreRequest): Promise<ReplyOptions> => {
        const patch = await this.core.info.get<PatchInfo>('pts');
        const translations = this.core.translate(lang, 'commands', 'patch');
        const translated = this.translate(patch, lang);

        console.log(translated);

        return { translations, data: translated };
    };
}