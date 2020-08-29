import { StoreController } from '../controllers/store';
import Store from '../modules/store';

export default class ApiStore extends Store {
    private store: StoreController;

    constructor(core: Core) {
        super(core);

        this.store = this.core.store;
    }

    find = async (request: CoreRequest): Promise<ReplyOptions> => {
        try {
            const filter = request.query.name
                ? `"${request.query.name}"`
                : (request.query.names as string).split(',').map(name => `"${name}"`).join(' ');

            const data = await this.store.find(filter);

            const filtered = data.filter(({ active, price, currency }) => active && price > 0 && currency === 'crowns');

            return { data: filtered };
        } catch (err) {
            console.log(err);

            throw new Error('fuck');
        }
    };

    update = async (): Promise<ReplyOptions> => {
        const res = await this.start();

        return { data: res };
    };
}
