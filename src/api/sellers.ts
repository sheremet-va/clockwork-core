import Sellers from '../modules/sellers';
import { SellersController } from '../controllers/sellers';

export default class ApiSellers extends Sellers {
    private sellers: SellersController;

    constructor(core: Core) {
        super(core);

        this.sellers = this.core.sellers;
    }

    create = async (request: CoreRequest): Promise<ReplyOptions> => {
        const { order } = request.body;

        await this.core.sellers.create(order);

        return { data: { orderID: order.orderID } };
    }
}
