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

  async getMoveList() {
    const moves = await this.repo.getMoveHistory();
    return moves.map((m) => ({
      id: m.id,
      code: `MOVE-${m.id}`,
      unit_id: m.sourceBox.block.pond.id.toString(),
      obj_box_id: m.sourceBoxId.toString(),
      dest_box_id: m.destBoxId.toString(),
      move_at: m.movedAt.toISOString(),
      record_id: m.id.toString(),
      status: m.status.toLowerCase(),
    }));
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
      move_at: m.movedAt.toISOString(),
      record_id: m.id.toString(),
      status: m.status.toLowerCase(),
      reason: m.reason || '',
    };
  }

  async updateMoveStatus(id: number, status: string) {
    return this.repo.updateStatus(id, status.toUpperCase() as any);
  }
}

export const moveService = new MoveService();
