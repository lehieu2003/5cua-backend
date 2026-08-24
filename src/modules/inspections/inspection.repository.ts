import prisma from '../../database/prisma.service';
import { BoxStatus } from '@prisma/client';

export class InspectionRepository {
  async addCleanAndCheck(data: {
    pondId: number;
    shapeId?: number;
    feedId?: number;
    softShellQuantity: number;
    deadQuantity: number;
    boxes?: Array<{ id: number; isDead?: boolean; isSoftShell?: boolean }>;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Tạo bản ghi kiểm tra vệ sinh
      const record = await tx.inspectionCleaningRecord.create({
        data: {
          pondId: data.pondId,
          shapeStatusId: data.shapeId,
          feedStatusId: data.feedId,
          softShellQuantity: data.softShellQuantity,
          deadQuantity: data.deadQuantity,
        },
      });

      // 2. Cập nhật trạng thái từng Box
      if (data.boxes && data.boxes.length > 0) {
        for (const b of data.boxes) {
          if (b.isDead) {
            // Hộp có cua chết -> Giải phóng về EMPTY
            await tx.box.update({
              where: { id: b.id },
              data: {
                status: BoxStatus.EMPTY,
                productId: null,
                feedStatusId: null,
                shapeStatusId: null,
              },
            });
          } else {
            // Cập nhật trạng thái ăn và ngoại hình
            await tx.box.update({
              where: { id: b.id },
              data: {
                feedStatusId: data.feedId,
                shapeStatusId: data.shapeId,
              },
            });
          }
        }
      }

      return record;
    });
  }

  async convertCrabType(data: {
    pondId: number;
    productIdNew: number;
    boxIds: number[];
  }) {
    return prisma.box.updateMany({
      where: {
        id: { in: data.boxIds },
      },
      data: {
        productId: data.productIdNew,
      },
    });
  }
}

export const inspectionRepository = new InspectionRepository();
