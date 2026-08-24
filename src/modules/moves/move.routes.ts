import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { moveController } from './move.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/moves:
 *   get:
 *     tags: [Move Box]
 *     summary: Lịch sử chuyển hộp
 *     responses:
 *       200:
 *         description: Danh sách lịch sử move
 *   post:
 *     tags: [Move Box]
 *     summary: Chuyển cua từ hộp này sang hộp khác
 *     description: |
 *       ACID Transaction: Hộp nguồn phải `OCCUPIED`, hộp đích phải `EMPTY`.
 *       Sau chuyển: hộp nguồn sang `EMPTY`, hộp đích sang `OCCUPIED`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MoveBoxRequest'
 *     responses:
 *       201:
 *         description: Chuyển hộp thành công
 *       400:
 *         description: Hộp nguồn trống hoặc hộp đích đã có cua
 */
router.get('/api/v1/moves', asyncHandler((req, res) => moveController.listMoves(req, res)));
router.post('/api/v1/moves', asyncHandler((req, res) => moveController.moveBox(req, res)));

/**
 * @openapi
 * /api/v1/moves/summary:
 *   get:
 *     tags: [Move Box]
 *     summary: Tổng số lượng và khối lượng đã chuyển
 *     responses:
 *       200:
 *         description: Thống kê tổng
 */
router.get('/api/v1/moves/summary', asyncHandler((req, res) => moveController.getSummary(req, res)));
router.get('/api/v1/moves/:id', asyncHandler((req, res) => moveController.getMoveDetail(req, res)));
router.patch('/api/v1/moves/:id/status', asyncHandler((req, res) => moveController.updateStatus(req, res)));

export default router;
