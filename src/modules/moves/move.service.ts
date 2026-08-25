import { moveRepository, MoveRepository } from './move.repository';
import { MoveBoxDto } from './move.dto';

export class MoveService {
  constructor(private readonly repo: MoveRepository = moveRepository) {}

  async createMove(dto: MoveBoxDto) {
    const moveLog = await this.repo.moveBox(dto);
    return {
      status: 'success',
      move_id: moveLog.id,
    };
  }

  async getMoveList(farmId?: number, offset = 0) {
    const moves = await this.repo.getMoveHistory(farmId, offset);
    return moves.map((m) => ({
      id: m.id,
      code: `MOVE-${m.id}`,
      unit_id: m.sourceBox.block.pond.id.toString(),
      obj_box_id: m.sourceBoxId.toString(),
      dest_box_id: m.destBoxId.toString(),
      source_box_code: m.sourceBox.code,
      dest_box_code: m.destBox.code,
      source_pond_id: m.sourceBox.block.pond.id,
      source_pond_name: `${m.sourceBox.block.pond.name} (${m.sourceBox.block.pond.code})`,
      source_block_name: m.sourceBox.block.name,
      dest_pond_id: m.destBox.block.pond.id,
      dest_pond_name: `${m.destBox.block.pond.name} (${m.destBox.block.pond.code})`,
      dest_block_name: m.destBox.block.name,
      move_at: m.movedAt.toISOString(),
      record_id: m.id.toString(),
      status: m.status.toLowerCase(),
      reason: m.reason || 'Sang ao chăm sóc',
    }));
  }

  async getSummary(farmId?: number) {
    return this.repo.getSummary(farmId);
  }

  async getMoveDetail(id: number) {
    const m = await this.repo.findById(id);
    if (!m) throw new Error('Không tìm thấy bản ghi chuyển hộp');
    return {
      id: m.id,
      code: `MOVE-${m.id}`,
      unit_id: m.sourceBox.block.pond.id.toString(),
      obj_box_id: m.sourceBoxId.toString(),
      dest_box_id: m.destBoxId.toString(),
      source_box_code: m.sourceBox.code,
      dest_box_code: m.destBox.code,
      source_pond_id: m.sourceBox.block.pond.id,
      source_pond_name: `${m.sourceBox.block.pond.name} (${m.sourceBox.block.pond.code})`,
      source_block_name: m.sourceBox.block.name,
      dest_pond_id: m.destBox.block.pond.id,
      dest_pond_name: `${m.destBox.block.pond.name} (${m.destBox.block.pond.code})`,
      dest_block_name: m.destBox.block.name,
      move_at: m.movedAt.toISOString(),
      record_id: m.id.toString(),
      status: m.status.toLowerCase(),
      reason: m.reason || 'Sang ao chăm sóc',
    };
  }

  async updateMoveStatus(id: number, status: string) {
    return this.repo.updateStatus(id, status.toUpperCase() as any);
  }
}

export const moveService = new MoveService();
