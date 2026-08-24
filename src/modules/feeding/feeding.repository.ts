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
}

export const feedingRepository = new FeedingRepository();
