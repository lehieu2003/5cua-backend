import { Request, Response } from 'express';
import { feedingService, FeedingService } from './feeding.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class FeedingController {
  constructor(private readonly service: FeedingService = feedingService) {}

  /**
   * REST: GET /api/v1/feeding
   */
  async listFeeding(req: Request, res: Response) {
    try {
      const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : 1;
      const actionType = (req.query.actionType as 'feeding' | 'probiotic') || 'feeding';

      const data = await this.service.getFeedingHistory(farmId, actionType);
      return ResponseUtil.success(res, { total: data.length, data });
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: POST /api/v1/feeding
   */
  async createFeeding(req: Request, res: Response) {
    try {
      const body = req.body;
      const actionType = body.actionType || body.action_type || 'feeding';

      const result = await this.service.createFeedingRecord({
        actionType,
        pondId: parseInt(body.pondId || body.pond_id, 10),
        srcId: body.srcId || body.src_id ? parseInt(body.srcId || body.src_id, 10) : 1,
        items: body.items || [],
        note: body.note,
      });

      const message = actionType === 'probiotic'
        ? MESSAGES.FEEDING.PROBIOTIC_SUCCESS
        : MESSAGES.FEEDING.CREATE_SUCCESS;

      return ResponseUtil.success(res, result, message, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/feeding/products
   */
  async listProducts(req: Request, res: Response) {
    try {
      const categoryType = (req.query.categoryType as string) || 'feed';
      const products = await this.service.getFeedProducts(categoryType);
      return ResponseUtil.success(res, products);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const feedingController = new FeedingController();
