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
}

export const moveService = new MoveService();
