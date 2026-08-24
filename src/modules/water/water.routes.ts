import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { waterController } from './water.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/water/parameters:
 *   get:
 *     tags: [Water Monitoring]
 *     summary: Danh sách thông số nước cần đo
 *     description: Trả về danh sách pH, độ mặn, nhiệt độ, DO, NH3, NO2, kiềm với ngưỡng an toàn.
 *     responses:
 *       200:
 *         description: Danh sách WaterParameter
 */
router.get('/api/v1/water/parameters', asyncHandler((req, res) => waterController.listParameters(req, res)));

/**
 * @openapi
 * /api/v1/water/checks:
 *   get:
 *     tags: [Water Monitoring]
 *     summary: Lịch sử đo nước theo ao
 *     parameters:
 *       - in: query
 *         name: pondId
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lịch sử đo nước với trạng thái good/warning
 *   post:
 *     tags: [Water Monitoring]
 *     summary: Ghi nhận kết quả đo nước + tự động cảnh báo
 *     description: |
 *       Hệ thống tự động so sánh từng giá trị với ngưỡng minNormal/maxNormal.
 *       Nếu vượt ngưỡng -> isWarning: true và hasWarning: true trên bản ghi.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddWaterCheckRequest'
 *     responses:
 *       201:
 *         description: Ghi nhận thành công, trả về has_warning
 */
router.get('/api/v1/water/checks', asyncHandler((req, res) => waterController.listHistory(req, res)));
router.post('/api/v1/water/checks', asyncHandler((req, res) => waterController.addCheck(req, res)));

/**
 * @openapi
 * /api/v1/water/warnings/count:
 *   get:
 *     tags: [Water Monitoring]
 *     summary: Số cảnh báo nước chưa xử lý trong trang trại
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Số lượng cảnh báo
 */
router.get('/api/v1/water/warnings/count', asyncHandler((req, res) => waterController.getWarningCount(req, res)));

export default router;
