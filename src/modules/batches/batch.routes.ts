import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { authGuard } from '../../common/guards/auth.guard';
import { roleGuard } from '../../common/guards/role.guard';
import { batchController } from './batch.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/batches:
 *   get:
 *     tags: [Import Batches]
 *     summary: Danh sách đợt nhập cua
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: importDateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: importDateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Danh sách đợt nhập kèm thông tin ảnh
 *   post:
 *     tags: [Import Batches]
 *     summary: Tạo đợt nhập mới + phân bổ hộp nuôi (Chỉ Owner, Manager)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Tạo đợt nhập cua và gán cua vào các hộp được chọn.
 *       Tất cả hộp được chọn sẽ chuyển sang trạng thái `OCCUPIED`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBatchRequest'
 *     responses:
 *       201:
 *         description: Tạo đợt nhập thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.get('/api/v1/batches', asyncHandler((req, res) => batchController.listBatches(req, res)));
router.get('/api/v1/batches/summary', asyncHandler((req, res) => batchController.getBatchesSummary(req, res)));
router.post('/api/v1/batches', authGuard, roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'), asyncHandler((req, res) => batchController.createBatch(req, res)));
router.get('/api/v1/batches/:id', asyncHandler((req, res) => batchController.getBatchDetail(req, res)));
router.patch('/api/v1/batches/:id/status', asyncHandler((req, res) => batchController.updateBatchStatus(req, res)));

export default router;
