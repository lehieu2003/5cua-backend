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

  async addWaterCheck(dto: any) {
    const rawPondId = dto.pondId || dto.warehouseId || dto.pond_id || dto.warehouse_id;
    if (!rawPondId) {
      throw AppError.badRequest('Vui lòng chọn ao/kho nuôi cần đo nước');
    }
    const pondId = parseInt(rawPondId, 10);
    const params = await this.repo.getParameters();
    const paramById = new Map(params.map((p) => [p.id, p]));
    const paramByCode = new Map(params.map((p) => [p.code.toLowerCase(), p]));

    const checkList: any[] = dto.items || dto.waterChecks || dto.water_checks || [];
    let hasWarning = false;
    const warningsToCreate: Array<{ title: string; message: string; severity: string }> = [];

    const items = checkList.map((chk: any) => {
      let p = chk.parameterId ? paramById.get(chk.parameterId) : undefined;
      if (!p && chk.parameterCode) {
        p = paramByCode.get(String(chk.parameterCode).toLowerCase());
      }

      if (!p && !chk.parameterId) {
        throw AppError.badRequest('Thông số đo nước không tồn tại hoặc không hợp lệ');
      }

      let isWarn = false;
      const paramId = p ? p.id : chk.parameterId;
      const val = parseFloat(chk.value);

      if (p) {
        const isCritical =
          (p.minCritical !== undefined && val < p.minCritical) ||
          (p.maxCritical !== undefined && val > p.maxCritical);

        if (val < p.minNormal || val > p.maxNormal) {
          isWarn = true;
          hasWarning = true;
          warningsToCreate.push({
            title: `Cảnh báo ${p.name}`,
            message: `${p.name} hiện tại là ${val} ${p.unit} (ngưỡng an toàn ${p.minNormal} - ${p.maxNormal} ${p.unit})`,
            severity: isCritical ? 'CRITICAL' : 'WARNING',
          });
        }
      }

      return {
        parameterId: paramId,
        value: val,
        isWarning: isWarn,
      };
    });

    const record = await this.repo.addWaterCheck({
      pondId,
      hasWarning,
      note: dto.note,
      items,
      warnings: warningsToCreate,
    });

    return {
      status: 'success',
      has_warning: hasWarning,
      record_id: record.id,
      warnings_created: warningsToCreate.length,
    };
  }

  async getWaterHistory(pondId: number, offset = 0) {
    const histories = await this.repo.getCheckHistoryByPond(pondId, offset);

    return histories.map((h) => {
      const paramValues: Record<string, number> = {};
      for (const it of h.items) {
        const code = it.parameter?.code?.toLowerCase() || '';
        paramValues[code] = it.value;
      }

      return {
        id: h.id,
        pondId: h.pondId,
        pondName: h.pond?.name || `Ao #${h.pondId}`,
        measuredBy: 'Kỹ thuật viên',
        measuredAt: h.checkDate.toISOString(),
        check_date: h.checkDate.toISOString(),
        hasWarning: h.hasWarning,
        status_check: h.hasWarning ? 'warning' : 'good',
        note: h.note,
        ph: paramValues['ph'],
        temperature: paramValues['temp'] ?? paramValues['temperature'],
        salinity: paramValues['salinity'],
        do: paramValues['do'],
        nh3: paramValues['nh3'],
        no2: paramValues['no2'],
        alkalinity: paramValues['alkalinity'],
        items: h.items.map((it) => ({
          id: it.id,
          parameterId: it.parameterId,
          parameterCode: it.parameter.code,
          parameterName: it.parameter.name,
          value: it.value,
          unit: it.parameter.unit,
          isWarning: it.isWarning,
        })),
        water_check_history_datas: h.items.map((it) => ({
          id: it.id,
          water_parameters_name: it.parameter.name,
          water_parameters_value_name: `${it.value} ${it.parameter.unit}`,
          obtain: it.isWarning ? '0' : '1',
        })),
      };
    });
  }

  async getWarningCount(farmId: number) {
    return this.repo.getWarningCount(farmId);
  }
}

export const waterService = new WaterService();
