import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { farmController } from './farm.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/farms:
 *   get:
 *     tags: [Farms]
 *     summary: Danh sách trang trại
 *     responses:
 *       200:
 *         description: Danh sách farms
 */
router.get('/api/v1/farms', asyncHandler((req, res) => farmController.getAllFarms(req, res)));

/**
 * @openapi
 * /api/v1/farms/{id}/overview:
 *   get:
 *     tags: [Farms]
 *     summary: Tổng quan farm theo ID (số hộp, đợt nhập, cảnh báo nước)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thông tin tổng quan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FarmOverview'
 */
router.get('/api/v1/farms/:id/overview', asyncHandler((req, res) => farmController.getFarmOverview(req, res)));

export default router;
