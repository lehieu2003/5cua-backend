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

  async getProductsByCategory(categoryType: string) {
    return prisma.productTemplate.findMany({
      where: {
        category: { type: categoryType },
        isActive: true,
      },
      include: {
        category: true,
      },
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
