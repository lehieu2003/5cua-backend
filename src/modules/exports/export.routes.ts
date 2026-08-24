import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { authGuard } from '../../common/guards/auth.guard';
import { roleGuard } from '../../common/guards/role.guard';
import { exportController } from './export.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/exports:
 *   get:
 *     tags: [Export & Harvest]
 *     summary: Danh sách phiếu xuất bán cua
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Danh sách ExportHistory
 *   post:
 *     tags: [Export & Harvest]
 *     summary: Tạo phiếu xuất bán + giải phóng hộp về EMPTY (Chỉ Owner, Manager)
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       ACID Transaction: Tạo phiếu xuất, tính tổng tiền, và giải phóng tất cả hộp về `EMPTY`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               farmId: { type: integer, example: 1 }
 *               partnerName: { type: string, example: "Vựa Cua Ba Khía" }
 *               note: { type: string }
 *               boxes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     boxId: { type: integer, example: 5 }
 *                     productId: { type: integer, example: 72 }
 *                     weight: { type: number, example: 0.45 }
 *                     price: { type: number, example: 550000 }
 *     responses:
 *       201:
 *         description: Xuất bán thành công
 */
router.get('/api/v1/exports', asyncHandler((req, res) => exportController.listExports(req, res)));
router.post('/api/v1/exports', authGuard, roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'), asyncHandler((req, res) => exportController.createExport(req, res)));

/**
 * @openapi
 * /api/v1/exports/summary:
 *   get:
 *     tags: [Export & Harvest]
 *     summary: Tổng số lượng và khối lượng xuất bán
 *     responses:
 *       200:
 *         description: Thống kê tổng xuất
 */
router.get('/api/v1/exports/summary', asyncHandler((req, res) => exportController.getSummary(req, res)));
router.get('/api/v1/exports/:id', asyncHandler((req, res) => exportController.getDetail(req, res)));
router.patch('/api/v1/exports/:id/status', asyncHandler((req, res) => exportController.updateStatus(req, res)));

export default router;
