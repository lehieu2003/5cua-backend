import { Request, Response  } from 'express';
import { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { exportService, ExportService } from './export.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';
import { operationLogService } from '../../common/services/operation-log.service';

export class ExportController {
  constructor(private readonly service: ExportService = exportService) {}

  /**
   * REST: GET /api/v1/exports
   */
  async listExports(req: Request, res: Response) {
    try {
      const farmId = (req.query.farmId || req.query.farm_id) ? parseInt((req.query.farmId || req.query.farm_id) as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      // Filter theo contract mobile: status, keyword, datetime_now_from/to
      const status = (req.query.status as string) || undefined;
      const keyword = (req.query.keyword as string) || undefined;
      const fromRaw = (req.query.datetime_now_from || req.query.from) as string | undefined;
      const toRaw = (req.query.datetime_now_to || req.query.to) as string | undefined;
      const from = fromRaw ? new Date(fromRaw) : undefined;
      const to = toRaw ? new Date(toRaw) : undefined;

      const data = await this.service.getExportList(farmId, offset, {
        status,
        keyword,
        from: from && !isNaN(from.getTime()) ? from : undefined,
        to: to && !isNaN(to.getTime()) ? to : undefined,
      });
      return ResponseUtil.success(res, data);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }

  /**
   * REST: POST /api/v1/exports
   */
  async createExport(req: Request, res: Response) {
    try {
      const result = await this.service.createExport(req.body);
      operationLogService
        .log({
          userId: (req as AuthenticatedRequest).user?.userId,
          farmId: req.body?.farmId,
          exportId: result?.export_id ?? null,
          action: 'EXPORT_HARVEST',
          details: {
            ma_xuat: result?.code,
            box_count: req.body?.boxes?.length,
          },
        })
        .catch(() => {});
      return ResponseUtil.success(res, result, MESSAGES.EXPORT.CREATE_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }

  /**
   * REST: GET /api/v1/exports/summary
   */
  async getSummary(req: Request, res: Response) {
    try {
      const farmId = (req.query.farmId || req.query.farm_id) ? parseInt((req.query.farmId || req.query.farm_id) as string, 10) : undefined;
      const summary = await this.service.getSummary(farmId);
      return ResponseUtil.success(res, summary);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
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
      return ResponseUtil.fromError(res, error);
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
      operationLogService
        .log({
          userId: (req as AuthenticatedRequest).user?.userId,
          exportId: id,
          action: 'UPDATE_EXPORT_STATUS',
          details: { export_id: id, status },
        })
        .catch(() => {});
      return ResponseUtil.success(res, result);
    } catch (error: any) {
      return ResponseUtil.fromError(res, error);
    }
  }
}

export const exportController = new ExportController();
