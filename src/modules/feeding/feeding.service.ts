import { feedingRepository, FeedingRepository } from './feeding.repository';
import { CreateFeedingDto } from './feeding.dto';

export class FeedingService {
  constructor(private readonly repo: FeedingRepository = feedingRepository) {}

  async getFeedingHistory(farmId: number, actionType?: 'feeding' | 'probiotic') {
    const records = await this.repo.findHistory(farmId, actionType);

    // Chuyển đổi thành đúng 100% format FeedingRecord của Mobile Flutter
    return records.map((r) => ({
      id: r.id,
      action_type: r.actionType.toLowerCase(),
      pond_name: r.pond.name,
      crab_type: 'Cua Thịt / Cua Giống',
      quantity: r.crabQuantityAtTime,
      date_time: r.recordedAt.toISOString(),
      scraps: r.items.map((item) => ({
        scrap_id: item.id,
        product_id: item.productId,
        product_name: item.product.name,
        qty: item.quantity,
        uom: item.product.uom,
        nc_lot_id: '',
        price: item.product.price,
        product_price: item.product.price * item.quantity,
      })),
    }));
  }

  async createFeedingRecord(dto: CreateFeedingDto) {
    const crabCount = await this.repo.countCrabsInPond(dto.pondId);

    const record = await this.repo.createRecord({
      pondId: dto.pondId,
      actionType: dto.actionType,
      crabQuantityAtTime: crabCount,
      note: dto.note,
      items: dto.items.map((it) => ({
        productId: it.productId,
        quantity: it.qty,
      })),
    });

    return {
      status: 'success',
      record_id: record.id,
    };
  }

  async getFeedProducts(categoryType: string) {
    const products = await this.repo.getProductsByCategory(categoryType);
    return products.map((p) => ({
      id: p.id,
      product_id: p.id,
      name: p.name,
      product_name: p.name,
      product_category: p.category.name,
      uom: p.uom,
      price: p.price,
    }));
  }
}

export const feedingService = new FeedingService();
