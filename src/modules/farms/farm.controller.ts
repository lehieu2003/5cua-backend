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

  async getFarmWarnings(req: Request, res: Response) {
    try {
      const farmId = parseInt(req.params.id, 10);
      const { fromDate, toDate } = req.query;
      const warnings = await this.service.getFarmWarnings(
        farmId,
        fromDate as string | undefined,
        toDate as string | undefined
      );
      return ResponseUtil.success(res, warnings);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  async getFarmOperations(req: Request, res: Response) {
    try {
      const farmId = parseInt(req.params.id, 10);
      const { fromDate, toDate } = req.query;
      const operations = await this.service.getFarmOperations(
        farmId,
        fromDate as string | undefined,
        toDate as string | undefined
      );
      return ResponseUtil.success(res, operations);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  async getFarmTasks(req: Request, res: Response) {
    try {
      const farmId = parseInt(req.params.id, 10);
      const { taskType, keyword } = req.query;
      const tasks = await this.service.getFarmTasks(
        farmId,
        taskType as string | undefined,
        keyword as string | undefined
      );
      return ResponseUtil.success(res, tasks);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const farmController = new FarmController();
