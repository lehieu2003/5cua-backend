import prisma from '../../database/prisma.service';
import { BoxStatus, ExportStatus } from '@prisma/client';

export class ExportRepository {
  async findExports(farmId?: number, offset = 0) {
    return prisma.exportHistory.findMany({
      where: {
        ...(farmId && { farmId }),
      },
      include: {
        boxes: true,
      },
      orderBy: { exportDate: 'desc' },
      skip: offset,
      take: 20,
    });
  }

  async createExportWithRelease(data: {
    farmId: number;
    code: string;
    partnerName?: string;
    note?: string;
    boxes: Array<{ boxId: number; productId: number; weight: number; price: number }>;
  }) {
    let totalQty = data.boxes.length;
    let totalWeight = 0;
    let totalAmount = 0;

    for (const b of data.boxes) {
      totalWeight += b.weight;
      totalAmount += b.weight * b.price;
    }

    return prisma.$transaction(async (tx) => {
      // 1. Tạo phiếu xuất bán
      const exp = await tx.exportHistory.create({
        data: {
          farmId: data.farmId,
          code: data.code,
          partnerName: data.partnerName,
          totalQty,
          totalWeight,
          totalAmount,
          status: ExportStatus.DRAFT,
          note: data.note,
          boxes: {
            create: data.boxes.map((b) => ({
              boxId: b.boxId,
              productId: b.productId,
              weight: b.weight,
              price: b.price,
            })),
          },
        },
      });

      // 2. Giải phóng các hộp đã xuất về trạng thái EMPTY
      const boxIds = data.boxes.map((b) => b.boxId);
      await tx.box.updateMany({
        where: { id: { in: boxIds } },
        data: {
          status: BoxStatus.EMPTY,
          batchId: null,
          productId: null,
          feedStatusId: null,
          shapeStatusId: null,
          occupiedAt: null,
        },
      });

      return exp;
    });
  }

  async findById(id: number) {
    return prisma.exportHistory.findUnique({
      where: { id },
      include: {
        boxes: true,
      },
    });
  }

  async updateStatus(id: number, status: string | ExportStatus) {
    let dbStatus: ExportStatus = ExportStatus.DRAFT;
    const s = (status || '').toString().toUpperCase().trim();
    if (s === 'DRAFT' || s === 'MỚI' || s === 'NEW') dbStatus = ExportStatus.DRAFT;
    else if (s === 'CONFIRMED' || s === 'ĐÃ XÁC NHẬN') dbStatus = ExportStatus.CONFIRMED;
    else if (s === 'DONE' || s === 'COMPLETED' || s === 'ACTIVE' || s === 'HOÀN THÀNH') dbStatus = ExportStatus.DONE;
    else if (s === 'CANCEL' || s === 'CANCELLED' || s === 'CANCELED' || s === 'ĐÃ HỦY') dbStatus = ExportStatus.CANCELLED;

    return prisma.exportHistory.update({
      where: { id },
      data: { status: dbStatus },
    });
  }

  async getSummary(farmId?: number) {
    const exports = await prisma.exportHistory.findMany({
      where: {
        ...(farmId && { farmId }),
      },
      select: {
        totalQty: true,
        totalWeight: true,
      },
    });

    let total_quantity = 0;
    let total_weight = 0;
    for (const e of exports) {
      total_quantity += e.totalQty;
      total_weight += e.totalWeight;
    }

    return {
      total_quantity,
      total_weight,
    };
  }
}

export const exportRepository = new ExportRepository();
