import prisma from '../../database/prisma.service';

export class WaterRepository {
  async getParameters() {
    return prisma.waterParameter.findMany({
      where: { isShow: true },
      orderBy: { ordinal: 'asc' },
    });
  }

  async getCheckHistoryByPond(pondId: number, offset = 0) {
    return prisma.waterCheckHistory.findMany({
      where: { pondId },
      include: {
        items: {
          include: {
            parameter: true,
          },
        },
      },
      orderBy: { checkDate: 'desc' },
      skip: offset,
      take: 20,
    });
  }

  async addWaterCheck(data: {
    pondId: number;
    hasWarning: boolean;
    note?: string;
    items: Array<{ parameterId: number; value: number; isWarning: boolean }>;
  }) {
    return prisma.waterCheckHistory.create({
      data: {
        pondId: data.pondId,
        hasWarning: data.hasWarning,
        note: data.note,
        items: {
          create: data.items.map((item) => ({
            parameterId: item.parameterId,
            value: item.value,
            isWarning: item.isWarning,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async getWarningCount(farmId: number) {
    return prisma.waterWarning.count({
      where: { farmId, isResolved: false },
    });
  }
}

export const waterRepository = new WaterRepository();
