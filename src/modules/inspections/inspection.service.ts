import { inspectionRepository, InspectionRepository } from './inspection.repository';
import { CleanAndCheckDto, ConvertCrabDto } from './inspection.dto';

export class InspectionService {
  constructor(private readonly repo: InspectionRepository = inspectionRepository) {}

  async addCleanAndCheck(dto: CleanAndCheckDto) {
    const pondId = parseInt(dto.warehouseId, 10);
    const softShellQty = parseInt(dto.softShellQuantity || '0', 10);
    const deadQty = parseInt(dto.deadQuantity || '0', 10);

    const boxes = dto.boxs
      ? dto.boxs.map((b) => ({
          id: parseInt(b.id, 10),
          isDead: b.isDead,
          isSoftShell: b.isSoftShell,
        }))
      : [];

    const record = await this.repo.addCleanAndCheck({
      pondId,
      shapeId: dto.shapeId,
      feedId: dto.feedId,
      softShellQuantity: softShellQty,
      deadQuantity: deadQty,
      boxes,
    });

    return {
      status: 'success',
      record_id: record.id,
    };
  }

  async convertCrabType(dto: ConvertCrabDto) {
    const pondId = parseInt(dto.warehouseId, 10);
    const productIdNew = parseInt(dto.productIdNew, 10);
    const boxIds = dto.boxs.map((b) => parseInt(b.id, 10));

    await this.repo.convertCrabType({
      pondId,
      productIdNew,
      boxIds,
    });

    return {
      status: 'success',
      updated_boxes_count: boxIds.length,
    };
  }
}

export const inspectionService = new InspectionService();
