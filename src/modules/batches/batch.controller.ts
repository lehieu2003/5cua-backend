import { Request, Response } from 'express';
import { batchService, BatchService } from './batch.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class BatchController {
  constructor(private readonly service: BatchService = batchService) {}

  /**
   * REST: GET /api/v1/batches
   */
  async listBatches(req: Request, res: Response) {
    try {
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
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: POST /api/v1/batches
   */
  async createBatch(req: Request, res: Response) {
    try {
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

      return ResponseUtil.success(res, result, MESSAGES.BATCH.CREATE_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const batchController = new BatchController();
