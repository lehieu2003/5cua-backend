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
    warnings?: Array<{ title: string; message: string; severity: string }>;
  }) {
    const pond = await prisma.pond.findUnique({
      where: { id: data.pondId },
      select: { id: true, farmId: true, name: true },
    });

    const record = await prisma.waterCheckHistory.create({
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

    if (pond && data.warnings && data.warnings.length > 0) {
      for (const w of data.warnings) {
        await prisma.waterWarning.create({
          data: {
            farmId: pond.farmId,
            pondId: pond.id,
            title: w.title,
            message: w.message,
            severity: w.severity,
          },
        });
      }
    }

    return record;
  }

  async getWarningCount(farmId: number) {
    return prisma.waterWarning.count({
      where: { farmId, isResolved: false },
    });
  }
}

export const waterRepository = new WaterRepository();
