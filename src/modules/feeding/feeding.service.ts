import { feedingRepository, FeedingRepository } from './feeding.repository';
import { CreateFeedingDto } from './feeding.dto';
import prisma from '../../database/prisma.service';

export class FeedingService {
  constructor(private readonly repo: FeedingRepository = feedingRepository) {}

  resolveCrabType(
    pond?: {
      name?: string;
      blocks?: Array<{
        boxes?: Array<{
          product?: { name?: string } | null;
          batch?: { product?: { name?: string } | null } | null;
        }>;
      }>;
    } | null,
    quantity?: number
  ): string {
    const occupiedBoxes = (pond?.blocks || []).flatMap((b) => b.boxes || []);
    const productNames = Array.from(
      new Set(
        occupiedBoxes
          .map((bx) => bx.product?.name || bx.batch?.product?.name)
          .filter((name): name is string => Boolean(name && name.trim()))
      )
    );

    if (productNames.length > 0) {
      return productNames.join(', ');
    }

    // Fallback 1: Trích xuất loại cua từ tên ao nếu có format "Nhà Màng XX - <Tên Cua>"
    if (pond?.name && pond.name.includes(' - ')) {
      const parts = pond.name.split(' - ');
      const candidate = parts.slice(1).join(' - ').trim();
      if (candidate) return candidate;
    }

    if (quantity === 0) {
      return 'Chưa thả cua';
    }

    return 'Chưa xác định';
  }

  async getFeedingHistory(farmId: number, actionType?: 'feeding' | 'probiotic') {
    const records = await this.repo.findHistory(farmId, actionType);

    // Lấy danh sách thành viên trang trại để làm người ghi nhận (ưu tiên worker / technician)
    const farmMembers = await prisma.farmMember.findMany({
      where: { farmId },
      include: { user: { select: { id: true, fullName: true, username: true } } },
      orderBy: { id: 'asc' },
    });

    const workers = farmMembers.filter((m) => m.role === 'WORKER' || m.role === 'TECHNICIAN');
    const defaultUserList = workers.length > 0 ? workers : farmMembers;

    // Chuyển đổi thành đúng 100% format cho cả Mobile Flutter và Admin Web
    return records.map((r, idx) => {
      const assignedUser = r.user || (defaultUserList.length > 0 ? defaultUserList[idx % defaultUserList.length].user : null);
      const operatorName = assignedUser?.fullName || 'Kỹ thuật viên';
      const crabType = r.crabType || this.resolveCrabType(r.pond, r.crabQuantityAtTime);

      return {
        id: r.id,
        farm_id: farmId,
        farmId: farmId,
        pond_id: r.pondId,
        pondId: r.pondId,
        pond_name: r.pond.name,
        pondName: r.pond.name,
        action_type: r.actionType.toLowerCase(),
        actionType: r.actionType,
        crab_type: crabType,
        crabType: crabType,
        quantity: r.crabQuantityAtTime,
        date_time: r.recordedAt.toISOString(),
        recorded_at: r.recordedAt.toISOString(),
        recordedAt: r.recordedAt.toISOString(),
        createdAt: r.recordedAt.toISOString(),
        operatorName: operatorName,
        operator_name: operatorName,
        recordedBy: operatorName,
        recorded_by: operatorName,
        operator: {
          id: assignedUser?.id,
          fullName: operatorName,
          name: operatorName,
          username: assignedUser?.username,
        },
        note: r.note,
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
        items: r.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          product: {
            id: item.product.id,
            name: item.product.name,
            uom: item.product.uom,
            price: item.product.price,
          },
        })),
      };
    });
  }

  async createFeedingRecord(dto: CreateFeedingDto) {
    const crabCount = await this.repo.countCrabsInPond(dto.pondId);
    const pondWithCrabs = await this.repo.findPondWithCrabs(dto.pondId);
    const crabType = this.resolveCrabType(pondWithCrabs, crabCount);

    const record = await this.repo.createRecord({
      pondId: dto.pondId,
      userId: dto.userId,
      actionType: dto.actionType,
      crabQuantityAtTime: crabCount,
      crabType: crabType,
      note: dto.note,
      items: dto.items.map((it) => ({
        productId: it.productId,
        quantity: it.qty,
      })),
    });

    return {
      status: 'success',
      success: true,
      record_id: record.id,
      history_id: record.id,
      id: record.id,
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

