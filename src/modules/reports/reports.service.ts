import ExcelJS from 'exceljs';
import prisma from '../../database/prisma.service';

export class ReportsService {
  /**
   * Định dạng chung cho Header Excel
   */
  private applyHeaderStyle(worksheet: ExcelJS.Worksheet, headerRowNumber: number) {
    const row = worksheet.getRow(headerRowNumber);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A2E' }, // Deep Blue / Dark Slate
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.height = 28;
  }

  /**
   * Tự động điều chỉnh độ rộng cột và kẻ viền
   */
  private finalizeWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) {
        row.alignment = { vertical: 'middle' };
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };
        });
      }
    });

    worksheet.columns.forEach((col) => {
      let maxLen = 12;
      if (col.values) {
        col.values.forEach((v) => {
          if (v) {
            const str = v.toString();
            if (str.length > maxLen) maxLen = Math.min(str.length + 3, 40);
          }
        });
      }
      col.width = maxLen;
    });
  }

  /**
   * 1. Xuất Excel Báo Cáo Lô Nhập & Đánh Giá Vụ Nuôi
   */
  async generateBatchesReport(farmId?: number): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '5Cua Smart Farm Management System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Danh Sách Lô Cua');

    // Title
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BÁO CÁO THEO DÕI CÁC LÔ CUA & HIỆU QUẢ NUÔI';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFE94560' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    worksheet.getCell('A2').value = `Ngày xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`;
    worksheet.getCell('A2').font = { italic: true, size: 10 };

    // Columns
    worksheet.getRow(4).values = [
      'STT',
      'Mã Lô',
      'Loại Cua',
      'Nguồn Gốc',
      'Ngày Nhập',
      'SL Ban Đầu (con)',
      'KL Ban Đầu (kg)',
      'SL Hiện Tại (con)',
      'SL Hao Hụt (con)',
      'Tỷ Lệ Sống (%)',
      'Chi Phí Giống (VNĐ)',
      'Trạng Thái',
    ];
    this.applyHeaderStyle(worksheet, 4);

    const where: any = {};
    if (farmId) where.farmId = farmId;

    const batches = await prisma.stockImportBatch.findMany({
      where,
      include: { product: true },
      orderBy: { importDate: 'desc' },
    });

    batches.forEach((b, index) => {
      const survivalRate = b.initialQuantity > 0 ? ((b.currentQuantity / b.initialQuantity) * 100).toFixed(1) : '0';
      worksheet.addRow([
        index + 1,
        b.code,
        b.product?.name || 'Cua giống',
        b.originText || '---',
        b.importDate ? new Date(b.importDate).toLocaleDateString('vi-VN') : '',
        b.initialQuantity,
        b.initialWeight,
        b.currentQuantity,
        b.deadQuantity,
        `${survivalRate}%`,
        b.cost,
        b.status,
      ]);
    });

    this.finalizeWorksheet(worksheet);
    return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
  }

  /**
   * 2. Xuất Excel Nhật Ký Đo Thông Số Nước
   */
  async generateWaterHistoryReport(params: {
    farmId?: number;
    pondId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Nhật Ký Đo Nước');

    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'NHẬT KÝ ĐO THÔNG SỐ MÔI TRƯỜNG NƯỚC';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF0288D1' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    worksheet.getCell('A2').value = `Ngày xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`;

    worksheet.getRow(4).values = [
      'STT',
      'Ao / Nhà Nuôi',
      'Thời Gian Đo',
      'Thông Số Đo',
      'Giá Trị',
      'Đơn Vị',
      'Cảnh Báo',
      'Ghi Chú',
    ];
    this.applyHeaderStyle(worksheet, 4);

    const where: any = {};
    if (params.pondId) {
      where.pondId = params.pondId;
    } else if (params.farmId) {
      where.pond = { farmId: params.farmId };
    }
    if (params.fromDate || params.toDate) {
      where.checkDate = {};
      if (params.fromDate) where.checkDate.gte = new Date(params.fromDate);
      if (params.toDate) where.checkDate.lte = new Date(params.toDate);
    }

    const histories = await prisma.waterCheckHistory.findMany({
      where,
      include: {
        pond: true,
        items: { include: { parameter: true } },
      },
      orderBy: { checkDate: 'desc' },
    });

    let rowIndex = 1;
    histories.forEach((h) => {
      h.items.forEach((item) => {
        worksheet.addRow([
          rowIndex++,
          h.pond?.name || '',
          new Date(h.checkDate).toLocaleString('vi-VN'),
          item.parameter.name,
          item.value,
          item.parameter.unit,
          item.isWarning ? '⚠️ BẤT THƯỜNG' : '✅ Bình thường',
          h.note || '',
        ]);
      });
    });

    this.finalizeWorksheet(worksheet);
    return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
  }

  /**
   * 3. Xuất Excel Nhật Ký Cho Ăn & Bổ Sung Vi Sinh
   */
  async generateFeedingHistoryReport(params: {
    farmId?: number;
    pondId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Nhật Ký Cho Ăn & Vi Sinh');

    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'NHẬT KÝ CHO ĂN VÀ BỔ SUNG VI SINH / CHẾ PHẨM';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF2E7D32' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    worksheet.getCell('A2').value = `Ngày xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`;

    worksheet.getRow(4).values = [
      'STT',
      'Ao / Nhà Nuôi',
      'Thao Tác',
      'Tên Thức Ăn / Chế Phẩm',
      'Khối Lượng (kg)',
      'Số Cua Tại Thời Điểm',
      'Thời Gian Ghi Nhận',
      'Ghi Chú',
    ];
    this.applyHeaderStyle(worksheet, 4);

    const where: any = {};
    if (params.pondId) {
      where.pondId = params.pondId;
    } else if (params.farmId) {
      where.pond = { farmId: params.farmId };
    }
    if (params.fromDate || params.toDate) {
      where.recordedAt = {};
      if (params.fromDate) where.recordedAt.gte = new Date(params.fromDate);
      if (params.toDate) where.recordedAt.lte = new Date(params.toDate);
    }

    const records = await prisma.feedingRecord.findMany({
      where,
      include: {
        pond: true,
        items: { include: { product: true } },
      },
      orderBy: { recordedAt: 'desc' },
    });

    let rowIndex = 1;
    records.forEach((r) => {
      r.items.forEach((item) => {
        worksheet.addRow([
          rowIndex++,
          r.pond?.name || '',
          r.actionType === 'FEEDING' ? 'Cho ăn' : 'Bổ sung vi sinh',
          item.product?.name || 'Thức ăn',
          item.quantity,
          r.crabQuantityAtTime,
          new Date(r.recordedAt).toLocaleString('vi-VN'),
          r.note || '',
        ]);
      });
    });

    this.finalizeWorksheet(worksheet);
    return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
  }

  /**
   * 4. Xuất Excel Lịch Sử Xuất Bán Cua Thương Phẩm
   */
  async generateSalesHistoryReport(params: {
    farmId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lịch Sử Xuất Bán');

    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BÁO CÁO LỊCH SỬ XUẤT BÁN CUA THƯƠNG PHẨM';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFD84315' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    worksheet.getCell('A2').value = `Ngày xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`;

    worksheet.getRow(4).values = [
      'STT',
      'Mã Phiếu Xuất',
      'Khách Hàng / Đối Tác',
      'Ngày Xuất Bán',
      'Tổng Số Lượng (con)',
      'Tổng Khối Lượng (kg)',
      'Tổng Thành Tiền (VNĐ)',
      'Trạng Thái',
      'Ghi Chú',
    ];
    this.applyHeaderStyle(worksheet, 4);

    const where: any = {};
    if (params.farmId) where.farmId = params.farmId;
    if (params.fromDate || params.toDate) {
      where.exportDate = {};
      if (params.fromDate) where.exportDate.gte = new Date(params.fromDate);
      if (params.toDate) where.exportDate.lte = new Date(params.toDate);
    }

    const exports = await prisma.exportHistory.findMany({
      where,
      orderBy: { exportDate: 'desc' },
    });

    exports.forEach((e, index) => {
      worksheet.addRow([
        index + 1,
        e.code,
        e.partnerName || 'Khách lẻ',
        new Date(e.exportDate).toLocaleDateString('vi-VN'),
        e.totalQty,
        e.totalWeight,
        e.totalAmount,
        e.status,
        e.note || '',
      ]);
    });

    this.finalizeWorksheet(worksheet);
    return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
  }
}

export const reportsService = new ReportsService();
