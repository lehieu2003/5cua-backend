import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { inspectionController } from './inspection.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/inspections/cleaning:
 *   post:
 *     tags: [Inspection & Cleaning]
 *     summary: Ghi nhận kiểm tra vệ sinh ao — cua chết, cua lột vỏ
 *     description: |
 *       Ghi nhận kết quả kiểm tra vệ sinh định kỳ.
 *       Các hộp có `isDead: true` sẽ được giải phóng về trạng thái `EMPTY`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               warehouseId: { type: string, example: "1" }
 *               softShellQuantity: { type: string, example: "3" }
 *               deadQuantity: { type: string, example: "1" }
 *               shapeId: { type: integer }
 *               feedId: { type: integer }
 *               boxs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "12" }
 *                     isDead: { type: boolean, example: false }
 *                     isSoftShell: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Ghi nhận thành công
 */
router.post('/api/v1/inspections/cleaning', asyncHandler((req, res) => inspectionController.addCleanCheck(req, res)));

/**
 * @openapi
 * /api/v1/inspections/convert-crab:
 *   post:
 *     tags: [Inspection & Cleaning]
 *     summary: Chuyển đổi giống cua trong hộp
 *     description: |
 *       Đổi loại cua trong các hộp được chọn (VD: cua giống sang cua thịt).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               warehouseId: { type: string, example: "1" }
 *               productIdNew: { type: string, example: "72" }
 *               boxs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "5" }
 *     responses:
 *       200:
 *         description: Chuyển đổi thành công
 */
router.post('/api/v1/inspections/convert-crab', asyncHandler((req, res) => inspectionController.convertCrab(req, res)));

export default router;
