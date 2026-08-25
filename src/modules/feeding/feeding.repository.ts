import prisma from '../../database/prisma.service';
import { ActionType } from '@prisma/client';

export class FeedingRepository {
  async findHistory(farmId: number, actionType?: 'feeding' | 'probiotic') {
    const dbActionType = actionType
      ? actionType.toUpperCase() === 'PROBIOTIC'
        ? ActionType.PROBIOTIC
        : ActionType.FEEDING
      : undefined;

    return prisma.feedingRecord.findMany({
      where: {
        pond: { farmId },
        ...(dbActionType && { actionType: dbActionType }),
      },
      include: {
        pond: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }

  async createRecord(data: {
    pondId: number;
    actionType: 'feeding' | 'probiotic';
    crabQuantityAtTime: number;
    note?: string;
    items: Array<{ productId: number; quantity: number }>;
  }) {
    return prisma.feedingRecord.create({
      data: {
        pondId: data.pondId,
        actionType: data.actionType.toUpperCase() === 'PROBIOTIC' ? ActionType.PROBIOTIC : ActionType.FEEDING,
        crabQuantityAtTime: data.crabQuantityAtTime,
        note: data.note,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async countCrabsInPond(pondId: number) {
    return prisma.box.count({
      where: {
        block: { pondId },
        status: 'OCCUPIED',
      },
    });
  }

  async getProductsByCategory(categoryType?: string, isActiveFilter?: boolean) {
    const activeCondition = isActiveFilter !== undefined ? { isActive: isActiveFilter } : {};

    if (!categoryType || categoryType === 'all') {
      return prisma.productTemplate.findMany({
        where: {
          ...activeCondition,
        },
        include: { category: true },
        orderBy: { id: 'asc' },
      });
    }

    const lower = categoryType.toLowerCase();
    let typeFilters: string[] = [categoryType];
    let codeFilters: string[] = [categoryType];

    if (lower === 'crab' || lower === 'type' || lower === 'crab_type') {
      typeFilters = ['crab', 'type', 'CRAB_TYPE'];
      codeFilters = ['CRAB_TYPE', 'CRAB'];
    } else if (lower === 'feed' || lower === 'crab_feed') {
      typeFilters = ['feed', 'CRAB_FEED'];
      codeFilters = ['CRAB_FEED', 'FEED'];
    } else if (lower === 'probiotic') {
      typeFilters = ['probiotic', 'PROBIOTIC'];
      codeFilters = ['PROBIOTIC', 'BIO'];
    }

    return prisma.productTemplate.findMany({
      where: {
        OR: [
          { category: { type: { in: typeFilters, mode: 'insensitive' } } },
          { category: { code: { in: codeFilters, mode: 'insensitive' } } },
        ],
        ...activeCondition,
      },
      include: {
        category: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async getAllCategories() {
    return prisma.productCategory.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async createCategory(data: { code: string; name: string; type: string }) {
    return prisma.productCategory.create({
      data,
    });
  }

  async findProductById(id: number) {
    return prisma.productTemplate.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async findProductByCode(code: string) {
    return prisma.productTemplate.findUnique({
      where: { code },
      include: { category: true },
    });
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
    return prisma.productTemplate.create({
      data: {
        categoryId: data.categoryId,
        code: data.code,
        name: data.name,
        uom: data.uom || 'kg',
        price: data.price || 0,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        category: true,
      },
    });
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
    return prisma.productTemplate.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async deleteProduct(id: number) {
    // Check if referenced in boxes, batches, feeding
    const referencedBatch = await prisma.stockImportBatch.findFirst({ where: { productId: id } });
    const referencedBox = await prisma.box.findFirst({ where: { productId: id } });
    const referencedFeeding = await prisma.feedingItem.findFirst({ where: { productId: id } });

    if (referencedBatch || referencedBox || referencedFeeding) {
      // Soft delete / deactivate
      return prisma.productTemplate.update({
        where: { id },
        data: { isActive: false },
        include: { category: true },
      });
    }

    return prisma.productTemplate.delete({
      where: { id },
    });
  }

  async getFeedingStatuses() {
    const statuses = await prisma.feedingStatusMaster.findMany();
    if (statuses.length > 0) return statuses;
    return [
      { id: 1, name: 'Ăn hết', feedNum: 1.0 },
      { id: 2, name: 'Ăn một phần', feedNum: 0.5 },
      { id: 3, name: 'Không ăn', feedNum: 0.0 },
    ];
  }

  async getShapeStatuses() {
    const shapes = await prisma.shapeStatusMaster.findMany();
    if (shapes.length > 0) return shapes;
    return [
      { id: 1, name: 'Bình thường' },
      { id: 2, name: 'Cua lột' },
      { id: 3, name: 'Yếu' },
      { id: 4, name: 'Bệnh' },
    ];
  }
}

export const feedingRepository = new FeedingRepository();

