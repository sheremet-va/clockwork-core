import crypto from 'crypto';
import Seht from '../modules/seht';

type DiscordAccessTokenResponse = {
    'access_token': string;
    'token_type': string;
    'expires_in': number;
    'refresh_token': string;
    'scope': string;
}

export default class Oauth2 extends Seht {
    name = 'oauth';

    private authorizeUrl = 'https://discordapp.com/api/oauth2/token';

    private scope = 'identify';

    constructor(public core: Core) {
        super(core);
    }

    discordAuthorize = async (request: CoreRequest) => {
        const data = {
            client_id: this.core.seht.clientId,
            client_secret: this.core.seht.secret,
            grant_type: 'authorization_code',
            redirect_uri: this.core.seht.redirect,
            code: `${request.query.code}`,
            scope: this.scope,
        };

        const body = Object.entries(data).map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');

        try {
            const { data: result } = await this.core.request<DiscordAccessTokenResponse>({
                url: this.authorizeUrl,
                method: 'POST',
                data: body,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const userInfo = await this.requestUser(`${result.token_type} ${result.access_token}`);

            const user = await this.getUser(userInfo.id);

            const identifier = crypto.randomBytes(16).toString('hex');
            // сбрасывать если такой user-agent уже есть
            const identifierData = {
                token: identifier,
                type: 'Discord',
                agent: request.headers['user-agent'],
                date: new Date()
            };

            if(!user) {
                await this.addUser({
                    ...result,
                    id: userInfo.id,
                    identifiers: [identifierData]
                });
            } else {
                await this.updateUser(userInfo.id, {
                    identifiers: [...user.identifiers, identifierData]
                });
            }

            return {
                data: {
                    ...userInfo,
                    identifier
                }
            };
        } catch (e) {
            return { data: {} };
        }
    }

    discordRefreshToken = async (request: CoreRequest) => {
        const refreshToken = request.headers.authorization;

        const result = await this.core.request({
            url: this.authorizeUrl,
            method: 'POST',
            data: {
                client_id: this.core.seht.clientId,
                client_secret: this.core.seht.secret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                redirect_uri: this.core.seht.redirect, // TODO
                scope: this.scope
            }
        });

        return { data: result };
    }
}