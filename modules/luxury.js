const imgurUploader = require( 'imgur-uploader' );
const cheerio = require( 'cheerio' );
const moment = require( 'moment' );
const axios = require( 'axios' );
const Path = require( 'path' );
const Jimp = require( 'jimp' );
const fs = require( 'fs' );

const furnitureIcons = JSON.parse(
    fs.readFileSync(
        Path.resolve( __dirname, 'dependencies', 'furniture.json' ),
        'utf8'
    )
);

const getItems = body => {
    const $ = cheerio.load( body );

    return $( '.entry-content ul' ).first().children().map( ( i, el ) => {
        const full_name = $( el ).text()
            .replace( /’/g, '\'' )
            .replace( /(\d+)g/g, '$1 g.' )
            .trim();

        if ( full_name.search( /([^\d]+)/ ) === -1 || full_name.search( 'http' ) !== -1 ) {
            return 'URL';
        }

        const name = full_name.match( /([^\d]+)/ )[0].trim();
        const icon = furnitureIcons[name] ? furnitureIcons[name].replace( '/esoui/art/icons/', '' ) : null;

        return { full_name, name, icon };
    }).get().filter( e => e !== 'URL' );
};

const downloadIcon = async icon => {
    if ( !icon ) {
        return false;
    }

    const url = 'http://esoicons.uesp.net/esoui/art/icons/' + icon;
    const path = Path.resolve( __dirname, '../temp', icon );
    const writer = fs.createWriteStream( path );

    const res = await axios({
        responseType: 'stream',
        method: 'get',
        url
    });

    res.data.pipe( writer );

    return new Promise( ( resolve, reject ) => {
        writer.on( 'finish', () => resolve( path ) );
        writer.on( 'error', reject );
    });
};

const drawImage = async ( core, icons ) => {
    if ( icons.length === 0 ) {
        return core.media.luxury;
    }

    const MAX_COUNT = 7;

    const file_name = Path.resolve( __dirname, '../temp', 'luxury.jpg' );
    const coordinates = {
        1: [ { x: 70, y: 70 } ],
        2: [ { x: 12, y: 87 }, { x: 87, y: 87 } ],
        3: [ { x: 22, y: 22 }, { x: 102, y: 22 }, { x: 22, y: 102 } ],
        4: [ { x: 20, y: 22 }, { x: 102, y: 22 }, { x: 22, y: 102 }, { x: 102, y: 102 } ],
        5: [ { x: 12, y: 12 }, { x: 87, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 } ],
        6: [ { x: 12, y: 12 }, { x: 87, y: 12 }, { x: 162, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 } ],
        7: [ { x: 12, y: 12 }, { x: 87, y: 12 }, { x: 162, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 }, { x: 87, y: 162 } ]
    };

    const baseLuxuryImage = await Jimp.read( __dirname + '/images/luxury.jpg' );
    const iconsCount = icons.length > MAX_COUNT ? MAX_COUNT : icons.length;

    const wholeImage = await icons.reduce( async ( img, icon, i ) => {
        const image = await img;

        if ( i > MAX_COUNT - 1 || !icon ) {
            return image;
        }

        const coords = coordinates[iconsCount][i];

        try {
            const iconBg = await Jimp.read( __dirname + '/images/bg.png' );
            const iconWithoutBg = await Jimp.read( icon );

            const iconWithBg = iconBg.composite( iconWithoutBg, 4, 4 ); // Добавляет фон иконке

            image.composite( iconWithBg, coords.x, coords.y );
        } catch ( err ) {
            core.logger.error( `An errror occured while trying to add an icon "${icon}" on image: ${err}` );
        }

        fs.unlink( icon, () => core.logger.log( `File "${icon}" was deleted.` ) );

        return image;
    }, baseLuxuryImage );

    await wholeImage.quality( 90 ).writeAsync( file_name );

    const file = fs.readFileSync( file_name );
    const data = await imgurUploader( file )
        .catch( err => ({ link: core.media.luxury, message: err }) );

    fs.unlink( file_name, () => core.logger.log( `File "${file_name}" was deleted.` ) );

    return data.link;
};

module.exports = core => {
    const translations = core.translations.getCategory( 'merchants', 'luxury' );

    const set = options => {
        core.info.set( 'luxury', options );

        return core.info.get( 'luxury' );
    };

    const send = async data => {
        const res = await core.get( data.url );

        if( res.result !== 'ok' ) {
            return;
        }

        const items = getItems( res.data );
        const translated = items.map( item => ({
            full_name: item.full_name,
            name: item.name // core.translations.getFurniture( icon.item )
        }) );

        const promises = items.map( item =>
            item.icon && downloadIcon( item.icon ) );

        const icons = await Promise.allSettled( promises )
            .then( result =>
                result.filter( icon => icon.status === 'fulfilled' )
                    .map( icon => icon.value ) );

        const image = await drawImage( core, icons );

        set({
            ...data,
            items: translated,
            image
        });

        return core.notify( 'luxury', { translations, data: { ...translated, image }, });
    };

    const get = ( request, reply )  => {
        const lang = request.settings.language;
        const NOW = moment().utc();

        const luxury = core.info.get( 'golden' );

        if( NOW.day() !== 0 && NOW.day() !== 6 ) {
            return reply.error( 'UNEXPECTED_LUXURY_DATE' );
        } else if( !moment( luxury.date ).isSame( NOW, 'day' )
            && !moment( luxury.date ).isSame( NOW.subtract( 1, 'd' ), 'day' ) ) {
            return reply.error( 'DONT_HAVE_ITEMS_YET' );
        }

        const translations = core.translate( 'commands/luxury', lang );
        translations.title = translations.title.render({ date: core.translations.getDates()[lang] });

        return reply.ok({ translations, data: luxury });
    };

    return { send, set, get };
};
