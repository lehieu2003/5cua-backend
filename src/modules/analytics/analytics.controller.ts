import { Request, Response } from 'express';
import { analyticsService, AnalyticsService } from './analytics.service';
import { ResponseUtil } from '../../common/utils/response.util';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService = analyticsService) {}

  async getFarmFcr(req: Request, res: Response) {
    const farmId = parseInt(req.params.farmId, 10);
    const { fromDate, toDate } = req.query;

    const from = fromDate ? new Date(fromDate as string) : undefined;
    const to = toDate ? new Date(toDate as string) : undefined;

    const data = await this.service.getFarmFcrAnalytics(farmId, from, to);
    return ResponseUtil.success(res, data, 'Lấy báo cáo FCR và tiêu thụ thức ăn thành công');
  }

  async getBatchAnalytics(req: Request, res: Response) {
    const batchId = parseInt(req.params.batchId, 10);
    const data = await this.service.getBatchAnalytics(batchId);
    return ResponseUtil.success(res, data, 'Lấy phân tích hiệu quả lô cua thành công');
  }

  async getWaterTrends(req: Request, res: Response) {
    const farmId = parseInt(req.params.farmId, 10);
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    const data = await this.service.getWaterTrends(farmId, days);
    return ResponseUtil.success(res, data, 'Lấy dữ liệu xu hướng môi trường nước thành công');
  }
}

export const analyticsController = new AnalyticsController();
