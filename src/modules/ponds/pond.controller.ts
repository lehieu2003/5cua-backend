import { Request, Response } from 'express';
import { pondService, PondService } from './pond.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class PondController {
  constructor(private readonly service: PondService = pondService) {}

  /**
   * REST: GET /api/v1/ponds
   */
  async listPonds(req: Request, res: Response) {
    try {
      const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : 1;
      const keyword = req.query.keyword as string | undefined;

      const ponds = await this.service.getPondsByFarm(farmId, keyword);
      return ResponseUtil.success(res, ponds);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/ponds/:id
   */
  async getPond(req: Request, res: Response) {
    try {
      const pondId = parseInt(req.params.id, 10);
      const pond = await this.service.getPondDetail(pondId);
      return ResponseUtil.success(res, pond);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/ponds/:id/boxes
   */
  async listBoxes(req: Request, res: Response) {
    try {
      const pondId = parseInt(req.params.id, 10);
      const { blockId, row, column, status, productId, feedId, shapeId } = req.query;

      const boxes = await this.service.filterBoxes({
        pondId,
        blockId: blockId as string | undefined,
        row: row ? parseInt(row as string, 10) : undefined,
        column: column ? parseInt(column as string, 10) : undefined,
        status: status as 'occupied' | 'empty' | undefined,
        productId: productId ? parseInt(productId as string, 10) : undefined,
        feedId: feedId ? parseInt(feedId as string, 10) : undefined,
        shapeId: shapeId ? parseInt(shapeId as string, 10) : undefined,
      });

      return ResponseUtil.success(res, boxes);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: POST /api/v1/ponds
   */
  async createPond(req: Request, res: Response) {
    try {
      const pond = await this.service.createPond(req.body);
      return ResponseUtil.success(res, pond, MESSAGES.POND.CREATE_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const pondController = new PondController();
