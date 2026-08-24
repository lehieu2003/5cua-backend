import { Request, Response } from 'express';
import { inspectionService, InspectionService } from './inspection.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class InspectionController {
  constructor(private readonly service: InspectionService = inspectionService) {}

  /**
   * REST: POST /api/v1/inspections/cleaning
   */
  async addCleanCheck(req: Request, res: Response) {
    try {
      const result = await this.service.addCleanAndCheck(req.body);
      return ResponseUtil.success(res, result, MESSAGES.INSPECTION.CLEAN_CHECK_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: POST /api/v1/inspections/convert-crab
   */
  async convertCrab(req: Request, res: Response) {
    try {
      const result = await this.service.convertCrabType(req.body);
      return ResponseUtil.success(res, result, MESSAGES.INSPECTION.CONVERT_CRAB_SUCCESS);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const inspectionController = new InspectionController();
