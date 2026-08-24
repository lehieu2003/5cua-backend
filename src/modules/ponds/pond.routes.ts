import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { validate } from '../../common/middlewares/validate.middleware';
import { authGuard } from '../../common/guards/auth.guard';
import { roleGuard } from '../../common/guards/role.guard';
import { pondController } from './pond.controller';
import { CreatePondSchema } from './pond.dto';

const router = Router();

/**
 * @openapi
 * /api/v1/ponds:
 *   get:
 *     tags: [Ponds & Boxes]
 *     summary: Danh sách ao/nhà màng trong trang trại
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách ponds với thống kê hộp
 *   post:
 *     tags: [Ponds & Boxes]
 *     summary: Tạo ao mới kèm tự động sinh ma trận hộp (Chỉ Farm Owner, Manager)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePondRequest'
 *     responses:
 *       201:
 *         description: Tạo ao và sinh hộp thành công
 */
router.get('/api/v1/ponds', asyncHandler((req, res) => pondController.listPonds(req, res)));
router.post('/api/v1/ponds', authGuard, roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'), validate(CreatePondSchema), asyncHandler((req, res) => pondController.createPond(req, res)));

/**
 * @openapi
 * /api/v1/ponds/{id}:
 *   get:
 *     tags: [Ponds & Boxes]
 *     summary: Chi tiết một ao/nhà màng
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thông tin chi tiết ao
 */
router.get('/api/v1/ponds/:id', asyncHandler((req, res) => pondController.getPond(req, res)));

/**
 * @openapi
 * /api/v1/ponds/{id}/boxes:
 *   get:
 *     tags: [Ponds & Boxes]
 *     summary: Danh sách hộp trong ao, lọc theo Block/Row/Column/Status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: blockId
 *         schema:
 *           type: string
 *       - in: query
 *         name: row
 *         schema:
 *           type: integer
 *       - in: query
 *         name: column
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [empty, occupied]
 *     responses:
 *       200:
 *         description: Ma trận hộp theo block/row/column
 */
router.get('/api/v1/ponds/:id/boxes', asyncHandler((req, res) => pondController.listBoxes(req, res)));

export default router;
