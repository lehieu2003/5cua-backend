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

/**
 * @openapi
 * /api/v1/feeding/products:
 *   get:
 *     tags: [Feeding & Probiotic]
 *     summary: Danh sách sản phẩm thức ăn / vi sinh
 *     parameters:
 *       - in: query
 *         name: categoryType
 *         schema:
 *           type: string
 *           enum: [feed, probiotic]
 *           default: feed
 *     responses:
 *       200:
 *         description: Danh sách sản phẩm
 */
router.get('/api/v1/feeding/products', asyncHandler((req, res) => feedingController.listProducts(req, res)));

export default router;
