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

  async getFeedProducts(categoryType?: string, isActiveFilter?: boolean) {
    const products = await this.repo.getProductsByCategory(categoryType, isActiveFilter);
    return products.map((p) => ({
      id: p.id,
      product_id: p.id,
      product_service_id: p.code,
      name: p.name,
      product_name: p.name,
      code: p.code,
      product_category: p.category.name,
      category_id: p.categoryId,
      category_name: p.category.name,
      category_type: p.category.type,
      uom: p.uom,
      price: p.price,
      description: p.description,
      isActive: p.isActive,
      is_active: p.isActive,
    }));
  }

  async getCategories() {
    return this.repo.getAllCategories();
  }

  async createCategory(data: { code: string; name: string; type: string }) {
    return this.repo.createCategory(data);
  }

  async getProduct(id: number) {
    const p = await this.repo.findProductById(id);
    if (!p) throw new Error('Sản phẩm không tồn tại');
    return {
      id: p.id,
      product_id: p.id,
      product_service_id: p.code,
      name: p.name,
      product_name: p.name,
      code: p.code,
      product_category: p.category.name,
      category_id: p.categoryId,
      category_name: p.category.name,
      category_type: p.category.type,
      uom: p.uom,
      price: p.price,
      description: p.description,
      isActive: p.isActive,
    };
  }

  async createProduct(data: {
    categoryId: number;
    code: string;
    name: string;
    uom?: string;
    price?: number;
    description?: string;
    isActive?: boolean;
  }) {
    const existing = await this.repo.findProductByCode(data.code);
    if (existing) {
      throw new Error(`Mã sản phẩm/giống '${data.code}' đã tồn tại.`);
    }
    return this.repo.createProduct(data);
  }

  async updateProduct(
    id: number,
    data: {
      categoryId?: number;
      code?: string;
      name?: string;
      uom?: string;
      price?: number;
      description?: string;
      isActive?: boolean;
    }
  ) {
    if (data.code) {
      const existing = await this.repo.findProductByCode(data.code);
      if (existing && existing.id !== id) {
        throw new Error(`Mã sản phẩm/giống '${data.code}' đã thuộc về một sản phẩm khác.`);
      }
    }
    return this.repo.updateProduct(id, data);
  }

  async deleteProduct(id: number) {
    return this.repo.deleteProduct(id);
  }

  async getFeedingStatuses() {
    return this.repo.getFeedingStatuses();
  }

  async getShapeStatuses() {
    return this.repo.getShapeStatuses();
  }
}

export const feedingService = new FeedingService();

