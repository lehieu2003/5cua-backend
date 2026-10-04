import { AppError } from '../../common/errors/app.error';
import prisma from '../../database/prisma.service';
import { BoxStatus, MoveStatus } from '@prisma/client';

export class MoveRepository {
  async moveBox(data: { sourceBoxId: number; destBoxId: number; reason?: string }) {
    return prisma.$transaction(async (tx) => {
      // 1. Kiểm tra hộp nguồn phải OCCUPIED
      const srcBox = await tx.box.findUnique({ where: { id: data.sourceBoxId } });
      if (!srcBox || srcBox.status !== BoxStatus.OCCUPIED) {
        throw AppError.badRequest('Hộp nguồn không có cua đang nuôi để chuyển');
      }

      // 2. Kiểm tra hộp đích phải EMPTY
      const destBox = await tx.box.findUnique({ where: { id: data.destBoxId } });
      if (!destBox || destBox.status !== BoxStatus.EMPTY) {
        throw AppError.badRequest('Hộp đích đã có cua hoặc không ở trạng thái trống');
      }

      // 3. Cập nhật hộp đích nhận thông tin cua
      await tx.box.update({
        where: { id: data.destBoxId },
        data: {
          status: BoxStatus.OCCUPIED,
          batchId: srcBox.batchId,
          productId: srcBox.productId,
          feedStatusId: srcBox.feedStatusId,
          shapeStatusId: srcBox.shapeStatusId,
          occupiedAt: new Date(),
        },
      });

      // 4. Giải phóng hộp nguồn về EMPTY
      await tx.box.update({
        where: { id: data.sourceBoxId },
        data: {
          status: BoxStatus.EMPTY,
          batchId: null,
          productId: null,
          feedStatusId: null,
          shapeStatusId: null,
          occupiedAt: null,
        },
      });

      // 5. Ghi nhật ký chuyển hộp
      const moveLog = await tx.stockPickingMove.create({
        data: {
          sourceBoxId: data.sourceBoxId,
          destBoxId: data.destBoxId,
          status: MoveStatus.DONE,
          reason: data.reason,
        },
      });

      return moveLog;
    });
  }

  async getMoveHistory(farmId?: number, offset = 0) {
    return prisma.stockPickingMove.findMany({
      where: farmId
        ? {
            sourceBox: {
              block: {
                pond: {
                  farmId,
                },
              },
            },
          }
        : undefined,
      include: {
        sourceBox: { include: { block: { include: { pond: true } } } },
        destBox: { include: { block: { include: { pond: true } } } },
      },
      orderBy: { movedAt: 'desc' },
      skip: offset,
      take: 50,
    });
  }

  async getSummary(farmId?: number) {
    const where = farmId
      ? {
          sourceBox: {
            block: {
              pond: {
                farmId,
              },
            },
          },
        }
      : undefined;

    const totalMoves = await prisma.stockPickingMove.count({ where });

    // Trọng lượng chuyển thật: mỗi move = 1 con, tính theo trọng lượng bình quân
    // của lô đang nuôi ở HỘP ĐÍCH (initialWeight / initialQuantity).
    const moves = await prisma.stockPickingMove.findMany({
      where,
      select: {
        destBox: {
          select: { batch: { select: { initialWeight: true, initialQuantity: true } } },
        },
      },
    });
    let totalWeight = 0;
    for (const m of moves) {
      const b = m.destBox?.batch;
      if (b && b.initialQuantity > 0) {
        totalWeight += b.initialWeight / b.initialQuantity;
      }
    }

    return {
      total_quantity: totalMoves,
      total_weight: Number(totalWeight.toFixed(2)),
    };
  }

  async findById(id: number) {
    return prisma.stockPickingMove.findUnique({
      where: { id },
      include: {
        sourceBox: { include: { block: { include: { pond: true } } } },
        destBox: { include: { block: { include: { pond: true } } } },
      },
    });
  }

  async updateStatus(id: number, status: MoveStatus) {
    const allowed: string[] = Object.values(MoveStatus);
    const s = (status || '').toString().toUpperCase().trim();
    // Mobile gửi 'cancel' (thiếu 'led') — chuẩn hóa trước khi kiểm tra enum
    const normalized =
      s === 'CANCEL' || s === 'CANCELED' ? MoveStatus.CANCELLED : (s as MoveStatus);
    if (!allowed.includes(normalized)) {
      throw AppError.badRequest(
        `Trạng thái chuyển hộp không hợp lệ: "${status}". Cho phép: ${allowed.join(', ')}`
      );
    }
    return prisma.stockPickingMove.update({
      where: { id },
      data: { status: normalized as MoveStatus },
    });
  }
}

export const moveRepository = new MoveRepository();
