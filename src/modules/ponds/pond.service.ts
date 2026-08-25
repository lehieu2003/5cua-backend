import { pondRepository, PondRepository } from './pond.repository';
import { CreatePondDto, FilterBoxDto } from './pond.dto';

export class PondService {
  constructor(private readonly repo: PondRepository = pondRepository) {}

  async getPondsByFarm(farmId: number, keyword?: string) {
    const ponds = await this.repo.findByFarmId(farmId, keyword);

    // Chuyển đổi sang format PondModel hoàn chỉnh 100% khớp với Flutter Dart
    return ponds.map((p) => {
      let occupiedCount = 0;
      const productQuantMap = new Map<
        number,
        { id: number; name: string; count: number }
      >();

      for (const block of p.blocks) {
        for (const box of block.boxes) {
          if (box.status === 'OCCUPIED') {
            occupiedCount++;
            if (box.productId && box.product) {
              const current = productQuantMap.get(box.productId) || {
                id: box.productId,
                name: box.product.name,
                count: 0,
              };
              current.count++;
              productQuantMap.set(box.productId, current);
            }
          }
        }
      }

      const estQuant = Array.from(productQuantMap.values()).map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quant: item.count,
      }));

      const percentAchieved =
        p.totalBox > 0 ? (occupiedCount / p.totalBox) * 100 : 0;

      return {
        id: p.id,
        location_id: p.id,
        name: p.name,
        code: p.code,
        pond_type: p.pondType || 'box_grid',
        num_block: p.numBlock,
        num_row: p.numRow,
        num_column: p.numColumn,
        total_box: p.totalBox,
        pond_status: p.status,
        farm_id: { id: p.farm.id, name: p.farm.name },
        total_qty_on_hand_cus: occupiedCount,
        total_crab: occupiedCount,
        percent_achieved: percentAchieved,
        est_quant: estQuant,
        dead_quant: [],
        sell_quant: [],
        status_data: [],
        volume: p.volume,
        area: p.area,
      };
    });
  }

  async getPondDetail(pondId: number) {
    const pond = await this.repo.findById(pondId);
    if (!pond) throw new Error('Không tìm thấy thông tin ao nuôi');

    let occupiedCount = 0;
    const productQuantMap = new Map<
      number,
      { id: number; name: string; count: number }
    >();

    for (const block of pond.blocks) {
      for (const box of block.boxes) {
        if (box.status === 'OCCUPIED') {
          occupiedCount++;
          if (box.productId && box.product) {
            const current = productQuantMap.get(box.productId) || {
              id: box.productId,
              name: box.product.name,
              count: 0,
            };
            current.count++;
            productQuantMap.set(box.productId, current);
          }
        }
      }
    }

    const estQuant = Array.from(productQuantMap.values()).map((item) => ({
      product_id: item.id,
      product_name: item.name,
      quant: item.count,
    }));

    return {
      id: pond.id,
      location_id: pond.id,
      name: pond.name,
      code: pond.code,
      pondType: pond.pondType || 'box_grid',
      pond_type: pond.pondType || 'box_grid',
      num_block: pond.numBlock,
      num_row: pond.numRow,
      num_column: pond.numColumn,
      total_box: pond.totalBox,
      pond_status: pond.status,
      farm_id: { id: pond.farm.id, name: pond.farm.name },
      total_qty_on_hand_cus: occupiedCount,
      total_crab: occupiedCount,
      est_quant: estQuant,
      volume: pond.volume,
      area: pond.area,
    };
  }

  async createPond(dto: CreatePondDto) {
    return this.repo.createPondWithGrid(dto);
  }

  async filterBoxes(dto: FilterBoxDto) {
    const boxes = await this.repo.filterBoxes(dto);
    return boxes.map((box) => ({
      id: box.id,
      code: box.code,
      name: box.code,
      block_id: box.blockId,
      posz: box.block.posZ,
      row: box.row,
      column: box.column,
      status: box.status.toLowerCase(),
      product_id: box.productId,
      product_name: box.product?.name || '',
      feed_id: box.feedStatusId,
      shape_id: box.shapeStatusId,
    }));
  }

  async updatePond(pondId: number, data: any) {
    return this.repo.updatePond(pondId, {
      name: data.name,
      code: data.code,
      volume: data.volume ? parseFloat(data.volume) : undefined,
      area: data.area ? parseFloat(data.area) : undefined,
      status: data.status || data.pond_status,
    });
  }
}

export const pondService = new PondService();
