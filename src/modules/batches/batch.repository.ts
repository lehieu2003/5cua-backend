import prisma from '../../database/prisma.service';
import { BatchStatus, BoxStatus } from '@prisma/client';

export class BatchRepository {
  async findBatches(params: {
    farmId?: number;
    importDateFrom?: string;
    importDateTo?: string;
    status?: string;
    keyword?: string;
    offset?: number;
  }) {
    let dbStatus: BatchStatus | undefined;
    if (params.status && params.status.trim() !== '' && params.status.toLowerCase() !== 'all') {
      const s = params.status.toUpperCase().trim();
      if (s === 'ACTIVE' || s === 'IN_PROGRESS' || s === 'PROCESSING' || s === 'RUNNING') {
        dbStatus = BatchStatus.IN_PROGRESS;
      } else if (s === 'COMPLETED' || s === 'DONE' || s === 'CLOSED' || s === 'FINISHED') {
        dbStatus = BatchStatus.COMPLETED;
      } else if (s === 'DRAFT' || s === 'NEW') {
        dbStatus = BatchStatus.DRAFT;
      } else if (s === 'CANCELLED' || s === 'CANCELED') {
        dbStatus = BatchStatus.CANCELLED;
      }
    }

    return prisma.stockImportBatch.findMany({
      where: {
        ...(params.farmId && { farmId: params.farmId }),
        ...(dbStatus && { status: dbStatus }),
        ...(params.keyword && {
          OR: [
            { code: { contains: params.keyword, mode: 'insensitive' } },
            { originText: { contains: params.keyword, mode: 'insensitive' } },
          ],
        }),
        ...(params.importDateFrom && {
          importDate: { gte: new Date(params.importDateFrom) },
        }),
        ...(params.importDateTo && {
          importDate: { lte: new Date(params.importDateTo) },
        }),
      },
      include: {
        product: true,
        images: true,
      },
      orderBy: { importDate: 'desc' },
      skip: params.offset || 0,
      take: 20,
    });
  }

  async getBatchesSummary(params: {
    farmId?: number;
    importDateFrom?: string;
    importDateTo?: string;
    status?: string;
    keyword?: string;
  }) {
    let dbStatus: BatchStatus | undefined;
    if (params.status && params.status.trim() !== '' && params.status.toLowerCase() !== 'all') {
      const s = params.status.toUpperCase().trim();
      if (s === 'ACTIVE' || s === 'IN_PROGRESS' || s === 'PROCESSING' || s === 'RUNNING') {
        dbStatus = BatchStatus.IN_PROGRESS;
      } else if (s === 'COMPLETED' || s === 'DONE' || s === 'CLOSED' || s === 'FINISHED') {
        dbStatus = BatchStatus.COMPLETED;
      } else if (s === 'DRAFT' || s === 'NEW') {
        dbStatus = BatchStatus.DRAFT;
      } else if (s === 'CANCELLED' || s === 'CANCELED') {
        dbStatus = BatchStatus.CANCELLED;
      }
    }

    const batches = await prisma.stockImportBatch.findMany({
      where: {
        ...(params.farmId && { farmId: params.farmId }),
        ...(dbStatus && { status: dbStatus }),
        ...(params.keyword && {
          OR: [
            { code: { contains: params.keyword, mode: 'insensitive' } },
            { originText: { contains: params.keyword, mode: 'insensitive' } },
          ],
        }),
        ...(params.importDateFrom && {
          importDate: { gte: new Date(params.importDateFrom) },
        }),
        ...(params.importDateTo && {
          importDate: { lte: new Date(params.importDateTo) },
        }),
      },
    });

    let totalQuantity = 0;
    let totalWeight = 0;

    for (const b of batches) {
      totalQuantity += (b.currentQuantity ?? b.initialQuantity ?? 0);
      totalWeight += (b.initialWeight ?? 0);
    }

    return {
      total_quantity: totalQuantity,
      total_weight: totalWeight,
      totalQuantity,
      totalWeight,
    };
  }

  async createBatchWithAllocation(data: {
    farmId: number;
    code: string;
    productId: number;
    partnerId?: number;
    originText?: string;
    importDate: Date;
    expectedHarvestDate?: Date;
    initialQuantity: number;
    initialWeight: number;
    cost: number;
    expectedRevenue: number;
    expectedSuccessRate: number;
    note?: string;
    boxIds: number[];
    images?: Array<{ name: string; image: string }>;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Tạo đợt nhập
      const batch = await tx.stockImportBatch.create({
        data: {
          farmId: data.farmId,
          code: data.code,
          productId: data.productId,
          partnerId: data.partnerId,
          originText: data.originText,
          importDate: data.importDate,
          expectedHarvestDate: data.expectedHarvestDate,
          initialQuantity: data.initialQuantity,
          initialWeight: data.initialWeight,
          currentQuantity: data.initialQuantity,
          cost: data.cost,
          expectedRevenue: data.expectedRevenue,
          expectedSuccessRate: data.expectedSuccessRate,
          note: data.note,
          status: BatchStatus.IN_PROGRESS,
        },
      });

      // 2. Cập nhật trạng thái các hộp được chọn thành OCCUPIED
      if (data.boxIds.length > 0) {
        await tx.box.updateMany({
          where: { id: { in: data.boxIds } },
          data: {
            status: BoxStatus.OCCUPIED,
            batchId: batch.id,
            productId: data.productId,
            occupiedAt: new Date(),
          },
        });
      }

      // 3. Lưu ảnh đính kèm (nếu có)
      if (data.images && data.images.length > 0) {
        await tx.batchImage.createMany({
          data: data.images.map((img) => ({
            batchId: batch.id,
            imageUrl: img.image,
          })),
        });
      }

      return batch;
    });
  }

  async findById(id: number) {
    return prisma.stockImportBatch.findUnique({
      where: { id },
      include: {
        product: true,
        images: true,
        boxes: {
          include: {
            block: {
              include: {
                pond: true,
              },
            },
          },
        },
      },
    });
  }

  async updateStatus(id: number, status: string | BatchStatus) {
    let dbStatus: BatchStatus = BatchStatus.IN_PROGRESS;
    const s = (status || '').toString().toUpperCase().trim();
    if (s === 'ACTIVE' || s === 'IN_PROGRESS' || s === 'PROCESSING') {
      dbStatus = BatchStatus.IN_PROGRESS;
    } else if (s === 'COMPLETED' || s === 'DONE' || s === 'CLOSED') {
      dbStatus = BatchStatus.COMPLETED;
    } else if (s === 'DRAFT') {
      dbStatus = BatchStatus.DRAFT;
    } else if (s === 'CANCELLED' || s === 'CANCELED') {
      dbStatus = BatchStatus.CANCELLED;
    }

    return prisma.stockImportBatch.update({
      where: { id },
      data: { status: dbStatus },
    });
  }
}

export const batchRepository = new BatchRepository();
