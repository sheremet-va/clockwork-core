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
        const fullName = $( el ).text()
            .replace( /’/g, '\'' )
            .trim();

        if ( fullName.search( /([^\d]+)/ ) === -1 || fullName.search( 'http' ) !== -1 ) {
            return 'URL';
        }

        const name = fullName.match( /([^\d]+)/ )[0].trim();
        const price = fullName.match( /([\d,g\s]{3,})/ )[0].trim();
        const isNew = fullName.search( /NEW/i ) !== -1;
        const icon = furnitureIcons[name]
            ? furnitureIcons[name].replace( '/esoui/art/icons/', '' )
            : null;

        return { name, price, icon, isNew };
    }).get().filter( e => e !== 'URL' );
};

const downloadIcon = async icon => {
    if ( !icon ) {
        return false;
    }

    const url = 'http://esoicons.uesp.net/esoui/art/icons/' + icon;
    const path = Path.resolve( __dirname, '../temp', icon );
    const writer = fs.createWriteStream( path );

    try {
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
    } catch( err ) {
        return Promise.reject( err );
    }
};

const drawImage = async function( icons ) {
    if ( icons.length === 0 ) {
        return this.media.luxury;
    }

    const MAX_COUNT = 7;

    const fileName = Path.resolve( __dirname, '../temp', 'luxury.jpg' );
    const coordinates = {
        1: [{ x: 70, y: 70 }],
        2: [{ x: 12, y: 87 }, { x: 87, y: 87 }],
        3: [{ x: 22, y: 22 }, { x: 102, y: 22 }, { x: 22, y: 102 }],
        4: [{ x: 20, y: 22 }, { x: 102, y: 22 }, { x: 22, y: 102 }, { x: 102, y: 102 }],
        5: [{ x: 12, y: 12 }, { x: 87, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 }],
        6: [{ x: 12, y: 12 }, { x: 87, y: 12 }, { x: 162, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 }],
        7: [{ x: 12, y: 12 }, { x: 87, y: 12 }, { x: 162, y: 12 }, { x: 12, y: 87 }, { x: 87, y: 87 }, { x: 12, y: 162 }, { x: 87, y: 162 }]
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
        } catch( err ) {
            this.logger.error( `An errror occured while trying to add an icon "${icon}" on image: ${err}` );
        }

        fs.unlink( icon, () => this.logger.log( `File "${icon}" was deleted.` ) );

        return image;
    }, baseLuxuryImage );

    await wholeImage.quality( 90 ).writeAsync( fileName );

    const file = fs.readFileSync( fileName );
    const { link } = await imgurUploader( file )
        .catch( err => ({ link: this.media.luxury, message: err }) );

    fs.unlink( fileName, () => this.logger.log( `File "${fileName}" was deleted.` ) );

    return link;
};

module.exports = function() {
    const send = async ({ link, date }) => {
        const { data } = await this.get( link );

        const items = getItems( data );
        const translated = items.map( item => ({
            name: item.name, // core.translations.getFurniture( icon.item )
            price: item.price,
            isNew: item.isNew
        }) );

        const promises = items.map( item =>
            item.icon && downloadIcon( item.icon ) );

        const icons = await Promise.allSettled( promises )
            .then( result =>
                result.filter( icon => icon.status === 'fulfilled' )
                    .map( icon => icon.value ) );

        const image = await drawImage.call( this, icons );

        await this.info.set( 'luxury', { items: translated, date, link, image });

        const translations = this.translations.getCategory( 'merchants', 'luxury' );

        return this.notify( 'luxury', { translations, data: { ...translated, image }, });
    };

    const get = async ({ settings: { language: lang } }) => {
        const NOW = moment().utc();

        const luxury = await this.info.get( 'luxury' );

        if( NOW.day() !== 0 && NOW.day() !== 6 ) {
            throw new this.Error( 'UNEXPECTED_LUXURY_DATE' );
        } else if( !moment( luxury.date ).isSame( NOW, 'day' )
            && !moment( luxury.date ).isSame( NOW.subtract( 1, 'd' ), 'day' ) ) {
            throw new this.Error( 'DONT_HAVE_ITEMS_YET' );
        }

        const translations = this.translate( 'commands/luxury', {
            title: {
                date: this.translations.getDates()[lang]
            }
        });

        return { translations, data: luxury };
    };

    return { send, get };
};
