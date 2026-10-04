import prisma from '../../database/prisma.service';

/**
 * Ghi OperationLog cho các thao tác nghiệp vụ runtime.
 * - Tự suy ra farmId từ pondId / batchId / boxId / exportId nếu không truyền trực tiếp.
 * - KHÔNG BAO GIỜ làm fail nghiệp vụ: mọi lỗi ghi log chỉ được log console.
 */
export const operationLogService = {
  async log(data: {
    userId?: number | null;
    farmId?: number | null;
    pondId?: number | null;
    batchId?: number | null;
    boxId?: number | null;
    exportId?: number | null;
    action: string;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      let farmId = data.farmId ?? null;

      if (!farmId && data.pondId) {
        const pond = await prisma.pond.findUnique({
          where: { id: data.pondId },
          select: { farmId: true },
        });
        farmId = pond?.farmId ?? null;
      }
      if (!farmId && data.batchId) {
        const batch = await prisma.stockImportBatch.findUnique({
          where: { id: data.batchId },
          select: { farmId: true },
        });
        farmId = batch?.farmId ?? null;
      }
      if (!farmId && data.boxId) {
        const box = await prisma.box.findUnique({
          where: { id: data.boxId },
          select: { block: { select: { pond: { select: { farmId: true } } } } },
        });
        farmId = box?.block.pond.farmId ?? null;
      }
      if (!farmId && data.exportId) {
        const exp = await prisma.exportHistory.findUnique({
          where: { id: data.exportId },
          select: { farmId: true },
        });
        farmId = exp?.farmId ?? null;
      }

      if (!farmId) {
        console.warn(`[OperationLog] không suy ra được farmId cho action=${data.action} — bỏ qua`);
        return;
      }

      await prisma.operationLog.create({
        data: {
          userId: data.userId ?? null,
          farmId,
          action: data.action,
          ...(data.details !== undefined && { details: data.details as any }),
        },
      });
    } catch (err) {
      console.error('[OperationLog] ghi log thất bại:', err);
    }
  },
};
