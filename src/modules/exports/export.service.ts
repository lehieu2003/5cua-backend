import prisma from '../../database/prisma.service';
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

    // Look up product if any box has productId
    let crabTypeName = 'Cua thương phẩm (Loại 1)';
    if (exp.boxes && exp.boxes.length > 0 && exp.boxes[0].productId) {
      const product = await prisma.productTemplate.findUnique({
        where: { id: exp.boxes[0].productId },
      });
      if (product) {
        crabTypeName = product.name;
      }
    }

    const pricePerUnit = exp.totalWeight > 0 ? Math.round(exp.totalAmount / exp.totalWeight) : 0;

    return {
      id: exp.id,
      code: exp.code,
      name: exp.code,
      export_date: exp.exportDate.toISOString(),
      partner_name: exp.partnerName || '',
      crab_type: crabTypeName,
      type_kind: crabTypeName,
      total_quantity: exp.totalQty,
      quantity: exp.totalQty,
      dead_quantity: 0,
      total_weight: exp.totalWeight,
      weight: exp.totalWeight,
      dead_weight: 0,
      total_amount: exp.totalAmount,
      total_price: exp.totalAmount,
      real_price: exp.totalAmount,
      price_per_unit: pricePerUnit,
      type: 'export_sell',
      reason: 'Xuất bán',
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
