import prisma from '../../database/prisma.service';
import { AppError } from '../../common/errors/app.error';
import { exportRepository, ExportRepository, type ExportListFilters } from './export.repository';
import { CreateExportDto } from './export.dto';

// Mobile gửi trạng thái kiểu legacy/lowercase ('cancel', 'done', 'MỚI'...) — map về enum
const EXPORT_STATUS_ALIASES: Record<string, string> = {
  DRAFT: 'DRAFT', NEW: 'DRAFT', 'MỚI': 'DRAFT',
  CONFIRMED: 'CONFIRMED', 'ĐÃ XÁC NHẬN': 'CONFIRMED',
  DONE: 'DONE', COMPLETED: 'DONE', ACTIVE: 'DONE', 'HOÀN THÀNH': 'DONE',
  CANCEL: 'CANCELLED', CANCELED: 'CANCELLED', CANCELLED: 'CANCELLED', 'ĐÃ HỦY': 'CANCELLED',
};

export class ExportService {
  constructor(private readonly repo: ExportRepository = exportRepository) {}

  async getExportList(farmId?: number, offset = 0, filters?: ExportListFilters) {
    const status = filters?.status
      ? EXPORT_STATUS_ALIASES[String(filters.status).toUpperCase().trim()]
      : undefined;
    const exports = await this.repo.findExports(farmId, offset, { ...filters, status });

    return exports.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.code,
      export_date: e.exportDate.toISOString(),
      partner_name: e.partnerName || '',
      total_quantity: e.totalQty,
      total_crabs: e.totalQty,
      totalCrabs: e.totalQty,
      total_weight: e.totalWeight,
      total_amount: e.totalAmount,
      status: e.status,
      note: e.note || '',
      // Mobile đọc 2 field này ở list (hiện chỉ có ở detail)
      type: 'export_sell' as const,
      reason: 'Xuất bán',
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
    if (!exp) throw AppError.notFound('Không tìm thấy phiếu xuất bán');

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
      status: exp.status,
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
