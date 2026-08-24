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
      const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
      const data = await this.service.getNotificationList(undefined, isRead);
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
  async markAllRead(_req: Request, res: Response) {
    try {
      await this.service.markAllRead();
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
}

export const notificationController = new NotificationController();
