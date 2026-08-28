import prisma from '../../database/prisma.service';
import { AppError } from '../../common/errors/app.error';

export class AnalyticsService {
  /**
   * Tính toán chỉ số FCR (Feed Conversion Ratio) & Hiệu quả tiêu thụ thức ăn theo Farm
   */
  async getFarmFcrAnalytics(farmId: number, fromDate?: Date, toDate?: Date) {
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        ponds: { select: { id: true, name: true } },
      },
    });

    if (!farm) {
      throw new AppError('Không tìm thấy trang trại', 404);
    }

    const pondIds = farm.ponds.map((p) => p.id);

    // 1. Tổng lượng thức ăn đã tiêu thụ (ActionType = FEEDING)
    const feedingWhere: any = {
      pondId: { in: pondIds },
      actionType: 'FEEDING',
    };
    if (fromDate || toDate) {
      feedingWhere.recordedAt = {};
      if (fromDate) feedingWhere.recordedAt.gte = fromDate;
      if (toDate) feedingWhere.recordedAt.lte = toDate;
    }

    const feedingRecords = await prisma.feedingRecord.findMany({
      where: feedingWhere,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    let totalFeedAmountKg = 0;
    let totalFeedCost = 0;
    const feedTypeBreakdown: Record<string, { quantityKg: number; totalCost: number }> = {};

    for (const record of feedingRecords) {
      for (const item of record.items) {
        const qty = item.quantity || 0;
        const price = item.product?.price || 0;
        const cost = qty * price;
        totalFeedAmountKg += qty;
        totalFeedCost += cost;

        const pName = item.product?.name || 'Khác';
        if (!feedTypeBreakdown[pName]) {
          feedTypeBreakdown[pName] = { quantityKg: 0, totalCost: 0 };
        }
        feedTypeBreakdown[pName].quantityKg += qty;
        feedTypeBreakdown[pName].totalCost += cost;
      }
    }

    // 2. Tổng khối lượng nhập giống
    const batchWhere: any = { farmId };
    if (fromDate || toDate) {
      batchWhere.importDate = {};
      if (fromDate) batchWhere.importDate.gte = fromDate;
      if (toDate) batchWhere.importDate.lte = toDate;
    }

    const batches = await prisma.stockImportBatch.findMany({
      where: batchWhere,
    });

    const totalImportWeightKg = batches.reduce((sum, b) => sum + (b.initialWeight || 0), 0);
    const totalSeedCost = batches.reduce((sum, b) => sum + (b.cost || 0), 0);
    const totalImportQuantity = batches.reduce((sum, b) => sum + (b.initialQuantity || 0), 0);

    // 3. Tổng khối lượng và doanh thu xuất bán
    const exportWhere: any = { farmId, status: { in: ['CONFIRMED', 'DONE'] } };
    if (fromDate || toDate) {
      exportWhere.exportDate = {};
      if (fromDate) exportWhere.exportDate.gte = fromDate;
      if (toDate) exportWhere.exportDate.lte = toDate;
    }

    const exports = await prisma.exportHistory.findMany({
      where: exportWhere,
    });

    const totalExportWeightKg = exports.reduce((sum, e) => sum + (e.totalWeight || 0), 0);
    const totalExportRevenue = exports.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalExportQuantity = exports.reduce((sum, e) => sum + (e.totalQty || 0), 0);

    // 4. Ước tính tăng trọng (Biomass Weight Gain)
    // Tăng trọng = (Tổng khối lượng xuất bán) - (Tổng khối lượng nhập tương ứng)
    const biomassGainKg = Math.max(0, totalExportWeightKg - totalImportWeightKg);

    // 5. Tính chỉ số FCR = Tổng thức ăn (kg) / Tổng tăng trọng (kg)
    const fcr = biomassGainKg > 0 ? Number((totalFeedAmountKg / biomassGainKg).toFixed(2)) : 0;

    return {
      farmId: farm.id,
      farmName: farm.name,
      period: {
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
      },
      fcrMetrics: {
        fcr,
        fcrRating: fcr === 0 ? 'CHUA_DU_LIEU' : fcr <= 1.8 ? 'XUAT_SAC' : fcr <= 2.5 ? 'DAT_CHUAN' : 'CAN_TOI_UU',
        totalFeedAmountKg: Number(totalFeedAmountKg.toFixed(2)),
        biomassGainKg: Number(biomassGainKg.toFixed(2)),
        feedTypeBreakdown,
      },
      productionMetrics: {
        totalImportQuantity,
        totalImportWeightKg: Number(totalImportWeightKg.toFixed(2)),
        totalExportQuantity,
        totalExportWeightKg: Number(totalExportWeightKg.toFixed(2)),
      },
      financialSummary: {
        totalSeedCost,
        totalFeedCost,
        totalOperatingCost: totalSeedCost + totalFeedCost,
        totalExportRevenue,
        estimatedGrossProfit: totalExportRevenue - (totalSeedCost + totalFeedCost),
      },
    };
  }

  /**
   * Phân tích chi tiết hiệu quả của một Lô Cua (StockImportBatch)
   */
  async getBatchAnalytics(batchId: number) {
    const batch = await prisma.stockImportBatch.findUnique({
      where: { id: batchId },
      include: {
        farm: { select: { id: true, name: true } },
        product: true,
        boxes: {
          select: { id: true, status: true },
        },
      },
    });

    if (!batch) {
      throw new AppError('Không tìm thấy lô cua', 404);
    }

    const initialQuantity = batch.initialQuantity || 1;
    const currentQuantity = batch.currentQuantity || 0;
    const deadQuantity = batch.deadQuantity || 0;

    // Tỷ lệ sống hiện tại (%)
    const survivalRate = Number(((currentQuantity / initialQuantity) * 100).toFixed(2));
    // Tỷ lệ chết/hao hụt (%)
    const mortalityRate = Number(((deadQuantity / initialQuantity) * 100).toFixed(2));

    // Đếm số cua đang ở hộp và trạng thái
    const totalAssignedBoxes = batch.boxes.length;
    const occupiedBoxes = batch.boxes.filter((b) => b.status === 'OCCUPIED').length;

    // Tính thời gian nuôi (ngày)
    const now = new Date();
    const importDate = new Date(batch.importDate);
    const rearingDays = Math.max(1, Math.floor((now.getTime() - importDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      batchId: batch.id,
      batchCode: batch.code,
      farmName: batch.farm?.name,
      productName: batch.product?.name,
      importDate: batch.importDate.toISOString(),
      expectedHarvestDate: batch.expectedHarvestDate ? batch.expectedHarvestDate.toISOString() : null,
      rearingDays,
      status: batch.status,
      quantityMetrics: {
        initialQuantity: batch.initialQuantity,
        initialWeightKg: batch.initialWeight,
        currentQuantity: batch.currentQuantity,
        deadQuantity: batch.deadQuantity,
        deadWeightKg: batch.deadWeight,
        assignedBoxes: totalAssignedBoxes,
        occupiedBoxes,
      },
      performanceRates: {
        survivalRate,
        mortalityRate,
        expectedSuccessRate: batch.expectedSuccessRate,
        targetMet: survivalRate >= (batch.expectedSuccessRate || 90),
      },
      financialMetrics: {
        seedCost: batch.cost,
        expectedRevenue: batch.expectedRevenue,
        initialPricePerCrab: batch.initialQuantity > 0 ? Math.round(batch.cost / batch.initialQuantity) : 0,
      },
    };
  }

  /**
   * Phân tích xu hướng chất lượng nước & tần suất cảnh báo theo ao
   */
  async getWaterTrends(farmId: number, days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        ponds: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!farm) {
      throw new AppError('Không tìm thấy trang trại', 404);
    }

    const pondIds = farm.ponds.map((p) => p.id);

    const checkHistories = await prisma.waterCheckHistory.findMany({
      where: {
        pondId: { in: pondIds },
        checkDate: { gte: fromDate },
      },
      include: {
        items: {
          include: {
            parameter: true,
          },
        },
      },
      orderBy: { checkDate: 'asc' },
    });

    // Thống kê theo từng chỉ số (DO, pH, Độ mặn, Nhiệt độ...)
    const paramStats: Record<
      string,
      {
        paramName: string;
        unit: string;
        values: { date: string; value: number; isWarning: boolean; pondName: string }[];
        warningCount: number;
        avgValue: number;
        minValue: number;
        maxValue: number;
      }
    > = {};

    for (const h of checkHistories) {
      const pond = farm.ponds.find((p) => p.id === h.pondId);
      for (const item of h.items) {
        const pCode = item.parameter.code;
        if (!paramStats[pCode]) {
          paramStats[pCode] = {
            paramName: item.parameter.name,
            unit: item.parameter.unit,
            values: [],
            warningCount: 0,
            avgValue: 0,
            minValue: item.value,
            maxValue: item.value,
          };
        }

        paramStats[pCode].values.push({
          date: h.checkDate.toISOString(),
          value: item.value,
          isWarning: item.isWarning,
          pondName: pond?.name || '',
        });

        if (item.isWarning) paramStats[pCode].warningCount++;
        if (item.value < paramStats[pCode].minValue) paramStats[pCode].minValue = item.value;
        if (item.value > paramStats[pCode].maxValue) paramStats[pCode].maxValue = item.value;
      }
    }

    // Tính trung bình
    for (const key of Object.keys(paramStats)) {
      const stat = paramStats[key];
      const sum = stat.values.reduce((s, v) => s + v.value, 0);
      stat.avgValue = stat.values.length > 0 ? Number((sum / stat.values.length).toFixed(2)) : 0;
    }

    return {
      farmId: farm.id,
      farmName: farm.name,
      analyzedDays: days,
      totalWaterChecks: checkHistories.length,
      warningChecks: checkHistories.filter((h) => h.hasWarning).length,
      parameterTrends: paramStats,
    };
  }
}

export const analyticsService = new AnalyticsService();
