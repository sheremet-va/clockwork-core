import { StoreController } from '../controllers/store';
import Store from '../modules/store';

export default class ApiStore extends Store {
    private store: StoreController;

    constructor(core: Core) {
        super(core);

        this.store = this.core.store;
    }

    find = async (request: CoreRequest): Promise<ReplyOptions> => {
        const filter = request.query.name
            ? `"${request.query.name}"`
            : (request.query.names as string).split(',').map(name => `"${name}"`).join(' ');

        const data = await this.store.find(filter);

        const filtered = data.filter(({ active, price, currency, category, en }, index, self) => {
            return active
                && price > 0
                && currency === 'crowns'
                && category !== 'ESO Plus Deals'
                && index === self.findIndex(t => t.en === en);
        });

        return { data: filtered };
    };

    update = async (): Promise<ReplyOptions> => {
        const res = await this.start();

        return { data: res };
    };

    getByCategory = async (request: CoreRequest): Promise<ReplyOptions> => {
        const category = request.params.category;
        const items = await this.store.getByCategory(category);

        return { data: items };
    }

    getCategories = async (): Promise<ReplyOptions> => {
        const categories = await this.store.getCategories();

        return { data: categories };
    }
}
