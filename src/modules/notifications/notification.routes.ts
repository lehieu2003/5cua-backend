import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { notificationController } from './notification.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Danh sách thông báo hệ thống
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Danh sách NotificationItem
 */
router.get('/api/v1/notifications', asyncHandler((req, res) => notificationController.listNotifications(req, res)));

/**
 * @openapi
 * /api/v1/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/api/v1/notifications/read-all', asyncHandler((req, res) => notificationController.markAllRead(req, res)));

/**
 * @openapi
 * /api/v1/notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Chi tiết một thông báo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết thông báo
 *   delete:
 *     tags: [Notifications]
 *     summary: Xoá một thông báo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xoá thành công
 */
router.get('/api/v1/notifications/:id', asyncHandler((req, res) => notificationController.getNotificationDetail(req, res)));
router.delete('/api/v1/notifications/:id', asyncHandler((req, res) => notificationController.removeNotification(req, res)));

export default router;
