import prisma from '../../database/prisma.service';

export class FarmRepository {
  async findAll(userId?: number, isSuperAdmin = false) {
    const where: any = { isActive: true };
    if (!isSuperAdmin && userId) {
      where.members = {
        some: {
          userId,
        },
      };
    }
    return prisma.farm.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        description: true,
        isActive: true,
        createdAt: true,
        members: {
          where: userId ? { userId } : undefined,
          select: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.farm.findUnique({
      where: { id },
      include: {
        ponds: {
          select: {
            id: true,
            code: true,
            name: true,
            pondType: true,
            totalBox: true,
            status: true,
          },
        },
      },
    });
  }

  async getOverviewStats(farmId: number) {
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const ponds = await prisma.pond.findMany({
      where: { farmId },
      include: {
        blocks: {
          include: {
            boxes: true,
          },
        },
      },
    });

    let totalBoxes = 0;
    let occupiedBoxes = 0;
    let emptyBoxes = 0;
    let maintenanceBoxes = 0;
    let cleaningBoxes = 0;

    for (const pond of ponds) {
      for (const block of pond.blocks) {
        for (const box of block.boxes) {
          totalBoxes++;
          if (box.status === 'OCCUPIED') occupiedBoxes++;
          else if (box.status === 'MAINTENANCE') maintenanceBoxes++;
          else if (box.status === 'CLEANING') cleaningBoxes++;
          else emptyBoxes++;
        }
      }
    }

    const activeBatchesCount = await prisma.stockImportBatch.count({
      where: { farmId, status: 'IN_PROGRESS' },
    });

    const warningsCount = await prisma.waterWarning.count({
      where: { farmId, isResolved: false },
    });

    const recentWarnings = await this.findWarnings(farmId);
    const recentOperations = await this.findOperations(farmId);

    const exports = await prisma.exportHistory.findMany({
      where: { farmId, status: 'DONE' },
      select: { totalAmount: true },
    });
    const monthlyExportRevenue = exports.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

    return {
      farm,
      statistics: {
        totalPonds: ponds.length,
        totalBoxes,
        occupiedBoxes,
        emptyBoxes,
        maintenanceBoxes,
        cleaningBoxes,
        activeBatchesCount,
        unresolvedWarningsCount: warningsCount,
        monthlyExportRevenue,
      },
      recentWarnings: recentWarnings.slice(0, 5),
      recentActivities: (recentOperations.data || []).slice(0, 5),

      // Mobile compatibility fields
      farm_id: farmId,
      total_pond: ponds.length,
      total_box: totalBoxes,
      occupied_box: occupiedBoxes,
      total_crab: occupiedBoxes,
      soft_shell_quantity: 0,
      dead_quantity: 0,
      warning_water_count: warningsCount,
      total: occupiedBoxes,
      total_dead: 0,
      total_est: occupiedBoxes,
    };
  }

  async findWarnings(farmId: number, fromDate?: string, toDate?: string) {
    const where: any = { farmId };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }
    const warnings = await prisma.waterWarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const pondIds = [...new Set(warnings.map((w) => w.pondId))];
    const ponds = await prisma.pond.findMany({
      where: { id: { in: pondIds } },
      select: { id: true, name: true, code: true },
    });
    const pondMap = new Map(ponds.map((p) => [p.id, p]));

    return warnings.map((w) => {
      const pond = pondMap.get(w.pondId);
      const pondName = pond ? `${pond.name} (${pond.code})` : `Ao #${w.pondId}`;
      return {
        id: w.id,
        farmId: w.farmId,
        pondId: w.pondId,
        pond_name: pondName,
        pondName,
        title: w.title,
        warning_name: w.title,
        warningName: w.title,
        message: w.message,
        note: w.message,
        severity: w.severity,
        isResolved: w.isResolved,
        is_resolved: w.isResolved,
        createdAt: w.createdAt.toISOString(),
        check_date: w.createdAt.toISOString(),
        checkDate: w.createdAt.toISOString(),
      };
    });
  }

  async findOperations(farmId: number, fromDate?: string, toDate?: string) {
    const dateFilter: any = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);
    const hasDate = Boolean(fromDate || toDate);

    // 1. Đếm số lần kiểm tra nước trong ngày
    const waterCheckCount = await prisma.waterCheckHistory.count({
      where: {
        pond: { farmId },
        ...(hasDate && { checkDate: dateFilter }),
      },
    });

    // 2. Đếm số lần kiểm tra & vệ sinh ao trong ngày
    const cleaningCount = await prisma.inspectionCleaningRecord.count({
      where: {
        pond: { farmId },
        ...(hasDate && { checkDate: dateFilter }),
      },
    });

    // 3. Đếm số lần cho ăn / tạt vi sinh trong ngày
    const feedingCount = await prisma.feedingRecord.count({
      where: {
        pond: { farmId },
        ...(hasDate && { recordedAt: dateFilter }),
      },
    });

    // 4. Lấy operation logs chi tiết
    const logs = await prisma.operationLog.findMany({
      where: {
        farmId,
        ...(hasDate && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });

    return {
      water_check: waterCheckCount,
      cleaning_inspection: cleaningCount,
      feeding_probiotic: feedingCount,
      other_work: logs.length,
      total: waterCheckCount + cleaningCount + feedingCount + logs.length,
      data: logs,
    };
  }

  async createFarm(data: { code: string; name: string; address?: string; description?: string }) {
    return prisma.farm.create({ data });
  }
}

export const farmRepository = new FarmRepository();
