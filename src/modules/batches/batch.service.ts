import { batchRepository, BatchRepository } from './batch.repository';
import { CreateBatchDto } from './batch.dto';

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
      import_date: b.importDate.toISOString(),
      expected_harvest_date: b.expectedHarvestDate?.toISOString() || '',
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
    }));
  }

  async createBatch(dto: CreateBatchDto) {
    // Trích xuất tất cả boxIds từ cấu trúc lồng nhau: warehouses -> blocks -> locations
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

    const batch = await this.repo.createBatchWithAllocation({
      farmId: dto.farmId,
      code: dto.name,
      productId: dto.productId,
      partnerId: dto.partnerId,
      originText: dto.originText,
      importDate: new Date(dto.importDate),
      expectedHarvestDate: dto.expectedHarvestDate ? new Date(dto.expectedHarvestDate) : undefined,
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
    const batch = await this.repo.findById(batchId);
    if (!batch) throw new Error('Không tìm thấy thông tin đợt nhập');
    return batch;
  }
}

export const batchService = new BatchService();
