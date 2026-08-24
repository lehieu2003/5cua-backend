import { Request, Response } from 'express';
import { moveService, MoveService } from './move.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class MoveController {
  constructor(private readonly service: MoveService = moveService) {}

  /**
   * REST: POST /api/v1/moves
   */
  async moveBox(req: Request, res: Response) {
    try {
      const body = req.body;
      const result = await this.service.createMove({
        sourceBoxId: parseInt(body.sourceBoxId || body.source_box_id, 10),
        destBoxId: parseInt(body.destBoxId || body.dest_box_id, 10),
        reason: body.reason,
      });
      return ResponseUtil.success(res, result, MESSAGES.MOVE.MOVE_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/moves
   */
  async listMoves(_req: Request, res: Response) {
    try {
      const moves = await this.service.getMoveList();
      return ResponseUtil.success(res, moves);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/moves/summary
   */
  async getSummary(_req: Request, res: Response) {
    return ResponseUtil.success(res, {
      total_quantity: 120,
      total_weight: 45.8,
    });
  }
}

export const moveController = new MoveController();
