import moment from 'moment';

import * as fs from 'fs';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);
const writeFile = promisify(fs.writeFile);

class Logger {
    private async write(content: string, type = 'log'): Promise<void> {
        const now = moment();

        const timestamp = `[${now.format('YYYY-MM-DD HH:mm:ss')}]:`;
        const day = `${now.format('YYYY-MM-DD')}`;

        const message = `${timestamp} (${type.toUpperCase()}) ${content}`;
        const path = `src/logs/${day}-logs.txt`;

        try {
            await appendFile(path, `${message}\n`);
        } catch (e) {
            await writeFile(path, `${message}\n`)
                .catch(console.error);
        }

        // TODO слать лог в бота через axios

        console.log(message);
    }

    log(...args: string[]): void {
        this.write(args.join(' '), 'log');
    }

    req(...args: string[]): void {
        this.write(args.join(' '), 'req');
    }

    sub(name: string, project: string, result: string): void {
        this.write(
            `The ${name.toUpperCase()} subscription message was sent to "${project}" project with status ${result}.`,
            'sub'
        );
    }

    error(...args: string[]): void {
        this.write(args.join(' '), 'error');
    }

    warn(...args: string[]): void {
        this.write(args.join(' '), 'warn');
    }
}

export { Logger };