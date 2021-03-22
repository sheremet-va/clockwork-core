const { existsSync: folderExist, mkdirSync: createFolder } = require('fs');
const Path = require('path');
const homedir = require('os').homedir();

function createIfNonExistant(path) {
    if(!folderExist(path)) {
        console.log('[Clockwork Core]', 'Creating folder', path);

        createFolder(path);
    }
}

const root = Path.resolve(homedir, '.clockwork');

createIfNonExistant(root);

const projects = [
    'assistant'
];

projects.forEach(name => {
    const path = Path.resolve(root, name);

    createIfNonExistant(path);
})
