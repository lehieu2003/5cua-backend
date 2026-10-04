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



  async createFarm(dto: CreateFarmDto) {
    return this.repo.createFarm(dto);
  }
}

export const farmService = new FarmService();
