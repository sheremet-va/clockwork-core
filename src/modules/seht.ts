import mongodb from 'mongodb';
import {CoreError} from '../services/core';

type DiscordAccessTokenResponse = {
    'access_token': string;
    'token_type': string;
    'expires_in': number;
    'refresh_token': string;
    'scope': string;
}

type DiscordUser = {
    'id': string;
    'username': string;
    'avatar': string;
    'discriminator': string;
    'public_flags': number;
    'flags': number;
    'locale': string;
    'mfa_enabled': boolean;
    'premium_type': number;
}

type IdentifierData = {
    token: string;
    agent?: string;
    type: string;
    date: Date;
}

type DiscordDbUser = DiscordAccessTokenResponse & { identifiers: IdentifierData[]; id: string; };

export default class Seht {
    name = 'seht';

    private db: mongodb.Db | null = null;

    constructor(public core: Core) {}

    private async connect(name: string) {
        if(this.db) {
            return this.db.collection(name);
        }

        const client = await mongodb.connect(this.core.config.db.url, { useUnifiedTopology: true });
        const db = client.db('seht');

        return db.collection(name);
    }

    async addUser(user: DiscordDbUser) {
        const collection = await this.connect('users');

        return collection.insertOne(user);
    }

    async updateUser(id: string, user: Partial<DiscordDbUser>) {
        const collection = await this.connect('users');

        return collection.updateOne({ id }, { $set: user });
    }

    async getUser(id: string) {
        const collection = await this.connect('users');

        return collection.findOne<DiscordDbUser>(
            { id },
            { projection: { _id: 0 } }
        );
    }

    async getUserByIdentifier(id: string) {
        const collection = await this.connect('users');

        return collection.findOne<DiscordDbUser>(
            { 'identifiers.token': id },
            { projection: { _id: 0 } }
        );
    }

    async getUserInfo(id: string) {
        const user = await this.getUser(id);

        if(!user) {
            throw new CoreError('UNKNOWN_USER');
        }

        return this.requestUser(`${user.token_type} ${user.access_token}`);
    }

    async requestUser(authorization: string) {
        const { data: user } = await this.core.request<DiscordUser>({
            url: 'https://discordapp.com/api/users/@me',
            headers: {
                authorization
            },
        });

        return user;
    }

    static async replyError(reply: CoreReply): Promise<void> {
        await reply.code(401).send({ error: 'AUTHORIZATION_FAILED' });
    }
}