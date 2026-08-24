import { exportRepository, ExportRepository } from './export.repository';
import { CreateExportDto } from './export.dto';

export class ExportService {
  constructor(private readonly repo: ExportRepository = exportRepository) {}

  async getExportList(farmId?: number, offset = 0) {
    const exports = await this.repo.findExports(farmId, offset);

    return exports.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.code,
      export_date: e.exportDate.toISOString(),
      partner_name: e.partnerName || '',
      total_quantity: e.totalQty,
      total_weight: e.totalWeight,
      total_amount: e.totalAmount,
      status: e.status.toLowerCase(),
      note: e.note || '',
    }));
  }

  async createExport(dto: CreateExportDto) {
    const code = `EXP-${Date.now()}`;
    const exp = await this.repo.createExportWithRelease({
      farmId: dto.farmId,
      code,
      partnerName: dto.partnerName,
      note: dto.note,
      boxes: dto.boxes,
    });

    return {
      status: 'success',
      export_id: exp.id,
      code: exp.code,
    };
  }
}

export const exportService = new ExportService();
