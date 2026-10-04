import { Request, Response  } from 'express';
import { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { batchService, BatchService } from './batch.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';
import { operationLogService } from '../../common/services/operation-log.service';

export class BatchController {
  constructor(private readonly service: BatchService = batchService) {}

  /**
   * REST: GET /api/v1/batches
   */
  async listBatches(req: Request, res: Response) {
    const { farmId, importDateFrom, importDateTo, status, keyword, offset } = req.query;

    const records = await this.service.getImportRecords({
      farmId: farmId ? parseInt(farmId as string, 10) : undefined,
      importDateFrom: importDateFrom as string | undefined,
      importDateTo: importDateTo as string | undefined,
      status: status as any,
      keyword: keyword as string | undefined,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    return ResponseUtil.success(res, records);
  }

  /**
   * REST: GET /api/v1/batches/summary
   */
  async getBatchesSummary(req: Request, res: Response) {
    const { farmId, importDateFrom, importDateTo, status, keyword } = req.query;

    const summary = await this.service.getBatchesSummary({
      farmId: farmId ? parseInt(farmId as string, 10) : undefined,
      importDateFrom: importDateFrom as string | undefined,
      importDateTo: importDateTo as string | undefined,
      status: status as string | undefined,
      keyword: keyword as string | undefined,
    });

    return ResponseUtil.success(res, summary);
  }

  /**
   * REST: POST /api/v1/batches
   */
  async createBatch(req: Request, res: Response) {
    const body = req.body;

    const result = await this.service.createBatch({
      farmId: parseInt(body.farmId || body.farm_id || '1', 10),
      name: body.name || `BATCH-${Date.now()}`,
      productId: parseInt(body.productId || body.product_id || '72', 10),
      partnerId: body.partnerId || body.partner_id ? parseInt(body.partnerId || body.partner_id, 10) : undefined,
      originText: body.originText || body.origin_text,
      importDate: body.importDate || body.import_date || new Date().toISOString(),
      expectedHarvestDate: body.expectedHarvestDate || body.expected_harvest_date,
      initialQuantity: parseInt(body.initialQuantity || body.initial_quantity || '0', 10),
      initialWeight: parseFloat(body.initialWeight || body.initial_weight || '0'),
      cost: parseFloat(body.cost || '0'),
      expectedRevenue: parseFloat(body.expectedRevenue || body.expected_revenue || '0'),
      expectedSuccessRate: parseFloat(body.expectedSuccessRate || body.expected_success_rate || '90'),
      note: body.note,
      warehouses: body.warehouses || [],
      images: body.images || [],
    });

    operationLogService
      .log({
        userId: (req as AuthenticatedRequest).user?.userId,
        farmId: req.body?.farmId,
        batchId: Number((result as any)?.id ?? (result as any)?.batch_id ?? 0) || null,
        action: 'CREATE_BATCH',
        details: {
          ma_lo: req.body?.name,
          totalCrabs: req.body?.initialQuantity,
        },
      })
      .catch(() => {});
    return ResponseUtil.success(res, result, MESSAGES.BATCH.CREATE_SUCCESS, 201);
  }

  /**
   * REST: GET /api/v1/batches/:id
   */
  async getBatchDetail(req: Request, res: Response) {
    const batchId = parseInt(req.params.id, 10);
    const batch = await this.service.getBatchDetails(batchId);
    return ResponseUtil.success(res, batch);
  }

  /**
   * REST: POST /api/v1/batches/:id/assign — mobile gửi phân bổ ao theo tên
   */
  async assignDistribution(req: Request, res: Response) {
    const batchId = parseInt(req.params.id, 10);
    const result = await this.service.assignDistribution(batchId, req.body?.distribution);
    operationLogService
      .log({
        userId: (req as AuthenticatedRequest).user?.userId,
        farmId: (result as any)?.farmId,
        batchId,
        action: 'ASSIGN_BATCH_DISTRIBUTION',
        details: { batch_id: batchId, assigned: (result as any)?.assigned },
      })
      .catch(() => {});
    return ResponseUtil.success(res, result, 'Lưu phân bổ ao thành công', 201);
  }

  /**
   * REST: PATCH /api/v1/batches/:id/status
   */
  async updateBatchStatus(req: Request, res: Response) {
    const batchId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const result = await this.service.updateBatchStatus(batchId, status);
    operationLogService
      .log({
        userId: (req as AuthenticatedRequest).user?.userId,
        batchId,
        action: 'UPDATE_BATCH_STATUS',
        details: { batch_id: batchId, status },
      })
      .catch(() => {});
    return ResponseUtil.success(res, result, MESSAGES.BATCH.UPDATE_SUCCESS);
  }
}

export const batchController = new BatchController();
