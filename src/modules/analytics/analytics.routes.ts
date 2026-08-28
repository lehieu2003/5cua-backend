import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { authGuard } from '../../common/guards/auth.guard';
import { analyticsController } from './analytics.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/analytics/farms/{farmId}/fcr:
 *   get:
 *     tags: [Analytics & Reports]
 *     summary: Phân tích chỉ số FCR, hiệu quả tiêu thụ thức ăn và tăng trọng
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Báo cáo FCR và tài chính thành công
 */
router.get(
  '/api/v1/analytics/farms/:farmId/fcr',
  authGuard,
  asyncHandler((req, res) => analyticsController.getFarmFcr(req, res))
);

/**
 * @openapi
 * /api/v1/analytics/batches/{batchId}:
 *   get:
 *     tags: [Analytics & Reports]
 *     summary: Phân tích chuyên sâu hiệu quả nuôi theo từng lô (Tỷ lệ sống, hao hụt, chu kỳ ngày nuôi)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Phân tích hiệu quả lô nuôi thành công
 */
router.get(
  '/api/v1/analytics/batches/:batchId',
  authGuard,
  asyncHandler((req, res) => analyticsController.getBatchAnalytics(req, res))
);

/**
 * @openapi
 * /api/v1/analytics/farms/{farmId}/water-trends:
 *   get:
 *     tags: [Analytics & Reports]
 *     summary: Thống kê xu hướng biến động chỉ số nước (DO, pH, Độ mặn) và tần suất cảnh báo
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Thống kê xu hướng môi trường thành công
 */
router.get(
  '/api/v1/analytics/farms/:farmId/water-trends',
  authGuard,
  asyncHandler((req, res) => analyticsController.getWaterTrends(req, res))
);

export default router;
