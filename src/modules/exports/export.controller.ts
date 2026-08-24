import { Request, Response } from 'express';
import { exportService, ExportService } from './export.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class ExportController {
  constructor(private readonly service: ExportService = exportService) {}

  /**
   * REST: GET /api/v1/exports
   */
  async listExports(req: Request, res: Response) {
    try {
      const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const data = await this.service.getExportList(farmId, offset);
      return ResponseUtil.success(res, data);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: POST /api/v1/exports
   */
  async createExport(req: Request, res: Response) {
    try {
      const result = await this.service.createExport(req.body);
      return ResponseUtil.success(res, result, MESSAGES.EXPORT.CREATE_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/exports/summary
   */
  async getSummary(_req: Request, res: Response) {
    return ResponseUtil.success(res, {
      total_quantity: 85,
      total_weight: 32.5,
    });
  }

  /**
   * REST: GET /api/v1/exports/:id
   */
  async getDetail(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const detail = await this.service.getExportDetail(id);
      return ResponseUtil.success(res, detail);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: PATCH /api/v1/exports/:id/status
   */
  async updateStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body;
      const result = await this.service.updateExportStatus(id, status);
      return ResponseUtil.success(res, result);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const exportController = new ExportController();
