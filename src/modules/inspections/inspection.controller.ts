import { Request, Response  } from 'express';
import { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { inspectionService, InspectionService } from './inspection.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';
import { operationLogService } from '../../common/services/operation-log.service';

export class InspectionController {
  constructor(private readonly service: InspectionService = inspectionService) {}

  /**
   * REST: POST /api/v1/inspections/cleaning
   */
  async addCleanCheck(req: Request, res: Response) {
    try {
      const result = await this.service.addCleanAndCheck(req.body);
      operationLogService
        .log({
          userId: (req as AuthenticatedRequest).user?.userId,
          pondId: Number(req.body?.warehouseId) || null,
          action: 'INSPECTION_CLEANING',
          details: {
            soft_shell: req.body?.softShellQuantity,
            dead: req.body?.deadQuantity,
          },
        })
        .catch(() => {});
      return ResponseUtil.success(res, result, MESSAGES.INSPECTION.CLEAN_CHECK_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }

  /**
   * REST: POST /api/v1/inspections/convert-crab
   */
  async convertCrab(req: Request, res: Response) {
    try {
      const result = await this.service.convertCrabType(req.body);
      operationLogService
        .log({
          userId: (req as AuthenticatedRequest).user?.userId,
          pondId: Number(req.body?.warehouseId) || null,
          action: 'CONVERT_CRAB',
          details: { boxes: req.body?.boxs?.length },
        })
        .catch(() => {});
      return ResponseUtil.success(res, result, MESSAGES.INSPECTION.CONVERT_CRAB_SUCCESS);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }
}

export const inspectionController = new InspectionController();
