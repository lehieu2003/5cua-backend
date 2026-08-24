import { Request, Response } from 'express';
import { farmService, FarmService } from './farm.service';
import { ResponseUtil } from '../../common/utils/response.util';

export class FarmController {
  constructor(private readonly service: FarmService = farmService) {}

  /**
   * REST: GET /api/v1/farms
   */
  async getAllFarms(req: Request, res: Response) {
    try {
      const farms = await this.service.getAllFarms();
      return ResponseUtil.success(res, farms);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/farms/:id/overview
   */
  async getFarmOverview(req: Request, res: Response) {
    try {
      const farmId = parseInt(req.params.id, 10);
      const overview = await this.service.getFarmOverview(farmId);
      return ResponseUtil.success(res, overview);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const farmController = new FarmController();
