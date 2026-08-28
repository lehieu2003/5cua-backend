import { Request, Response } from 'express';
import { notificationService, NotificationService } from './notification.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { MESSAGES } from '../../common/constants/messages.constant';

export class NotificationController {
  constructor(private readonly service: NotificationService = notificationService) {}

  /**
   * REST: GET /api/v1/notifications
   */
  async listNotifications(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
      const data = await this.service.getNotificationList(user?.userId, isRead);
      return ResponseUtil.success(res, data);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: GET /api/v1/notifications/:id
   */
  async getNotificationDetail(req: Request, res: Response) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      const data = await this.service.getDetail(notificationId);
      return ResponseUtil.success(res, data);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: PATCH /api/v1/notifications/read-all
   */
  async markAllRead(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      await this.service.markAllRead(user?.userId);
      return ResponseUtil.success(res, null, MESSAGES.NOTIFICATION.MARK_ALL_READ_SUCCESS);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: DELETE /api/v1/notifications/:id
   */
  async removeNotification(req: Request, res: Response) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      await this.service.removeNotification(notificationId);
      return ResponseUtil.success(res, null, MESSAGES.NOTIFICATION.DELETE_SUCCESS);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
  /**
   * REST: POST /api/v1/notifications/device-token
   */
  async registerDeviceToken(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { fcmToken, platform } = req.body;
      if (!fcmToken) {
        return ResponseUtil.error(res, 'fcmToken là bắt buộc', 400);
      }
      const data = await this.service.registerDeviceToken(user.userId, fcmToken, platform);
      return ResponseUtil.success(res, data, 'Đăng ký device token thành công');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * REST: DELETE /api/v1/notifications/device-token
   */
  async unregisterDeviceToken(req: Request, res: Response) {
    try {
      const { fcmToken } = req.body;
      if (!fcmToken) {
        return ResponseUtil.error(res, 'fcmToken là bắt buộc', 400);
      }
      await this.service.unregisterDeviceToken(fcmToken);
      return ResponseUtil.success(res, null, 'Hủy đăng ký device token thành công');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}

export const notificationController = new NotificationController();
