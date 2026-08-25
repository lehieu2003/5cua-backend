import { batchRepository, BatchRepository } from './batch.repository';
import { CreateBatchDto } from './batch.dto';
import { AppError } from '../../common/errors/app.error';
import { MESSAGES } from '../../common/constants/messages.constant';
import prisma from '../../database/prisma.service';
import { BoxStatus } from '@prisma/client';

export class BatchService {
  constructor(private readonly repo: BatchRepository = batchRepository) {}

  async getImportRecords(params: {
    farmId?: number;
    importDateFrom?: string;
    importDateTo?: string;
    status?: string;
    keyword?: string;
    offset?: number;
  }) {
    const batches = await this.repo.findBatches(params);

    return batches.map((b) => ({
      id: b.id.toString(),
      code: b.code,
      name: b.code,
      import_date: b.importDate ? b.importDate.toISOString() : null,
      expected_harvest_date: b.expectedHarvestDate
        ? b.expectedHarvestDate.toISOString()
        : null,
      origin_text: b.originText || '',
      product_name: b.product.name,
      product_id: b.productId,
      initial_quantity: b.initialQuantity,
      initial_weight: b.initialWeight,
      current_quantity: b.currentQuantity,
      dead_quantity: b.deadQuantity,
      dead_weight: b.deadWeight,
      cost: b.cost,
      expected_revenue: b.expectedRevenue,
      expected_success_rate: b.expectedSuccessRate,
      status: b.status.toLowerCase(),
      note: b.note || '',
      images: b.images.map((img) => ({
        id: img.id,
        name: `image_${img.id}`,
        imageUrl: img.imageUrl,
      })),
      warehouses: this.formatWarehousesFromBoxes((b as any).boxes),
    }));
  }

  private formatWarehousesFromBoxes(boxes?: any[]): any[] {
    if (!boxes || boxes.length === 0) return [];

    const pondMap = new Map<number, {
      id: number;
      name: string;
      type: string;
      product_uom_qty: number;
      blockMap: Map<number, {
        id: number;
        name: string;
        code?: string;
        quantity: number;
        locations: Array<{ id: number; name: string; code?: string; quantity: number }>;
      }>;
    }>();

    for (const box of boxes) {
      if (!box.block || !box.block.pond) continue;

      const pond = box.block.pond;
      const block = box.block;

      if (!pondMap.has(pond.id)) {
        pondMap.set(pond.id, {
          id: pond.id,
          name: pond.name,
          type: pond.type || 'COMPOUND',
          product_uom_qty: 0,
          blockMap: new Map(),
        });
      }

      const pondData = pondMap.get(pond.id)!;
      pondData.product_uom_qty += 1;

      if (!pondData.blockMap.has(block.id)) {
        pondData.blockMap.set(block.id, {
          id: block.id,
          name: block.name || `Dãy ${block.code || block.id}`,
          code: block.code,
          quantity: 0,
          locations: [],
        });
      }

      const blockData = pondData.blockMap.get(block.id)!;
      blockData.quantity += 1;
      blockData.locations.push({
        id: box.id,
        name: box.code || `Hộp ${box.id}`,
        code: box.code,
        quantity: 1,
      });
    }

    return Array.from(pondMap.values()).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      product_uom_qty: p.product_uom_qty,
      blocks: Array.from(p.blockMap.values()).map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        quantity: b.quantity,
        locations: b.locations,
      })),
    }));
  }

  async getBatchesSummary(params: {
    farmId?: number;
    importDateFrom?: string;
    importDateTo?: string;
    status?: string;
    keyword?: string;
  }) {
    return this.repo.getBatchesSummary(params);
  }

  async createBatch(dto: CreateBatchDto) {
    const batchCode = (dto.name || '').trim();
    if (!batchCode) {
      throw AppError.badRequest('Mã đợt nhập không được để trống');
    }

    // 1. Kiểm tra mã đợt nhập trùng lặp
    const existingBatch = await this.repo.findByCode(batchCode);
    if (existingBatch) {
      throw AppError.conflict(MESSAGES.BATCH.CODE_EXISTS);
    }

    // 2. Kiểm tra số lượng và khối lượng hợp lệ
    if (dto.initialQuantity <= 0) {
      throw AppError.badRequest(MESSAGES.BATCH.QUANTITY_REQUIRED);
    }
    if (dto.initialWeight <= 0) {
      throw AppError.badRequest(MESSAGES.BATCH.WEIGHT_REQUIRED);
    }

    // 3. Kiểm tra thông tin sản phẩm (loại cua)
    const product = await prisma.productTemplate.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw AppError.notFound(MESSAGES.BATCH.PRODUCT_NOT_FOUND);
    }

    // 4. Trích xuất tất cả boxIds từ cấu trúc lồng nhau: warehouses -> blocks -> locations
    const boxIds: number[] = [];
    if (dto.warehouses && dto.warehouses.length > 0) {
      for (const w of dto.warehouses) {
        if (w.blocks && w.blocks.length > 0) {
          for (const blk of w.blocks) {
            if (blk.locations && blk.locations.length > 0) {
              for (const loc of blk.locations) {
                const parsedId = parseInt(loc.id, 10);
                if (!isNaN(parsedId)) {
                  boxIds.push(parsedId);
                }
              }
            }
          }
        }
      }
    }

    // 5. Kiểm tra nếu có hộp nào đang bị OCCUPIED
    if (boxIds.length > 0) {
      const occupiedBoxes = await prisma.box.findMany({
        where: {
          id: { in: boxIds },
          status: BoxStatus.OCCUPIED,
        },
        select: { code: true },
      });

      if (occupiedBoxes.length > 0) {
        const occupiedCodes = occupiedBoxes.map((b) => b.code).join(', ');
        throw AppError.badRequest(
          `Hộp nuôi [${occupiedCodes}] đã có cua (đang sử dụng), vui lòng chọn hộp trống khác`,
        );
      }
    }

    const batch = await this.repo.createBatchWithAllocation({
      farmId: dto.farmId,
      code: batchCode,
      productId: dto.productId,
      partnerId: dto.partnerId,
      originText: dto.originText,
      importDate: new Date(dto.importDate),
      expectedHarvestDate: dto.expectedHarvestDate
        ? new Date(dto.expectedHarvestDate)
        : undefined,
      initialQuantity: dto.initialQuantity,
      initialWeight: dto.initialWeight,
      cost: dto.cost || 0,
      expectedRevenue: dto.expectedRevenue || 0,
      expectedSuccessRate: dto.expectedSuccessRate || 90,
      note: dto.note,
      boxIds,
      images: dto.images,
    });

    return {
      id: batch.id.toString(),
      code: batch.code,
      status: 'success',
    };
  }

  async getBatchDetails(batchId: number) {
    const b = await this.repo.findById(batchId);
    if (!b) {
      throw AppError.notFound(MESSAGES.BATCH.NOT_FOUND);
    }
    return {
      id: b.id.toString(),
      code: b.code,
      name: b.code,
      import_date: b.importDate ? b.importDate.toISOString() : null,
      expected_harvest_date: b.expectedHarvestDate
        ? b.expectedHarvestDate.toISOString()
        : null,
      origin_text: b.originText || '',
      product_name: b.product.name,
      product_id: b.productId,
      initial_quantity: b.initialQuantity,
      initial_weight: b.initialWeight,
      current_quantity: b.currentQuantity,
      dead_quantity: b.deadQuantity,
      dead_weight: b.deadWeight,
      cost: b.cost,
      current_costs: b.cost,
      total_revenue: 0,
      expected_revenue: b.expectedRevenue,
      expected_success_rate: b.expectedSuccessRate,
      status: b.status.toLowerCase(),
      note: b.note || '',
      images: b.images.map((img) => ({
        id: img.id,
        name: `image_${img.id}`,
        imageUrl: img.imageUrl,
      })),
      warehouses: this.formatWarehousesFromBoxes(b.boxes),
    };
  }

  async updateBatchStatus(batchId: number, status: string) {
    return this.repo.updateStatus(batchId, status.toUpperCase() as any);
  }
}

export const batchService = new BatchService();
