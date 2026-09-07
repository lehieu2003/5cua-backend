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

    let finalNote = dto.note || '';
    if (dto.warehouses && dto.warehouses.length > 0) {
      finalNote = `${finalNote}\n[POND_DISTRIBUTION]:${JSON.stringify(dto.warehouses)}`.trim();
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
      note: finalNote,
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

    let warehouses = this.formatWarehousesFromBoxes(b.boxes);
    let note = b.note || '';

    // If note contains [POND_DISTRIBUTION], resolve complete warehouses array (both compound and square ponds)
    if (note.includes('[POND_DISTRIBUTION]:')) {
      const parts = note.split('[POND_DISTRIBUTION]:');
      note = parts[0].trim();
      const distributionJson = parts[1].trim();
      try {
        const rawWarehouses = JSON.parse(distributionJson);
        if (Array.isArray(rawWarehouses) && rawWarehouses.length > 0) {
          const pondIds = rawWarehouses
            .map((w: any) => parseInt(w.id || w.pondId, 10))
            .filter((id: number) => !isNaN(id));

          const ponds = pondIds.length > 0
            ? await prisma.pond.findMany({
                where: { id: { in: pondIds } },
                include: {
                  blocks: {
                    include: {
                      boxes: true,
                    },
                  },
                },
              })
            : [];
          const pondMap = new Map(ponds.map((p) => [p.id, p]));
          const boxMap = new Map((b.boxes || []).map((bx) => [bx.id, bx]));

          warehouses = rawWarehouses.map((w: any) => {
            const pId = parseInt(w.id || w.pondId, 10);
            const p = pondMap.get(pId);
            const isCompound = w.isCompound === true || (w.blocks && w.blocks.length > 0) || p?.pondType === 'box_grid';

            if (!isCompound) {
              return {
                id: pId,
                name: p ? p.name : (w.name || `Ao ${pId}`),
                type: 'square_pond',
                product_uom_qty: parseInt(w.product_uom_qty || w.quantity || '0', 10),
                blocks: [],
              };
            }

            const rawBlocks = w.blocks || [];
            const blockList = rawBlocks.map((blk: any) => {
              const bId = parseInt(blk.id || blk.block_id, 10);
              const foundBlock = p?.blocks.find((bl) => bl.id === bId);
              const rawLocs = blk.locations || blk.boxes || [];
              const locList = rawLocs.map((loc: any) => {
                const locId = parseInt(loc.id || loc.location_id, 10);
                const foundBox = boxMap.get(locId) || foundBlock?.boxes.find((bx) => bx.id === locId);
                return {
                  id: locId,
                  name: foundBox?.code || loc.name || `Hộp ${locId}`,
                  code: foundBox?.code || loc.code,
                  quantity: parseInt(loc.quantity || '1', 10),
                };
              });

              return {
                id: bId,
                name: foundBlock?.name || blk.name || `Dãy ${bId}`,
                code: blk.code || (foundBlock ? `B${foundBlock.posZ}` : undefined),
                quantity: locList.length > 0 ? locList.length : parseInt(blk.quantity || '0', 10),
                locations: locList,
              };
            });

            return {
              id: pId,
              name: p ? p.name : (w.name || `Ao ${pId}`),
              type: p?.pondType || 'box_grid',
              product_uom_qty: parseInt(w.product_uom_qty || w.quantity || '0', 10),
              blocks: blockList,
            };
          });
        }
      } catch (_) {}
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
      note,
      images: b.images.map((img) => ({
        id: img.id,
        name: `image_${img.id}`,
        imageUrl: img.imageUrl,
      })),
      warehouses,
    };
  }

  async updateBatchStatus(batchId: number, status: string) {
    return this.repo.updateStatus(batchId, status.toUpperCase() as any);
  }
}

export const batchService = new BatchService();
