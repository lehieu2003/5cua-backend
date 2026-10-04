import prisma from '../../database/prisma.service';
import { farmRepository, FarmRepository } from './farm.repository';
import { CreateFarmDto } from './farm.dto';
import { AppError } from '../../common/errors/app.error';

export class FarmService {
  constructor(private readonly repo: FarmRepository = farmRepository) {}

  async getAllFarms(userId?: number, role?: string, memberType?: string) {
    const isSuperAdmin = role === 'SUPER_ADMIN' || memberType === 'admin' || memberType === 'ADMIN';
    return this.repo.findAll(userId, isSuperAdmin);
  }

  async getFarmDetail(farmId: number) {
    const farm = await this.repo.findById(farmId);
    if (!farm) throw AppError.notFound('Trang trại không tồn tại');
    return farm;
  }

  async getFarmOverview(farmId: number) {
    return this.repo.getOverviewStats(farmId);
  }

  async getFarmWarnings(farmId: number, fromDate?: string, toDate?: string) {
    return this.repo.findWarnings(farmId, fromDate, toDate);
  }

  async getFarmOperations(farmId: number, fromDate?: string, toDate?: string) {
    return this.repo.findOperations(farmId, fromDate, toDate);
  }

  /**
   * GET /farms/:id/tasks — mobile home widget gọi theo taskType
   * (WATER_CHECK / CLEANING_INSPECTION / FEEDING...). Dữ liệu thật từ
   * OperationLog; FEEDING hiện không có log nên trả rỗng.
   */
  async getFarmTasks(farmId: number, taskType?: string, _keyword?: string, offset = 0) {
    const typeMap: Record<string, string[]> = {
      WATER_CHECK: ['WATER_CHECK'],
      CLEANING_INSPECTION: ['INSPECTION_CLEANING'],
      FEEDING: ['FEEDING'],
      MOVE: ['MOVE_BOX', 'UPDATE_MOVE_STATUS'],
      EXPORT: ['EXPORT_HARVEST', 'UPDATE_EXPORT_STATUS'],
      BATCH: ['CREATE_BATCH', 'UPDATE_BATCH_STATUS', 'ASSIGN_BATCH_DISTRIBUTION'],
      CONVERT_CRAB: ['CONVERT_CRAB'],
    };
    const actions = taskType ? typeMap[taskType.toUpperCase().trim()] : undefined;
    const logs = await prisma.operationLog.findMany({
      where: {
        farmId,
        ...(actions && { action: { in: actions } }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: 20,
    });
    return logs.map((log) => ({
      id: log.id,
      name: log.action,
      content:
        log.details && typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details ?? ''),
      created_at: log.createdAt.toISOString(),
      // JobModel của mobile parse deadline_time bằng DateTime.parse (không nhận null)
      deadline_time: new Date(log.createdAt.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
      status: { code: 'OT_001' },
    }));
  }



  async createFarm(dto: CreateFarmDto) {
    return this.repo.createFarm(dto);
  }
}

export const farmService = new FarmService();
