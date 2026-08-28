import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { authGuard } from '../../common/guards/auth.guard';
import { reportsController } from './reports.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/reports/export/batches:
 *   get:
 *     tags: [Analytics & Reports]
 *     summary: Xuất file Excel báo cáo theo dõi các lô nuôi và tỷ lệ sống
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: File Excel (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 */
router.get(
  '/api/v1/reports/export/batches',
  authGuard,
  asyncHandler((req, res) => reportsController.exportBatches(req, res))
);

/**
 * @openapi
 * /api/v1/reports/export/water-history:
 *   get:
 *     tags: [Analytics & Reports]
 *     summary: Xuất file Excel nhật ký đo thông số môi trường nước kèm cảnh báo
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema: { type: integer }
 *       - in: query
 *         name: pondId
 *         schema: { type: integer }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: File Excel
 */
router.get(
  '/api/v1/reports/export/water-history',
  authGuard,
  asyncHandler((req, res) => reportsController.exportWaterHistory(req, res))
);

/**
 * @openapi
 * /api/v1/reports/export/feeding-history:
 *   get:
 *     tags: [Analytics & Reports]
 *     summary: Xuất file Excel nhật ký cho ăn & bổ sung vi sinh/chế phẩm
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema: { type: integer }
 *       - in: query
 *         name: pondId
 *         schema: { type: integer }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: File Excel
 */
router.get(
  '/api/v1/reports/export/feeding-history',
  authGuard,
  asyncHandler((req, res) => reportsController.exportFeedingHistory(req, res))
);

/**
 * @openapi
 * /api/v1/reports/export/sales-history:
 *   get:
 *     tags: [Analytics & Reports]
 *     summary: Xuất file Excel lịch sử xuất bán cua thương phẩm
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema: { type: integer }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: File Excel
 */
router.get(
  '/api/v1/reports/export/sales-history',
  authGuard,
  asyncHandler((req, res) => reportsController.exportSalesHistory(req, res))
);

export default router;
