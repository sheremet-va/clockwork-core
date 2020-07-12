import * as fs from 'fs';

const names = [
    'logs',
    'requests',
    'temp'
];

function run(): void {
    names.forEach(name => {
        const folderPath = `${__dirname}/../${name}`;

        if (!fs.existsSync(folderPath)){
            fs.mkdirSync(folderPath);
        }
    });
}

export default { run };
