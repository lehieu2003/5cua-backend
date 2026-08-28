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
router.get('/api/v1/notifications', authGuard, asyncHandler((req, res) => notificationController.listNotifications(req, res)));

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
router.patch('/api/v1/notifications/read-all', authGuard, asyncHandler((req, res) => notificationController.markAllRead(req, res)));

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
import { authGuard } from '../../common/guards/auth.guard';

router.get('/api/v1/notifications/:id', asyncHandler((req, res) => notificationController.getNotificationDetail(req, res)));
router.delete('/api/v1/notifications/:id', asyncHandler((req, res) => notificationController.removeNotification(req, res)));

/**
 * @openapi
 * /api/v1/notifications/device-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Đăng ký FCM Device Token cho người dùng
 *     security:
 *       - BearerAuth: []
 *   delete:
 *     tags: [Notifications]
 *     summary: Xóa FCM Device Token khi đăng xuất
 */
router.post('/api/v1/notifications/device-token', authGuard, asyncHandler((req, res) => notificationController.registerDeviceToken(req, res)));
router.delete('/api/v1/notifications/device-token', asyncHandler((req, res) => notificationController.unregisterDeviceToken(req, res)));

export default router;
