import { farmRepository, FarmRepository } from './farm.repository';
import { CreateFarmDto } from './farm.dto';

export class FarmService {
  constructor(private readonly repo: FarmRepository = farmRepository) {}

  async getAllFarms() {
    return this.repo.findAll();
  }

  async getFarmDetail(farmId: number) {
    const farm = await this.repo.findById(farmId);
    if (!farm) throw new Error('Trang trại không tồn tại');
    return farm;
  }

  async getFarmOverview(farmId: number) {
    return this.repo.getOverviewStats(farmId);
  }

  async createFarm(dto: CreateFarmDto) {
    return this.repo.createFarm(dto);
  }
}

export const farmService = new FarmService();
