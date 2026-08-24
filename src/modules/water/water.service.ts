import { waterRepository, WaterRepository } from './water.repository';
import { AddWaterCheckDto } from './water.dto';

export class WaterService {
  constructor(private readonly repo: WaterRepository = waterRepository) {}

  async getWaterParameters() {
    const params = await this.repo.getParameters();

    return params.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      ordinal: p.ordinal,
      show: p.isShow,
      water_parameter_value_ids: [
        {
          id: p.id,
          name: `${p.minNormal} - ${p.maxNormal} ${p.unit}`,
          obtain: '1',
        },
      ],
    }));
  }

  async addWaterCheck(dto: AddWaterCheckDto) {
    const pondId = parseInt(dto.warehouseId, 10);
    const params = await this.repo.getParameters();
    const paramMap = new Map(params.map((p) => [p.id, p]));

    let hasWarning = false;
    const items = dto.waterChecks.map((chk) => {
      const p = paramMap.get(chk.parameterId);
      let isWarn = false;
      if (p) {
        if (chk.value < p.minNormal || chk.value > p.maxNormal) {
          isWarn = true;
          hasWarning = true;
        }
      }
      return {
        parameterId: chk.parameterId,
        value: chk.value,
        isWarning: isWarn,
      };
    });

    const record = await this.repo.addWaterCheck({
      pondId,
      hasWarning,
      note: dto.note,
      items,
    });

    return {
      status: 'success',
      has_warning: hasWarning,
      record_id: record.id,
    };
  }

  async getWaterHistory(pondId: number, offset = 0) {
    const histories = await this.repo.getCheckHistoryByPond(pondId, offset);

    return histories.map((h) => ({
      id: h.id,
      check_date: h.checkDate.toISOString(),
      status_check: h.hasWarning ? 'warning' : 'good',
      water_check_history_datas: h.items.map((it) => ({
        id: it.id,
        water_parameters_name: it.parameter.name,
        water_parameters_value_name: `${it.value} ${it.parameter.unit}`,
        obtain: it.isWarning ? '0' : '1',
      })),
    }));
  }

  async getWarningCount(farmId: number) {
    return this.repo.getWarningCount(farmId);
  }
}

export const waterService = new WaterService();
