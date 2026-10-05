import prisma from '../../database/prisma.service';
import { pondRepository, PondRepository } from './pond.repository';
import { CreatePondDto, FilterBoxDto } from './pond.dto';
import { AppError } from '../../common/errors/app.error';

export class PondService {
  constructor(private readonly repo: PondRepository = pondRepository) {}

  async getPondsByFarm(farmId: number, keyword?: string) {
    const ponds = await this.repo.findByFarmId(farmId, keyword);

    // Lần đo nước / kiểm tra vệ sinh mới nhất của từng ao (mobile đọc 2 field này)
    const pondIds = ponds.map((p) => p.id);
    const lastChecks = pondIds.length
      ? await prisma.waterCheckHistory.findMany({
          where: { pondId: { in: pondIds } },
          orderBy: [{ pondId: 'asc' }, { checkDate: 'desc' }],
          distinct: ['pondId'],
        })
      : [];
    const lastCheckByPond = new Map(
      lastChecks.map((w) => [w.pondId, w] as const)
    );

    const lastCleanings = pondIds.length
      ? await prisma.inspectionCleaningRecord.findMany({
          where: { pondId: { in: pondIds } },
          orderBy: [{ pondId: 'asc' }, { checkDate: 'desc' }],
          distinct: ['pondId'],
        })
      : [];
    const lastCleaningByPond = new Map(
      lastCleanings.map((r) => [r.pondId, r] as const)
    );
    const shapeIds = [...new Set(lastCleanings.map((r) => r.shapeStatusId).filter((x): x is number => x != null))];
    const feedIds = [...new Set(lastCleanings.map((r) => r.feedStatusId).filter((x): x is number => x != null))];
    const shapes = shapeIds.length ? await prisma.shapeStatusMaster.findMany({ where: { id: { in: shapeIds } } }) : [];
    const feeds = feedIds.length ? await prisma.feedingStatusMaster.findMany({ where: { id: { in: feedIds } } }) : [];
    const shapeById = new Map(shapes.map((s) => [s.id, s]));
    const feedById = new Map(feeds.map((s) => [s.id, s]));

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

      const lastCheck = lastCheckByPond.get(p.id);
      const lastCleaning = lastCleaningByPond.get(p.id);
      const cleaningShape = lastCleaning?.shapeStatusId ? shapeById.get(lastCleaning.shapeStatusId) : null;
      const cleaningFeed = lastCleaning?.feedStatusId ? feedById.get(lastCleaning.feedStatusId) : null;

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
        last_water_check: lastCheck
          ? {
              check_date: lastCheck.checkDate.toISOString(),
              // Mobile water_tank_card so sánh === 'safe' để hiện icon an toàn
              status_check: lastCheck.hasWarning ? 'warning' : 'safe',
            }
          : null,
        last_inspection_cleaning_check: lastCleaning
          ? {
              id: lastCleaning.id,
              check_date: lastCleaning.checkDate.toISOString(),
              shape: cleaningShape ? { id: cleaningShape.id, name: cleaningShape.name } : null,
              feed: cleaningFeed ? { id: cleaningFeed.id, name: cleaningFeed.name } : null,
              soft_shell: lastCleaning.softShellQuantity,
              dead_quantity: lastCleaning.deadQuantity,
              stock_quantity: occupiedCount,
            }
          : null,
      };
    });
  }

  async getPondDetail(pondId: number) {
    const pond = await this.repo.findById(pondId);
    if (!pond) throw AppError.notFound('Không tìm thấy thông tin ao nuôi');

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
    const code = dto.code?.trim() || `POND-${Date.now()}`;
    return this.repo.createPondWithGrid({ ...dto, code });
  }

  async filterBoxes(dto: FilterBoxDto) {
    const boxes = await this.repo.filterBoxes(dto);
    return boxes.map((box) => {
      // 1 hộp = 1 con cua: trọng lượng ước tính từ khối lượng trung bình của đợt nhập
      const avgWeight =
        box.batch && box.batch.initialQuantity > 0
          ? Number((box.batch.initialWeight / box.batch.initialQuantity).toFixed(2))
          : null;
      return {
        id: box.id,
        code: box.code,
        name: box.code,
        block_id: box.blockId,
        posz: box.block.posZ,
        row: box.row,
        column: box.column,
        status: box.status,
        product_id: box.productId,
        product_name: box.product?.name || '',
        feed_id: box.feedStatusId,
        shape_id: box.shapeStatusId,
        batch_id: box.batchId,
        batch_code: box.batch?.code || null,
        occupied_at: box.occupiedAt ? box.occupiedAt.toISOString() : null,
        crab_code: box.status === 'OCCUPIED' ? `CUA-${box.id}` : null,
        crab_type: box.product?.name || null,
        current_weight: box.status === 'OCCUPIED' ? avgWeight : null,
      };
    });
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
