import { Request, Response  } from 'express';
import { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { waterService, WaterService } from './water.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';
import { operationLogService } from '../../common/services/operation-log.service';

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
      return ResponseUtil.fromError(res, error);
    }
  }

  /**
   * REST: POST /api/v1/water/checks
   */
  async addCheck(req: Request, res: Response) {
    try {
      const result = await this.service.addWaterCheck(req.body);
      operationLogService
        .log({
          userId: (req as AuthenticatedRequest).user?.userId,
          pondId: Number(req.body?.warehouseId ?? req.body?.pondId) || null,
          action: 'WATER_CHECK',
          details: {
            has_warning: result?.has_warning,
            warnings_created: result?.warnings_created,
          },
        })
        .catch(() => {});
      return ResponseUtil.success(res, result, MESSAGES.WATER.ADD_CHECK_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }

  /**
   * REST: GET /api/v1/water/checks
   */
  async listHistory(req: Request, res: Response) {
    try {
      const rawPondId = req.query.pondId || req.query.warehouseId || req.query.warehouse_id;
      if (!rawPondId) {
        return ResponseUtil.error(res, 'Vui lòng cung cấp pondId', 400);
      }
      const pondId = parseInt(rawPondId as string, 10);
      const offset = parseInt((req.query.offset || '0') as string, 10);

      const data = await this.service.getWaterHistory(pondId, offset);
      return ResponseUtil.success(res, data);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }

  /**
   * REST: GET /api/v1/water/warnings/count
   */
  async getWarningCount(req: Request, res: Response) {
    try {
      const rawFarmId = req.query.farmId || req.query.farm_id;
      if (!rawFarmId) {
        return ResponseUtil.error(res, 'Vui lòng cung cấp farmId', 400);
      }
      const farmId = parseInt(rawFarmId as string, 10);
      const count = await this.service.getWarningCount(farmId);
      return ResponseUtil.success(res, { count, unresolvedCount: count });
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }
}

export const waterController = new WaterController();
