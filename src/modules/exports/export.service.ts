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

  async getExportDetail(id: number) {
    const exp = await this.repo.findById(id);
    if (!exp) throw new Error('Không tìm thấy phiếu xuất bán');
    return {
      id: exp.id,
      code: exp.code,
      name: exp.code,
      export_date: exp.exportDate.toISOString(),
      partner_name: exp.partnerName || '',
      total_quantity: exp.totalQty,
      total_weight: exp.totalWeight,
      total_amount: exp.totalAmount,
      status: exp.status.toLowerCase(),
      note: exp.note || '',
      boxes: exp.boxes,
    };
  }

  async updateExportStatus(id: number, status: string) {
    return this.repo.updateStatus(id, status.toUpperCase() as any);
  }

  async getSummary(farmId?: number) {
    return this.repo.getSummary(farmId);
  }
}

export const exportService = new ExportService();
