import { Request, Response } from 'express';
import { waterService, WaterService } from './water.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class WaterController {
  constructor(private readonly service: WaterService = waterService) {}

  /**
   * REST: GET /api/v1/water/parameters
   */
  async listParameters(_req: Request, res: Response) {
    try {
      const data = await this.service.getWaterParameters();
      return ResponseUtil.success(res, data);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: POST /api/v1/water/checks
   */
  async addCheck(req: Request, res: Response) {
    try {
      const result = await this.service.addWaterCheck(req.body);
      return ResponseUtil.success(res, result, MESSAGES.WATER.ADD_CHECK_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/water/checks
   */
  async listHistory(req: Request, res: Response) {
    try {
      const pondId = parseInt((req.query.pondId || req.query.warehouseId || req.query.warehouse_id || '1') as string, 10);
      const offset = parseInt((req.query.offset || '0') as string, 10);

      const data = await this.service.getWaterHistory(pondId, offset);
      return ResponseUtil.success(res, data);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/water/warnings/count
   */
  async getWarningCount(req: Request, res: Response) {
    try {
      const farmId = parseInt((req.query.farmId || req.query.farm_id || '1') as string, 10);
      const count = await this.service.getWarningCount(farmId);
      return ResponseUtil.success(res, { count });
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const waterController = new WaterController();
