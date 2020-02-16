const moment = require( 'moment' );

const __module = {
    name: 'pledges',
    path: '/pledges/:days',
    time: '25 00 9 * * *'
};

module.exports = function() {
    const getPledges = ( days = 0 ) => {
        // TODO place into db
        const pledgesMaj = [
            /*  0 */ 'Wayrest Sewers II',
            /*  1 */ 'Fungal Grotto I',
            /*  2 */ 'The Banished Cells II',
            /*  3 */ 'Darkshade Caverns I',
            /*  4 */ 'Elden Hollow II',
            /*  5 */ 'Wayrest Sewers I',
            /*  6 */ 'Spindleclutch II',
            /*  7 */ 'The Banished Cells I',
            /*  8 */ 'Fungal Grotto II',
            /*  9 */ 'Spindleclutch I',
            /* 10 */ 'Darkshade Caverns II',
            /* 11 */ 'Elden Hollow I'
        ];

        const pledgesGlirion = [
            /*  0 */ 'Arx Corinium',
            /*  1 */ 'Selene\'s Web',
            /*  2 */ 'City of Ash II',
            /*  3 */ 'Crypt of Hearts I',
            /*  4 */ 'Volenfell',
            /*  5 */ 'Blessed Crucible',
            /*  6 */ 'Direfrost Keep',
            /*  7 */ 'Vaults of Madness',
            /*  8 */ 'Crypt of Hearts II',
            /*  9 */ 'City of Ash I',
            /* 10 */ 'Tempest Island',
            /* 11 */ 'Blackheart Haven'
        ];

        const pledgesUrgarlag = [
            /*  0 */ 'Falkreath Hold',
            /*  1 */ 'Fang Lair',
            /*  2 */ 'Scalecaller Peak',
            /*  3 */ 'Moon Hunter Keep',
            /*  4 */ 'March of Sacrifices',
            /*  5 */ 'Depths of Malatar',
            /*  6 */ 'Frostvault',
            /*  7 */ 'Moongrave Fane',
            /*  8 */ 'Lair of Maarselok',
            /*  9 */ 'Imperial City Prison',
            /* 10 */ 'Ruins of Mazzatun',
            /* 11 */ 'White-Gold Tower',
            /* 12 */ 'Cradle of Shadows',
            /* 13 */ 'Bloodroot Forge'
        ];

        const knownDate = moment([2019, 2, 12]);
        const now = moment();

        const daysLeft = now.hours() < 9
            ? now.diff( knownDate, 'd' ) - 1
            : now.diff( knownDate, 'd' );

        if ( days === 0 ) {
            const tMajPledge = daysLeft % pledgesMaj.length;
            const tGlirionPledge = daysLeft % pledgesGlirion.length;
            const tUrgarlagPledge = daysLeft % pledgesUrgarlag.length;

            return [
                getTranslations( 'pledges', pledgesMaj[tMajPledge]),
                getTranslations( 'pledges', pledgesGlirion[tGlirionPledge]),
                getTranslations( 'pledges', pledgesUrgarlag[tUrgarlagPledge])
            ];
        }

        if ( days > 0 && days < 31 ) {
            const trueDays = days + daysLeft;

            const MajPledge = trueDays % pledgesMaj.length;
            const GlirionPledge = trueDays % pledgesGlirion.length;
            const UrgarlagPledge = trueDays % pledgesUrgarlag.length;

            return [
                getTranslations( 'pledges', pledgesMaj[MajPledge]),
                getTranslations( 'pledges', pledgesGlirion[GlirionPledge]),
                getTranslations( 'pledges', pledgesUrgarlag[UrgarlagPledge])
            ];
        }

        return false;
    };

    const getMask = pledge => {
        const masks = {
            'Fungal Grotto I': 'Kra\'gh',
            'Spindleclutch I': 'Swarm Mother',
            'The Banished Cells I': 'Shadowrend',
            'Darkshade Caverns I': 'Sentinel of Rkugamz',
            'Wayrest Sewers I': 'Slimecraw',
            'Elden Hollow I': 'Chokethorn',
            'Arx Corinium': 'Sellistrix',
            'Crypt of Hearts I': 'Ilambris',
            'City of Ash I': 'Infernal Guardian',
            'Direfrost Keep': 'Iceheart',
            'Volenfell': 'Tremorscale',
            'Tempest Island': 'Stormfist',
            'Blessed Crucible': 'Troll King',
            'Blackheart Haven': 'Pirate Skeleton',
            'Selene\'s Web': 'Selene',
            'Vaults of Madness': 'Grothdarr',
            'Fungal Grotto II': 'Spawn of Mephala',
            'Wayrest Sewers II': 'Scourge Harvester',
            'White-Gold Tower': 'Molag Kena',
            'Imperial City Prison': 'Lord Warden',
            'Ruins of Mazzatun': 'Mighty Chudan',
            'Cradle of Shadows': 'Velidreth',
            'The Banished Cells II': 'Maw of the Infernal',
            'Elden Hollow II': 'Nightflame',
            'Darkshade Caverns II': 'Engine Guardian',
            'Spindleclutch II': 'Blood Spawn',
            'Crypt of Hearts II': 'Nerien\'eth',
            'City of Ash II': 'Valkyn Skoria',
            'Bloodroot Forge': 'Earthgore',
            'Falkreath Hold': 'Domihaus',
            'Scalecaller Peak': 'Zaan',
            'Fang Lair': 'Thurvokun',
            'Moon Hunter Keep': 'Vykosa',
            'March of Sacrifices': 'Balorgh',
            'Frostvault': 'Stonekeeper',
            'Depths of Malatar': 'Symphony of Blades',
            'Moongrave Fane': 'Grundwulf',
            'Lair of Maarselok': 'Maarselok'
        };

        return masks[pledge] ? masks[pledge] : pledge;
    };

    const getTranslations = ( subcat, name ) => {
        const level = /( I| II)$/.test( name )
            ? name.match( /( I| II)$/ )[0]
            : '';

        const instance = name.replace( level, '' );
        const translated = this.translations.get( `instances/${subcat}/${instance}` );

        return Object.entries( translated ).reduce( ( instances, [langCode, inst]) => {
            const newName = level && !inst.NOT_FOUND ? inst + level : inst;

            return {
                ...instances,
                [name]: {
                    ...instances[name],
                    [langCode]: newName
                }
            };
        }, {});
    };

    const translate = ( strings, lang = 'en' ) => {
        return strings.reduce( ( final, pledge ) => {
            const [name] = Object.keys( pledge );

            if( !pledge[name].errors ) {
                return { ...final, [name]: pledge[name][lang] };
            }

            return { ...final, [name]: pledge[name].errors.NOT_FOUND[lang] };
        }, {});
    };

    const get = async ({ settings: { language: lang }, params }) => {
        const days = parseInt( params.days );
        const pledges = getPledges( days );

        if( !pledges ) {
            throw new this.Error( 'INCORRECT_PLEDGES_DATE' );
        }

        const masks = pledges.map( pledge => getTranslations(
            'masks', getMask( Object.keys( pledge )[0]) ) );

        const translations = this.translate( 'commands/pledges', {
            after_days: {
                days: this.translations.translateDays( days, lang )
            }
        });

        const options = {
            translations,
            data: {
                pledges: translate( pledges, lang ),
                masks: translate( masks, lang )
            }
        };

        if( days > 0 ) {
            options.translations = {
                ...options.translations,
                ...this.translations.getPledgesDate( days, lang )
            };
        } else {
            delete options.translations.after_days;
        }

        return options;
    };

    const send = () => {
        const TOMORROW = 1;

        const today = getPledges();
        const tomorrow = getPledges( TOMORROW );

        return this.notify( 'pledges', { data: { today, tomorrow } });
    };

    return { ...__module, get, send };
};