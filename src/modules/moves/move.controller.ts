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
  async listMoves(req: Request, res: Response) {
    try {
      const farmId = (req.query.farmId || req.query.farm_id) ? parseInt((req.query.farmId || req.query.farm_id) as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const moves = await this.service.getMoveList(farmId, offset);
      return ResponseUtil.success(res, moves);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/moves/summary
   */
  async getSummary(req: Request, res: Response) {
    try {
      const farmId = (req.query.farmId || req.query.farm_id) ? parseInt((req.query.farmId || req.query.farm_id) as string, 10) : undefined;
      const summary = await this.service.getSummary(farmId);
      return ResponseUtil.success(res, summary);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/moves/:id
   */
  async getMoveDetail(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const detail = await this.service.getMoveDetail(id);
      return ResponseUtil.success(res, detail);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: PATCH /api/v1/moves/:id/status
   */
  async updateStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body;
      const result = await this.service.updateMoveStatus(id, status);
      return ResponseUtil.success(res, result);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const moveController = new MoveController();
