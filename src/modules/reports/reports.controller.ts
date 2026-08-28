import { Request, Response } from 'express';
import { reportsService, ReportsService } from './reports.service';

export class ReportsController {
  constructor(private readonly service: ReportsService = reportsService) {}

  private sendExcelResponse(res: Response, buffer: any, fileName: string) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(Buffer.from(buffer));
  }

  async exportBatches(req: Request, res: Response) {
    const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : undefined;
    const buffer = await this.service.generateBatchesReport(farmId);
    const fileName = `5Cua_BaoCao_LoCua_${Date.now()}.xlsx`;
    return this.sendExcelResponse(res, buffer, fileName);
  }

  async exportWaterHistory(req: Request, res: Response) {
    const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : undefined;
    const pondId = req.query.pondId ? parseInt(req.query.pondId as string, 10) : undefined;
    const { fromDate, toDate } = req.query;

    const buffer = await this.service.generateWaterHistoryReport({
      farmId,
      pondId,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    const fileName = `5Cua_NhatKy_DoNuoc_${Date.now()}.xlsx`;
    return this.sendExcelResponse(res, buffer, fileName);
  }

  async exportFeedingHistory(req: Request, res: Response) {
    const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : undefined;
    const pondId = req.query.pondId ? parseInt(req.query.pondId as string, 10) : undefined;
    const { fromDate, toDate } = req.query;

    const buffer = await this.service.generateFeedingHistoryReport({
      farmId,
      pondId,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    const fileName = `5Cua_NhatKy_ChoAn_${Date.now()}.xlsx`;
    return this.sendExcelResponse(res, buffer, fileName);
  }

  async exportSalesHistory(req: Request, res: Response) {
    const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : undefined;
    const { fromDate, toDate } = req.query;

    const buffer = await this.service.generateSalesHistoryReport({
      farmId,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    const fileName = `5Cua_LichSu_XuatBan_${Date.now()}.xlsx`;
    return this.sendExcelResponse(res, buffer, fileName);
  }
}

export const reportsController = new ReportsController();
