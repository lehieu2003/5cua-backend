import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { feedingController } from './feeding.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/feeding:
 *   get:
 *     tags: [Feeding & Probiotic]
 *     summary: Lịch sử cho ăn / bổ sung vi sinh
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: string
 *           enum: [feeding, probiotic]
 *           default: feeding
 *     responses:
 *       200:
 *         description: Danh sách FeedingRecord với scraps
 *   post:
 *     tags: [Feeding & Probiotic]
 *     summary: Ghi nhận cho ăn / bổ sung vi sinh
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFeedingRequest'
 *     responses:
 *       201:
 *         description: Ghi nhận thành công
 */
router.get('/api/v1/feeding', asyncHandler((req, res) => feedingController.listFeeding(req, res)));
router.post('/api/v1/feeding', asyncHandler((req, res) => feedingController.createFeeding(req, res)));

import { authGuard } from '../../common/guards/auth.guard';
import { roleGuard } from '../../common/guards/role.guard';

// Categories
router.get('/api/v1/feeding/categories', asyncHandler((req, res) => feedingController.listCategories(req, res)));
router.post('/api/v1/feeding/categories', authGuard, roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'), asyncHandler((req, res) => feedingController.createCategory(req, res)));

// Products
router.get('/api/v1/feeding/products', asyncHandler((req, res) => feedingController.listProducts(req, res)));
router.get('/api/v1/feeding/products/:id', asyncHandler((req, res) => feedingController.getProduct(req, res)));
router.post('/api/v1/feeding/products', authGuard, roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'), asyncHandler((req, res) => feedingController.createProduct(req, res)));
router.put('/api/v1/feeding/products/:id', authGuard, roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'), asyncHandler((req, res) => feedingController.updateProduct(req, res)));
router.delete('/api/v1/feeding/products/:id', authGuard, roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'), asyncHandler((req, res) => feedingController.deleteProduct(req, res)));

// Statuses
router.get('/api/v1/feeding/status', asyncHandler((req, res) => feedingController.getFeedingStatuses(req, res)));
router.get('/api/v1/feeding/shapes', asyncHandler((req, res) => feedingController.getShapeStatuses(req, res)));

export default router;
