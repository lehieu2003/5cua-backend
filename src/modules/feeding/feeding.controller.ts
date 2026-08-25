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
      const categoryType = (req.query.categoryType as string) || (req.query.category as string) || undefined;
      const products = await this.service.getFeedProducts(categoryType);
      return ResponseUtil.success(res, products);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/feeding/categories
   */
  async listCategories(req: Request, res: Response) {
    try {
      const categories = await this.service.getCategories();
      return ResponseUtil.success(res, categories);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: POST /api/v1/feeding/categories
   */
  async createCategory(req: Request, res: Response) {
    try {
      const { code, name, type } = req.body;
      if (!code || !name) {
        return ResponseUtil.error(res, 'Mã và tên danh mục là bắt buộc', 400);
      }
      const cat = await this.service.createCategory({ code, name, type: type || 'type' });
      return ResponseUtil.success(res, cat, 'Tạo danh mục thành công', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/feeding/products/:id
   */
  async getProduct(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await this.service.getProduct(id);
      return ResponseUtil.success(res, product);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 404);
    }
  }

  /**
   * REST: POST /api/v1/feeding/products
   */
  async createProduct(req: Request, res: Response) {
    try {
      const { categoryId, category_id, code, name, uom, price, description, isActive } = req.body;
      const catId = parseInt(categoryId || category_id, 10);
      if (!catId || !code || !name) {
        return ResponseUtil.error(res, 'Danh mục, mã và tên sản phẩm/giống cua là bắt buộc', 400);
      }

      const product = await this.service.createProduct({
        categoryId: catId,
        code,
        name,
        uom: uom || 'con',
        price: price ? parseFloat(price) : 0,
        description,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      return ResponseUtil.success(res, product, 'Tạo sản phẩm/giống cua thành công', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  /**
   * REST: PUT /api/v1/feeding/products/:id
   */
  async updateProduct(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { categoryId, category_id, code, name, uom, price, description, isActive } = req.body;
      const catId = categoryId || category_id ? parseInt(categoryId || category_id, 10) : undefined;

      const product = await this.service.updateProduct(id, {
        categoryId: catId,
        code,
        name,
        uom,
        price: price !== undefined ? parseFloat(price) : undefined,
        description,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      });

      return ResponseUtil.success(res, product, 'Cập nhật thành công');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  /**
   * REST: DELETE /api/v1/feeding/products/:id
   */
  async deleteProduct(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      await this.service.deleteProduct(id);
      return ResponseUtil.success(res, null, 'Xóa/Hủy kích hoạt sản phẩm thành công');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  async getFeedingStatuses(req: Request, res: Response) {
    try {
      const statuses = await this.service.getFeedingStatuses();
      return ResponseUtil.success(res, statuses);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  async getShapeStatuses(req: Request, res: Response) {
    try {
      const shapes = await this.service.getShapeStatuses();
      return ResponseUtil.success(res, shapes);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const feedingController = new FeedingController();

