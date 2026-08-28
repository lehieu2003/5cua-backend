import { notificationRepository, NotificationRepository } from './notification.repository';
import { getFirebaseMessaging } from '../../common/config/firebase.config';
import prisma from '../../database/prisma.service';

export class NotificationService {
  constructor(private readonly repo: NotificationRepository = notificationRepository) {}

  async registerDeviceToken(userId: number, fcmToken: string, platform?: string) {
    if (!fcmToken) throw new Error('fcmToken không được để trống');
    return this.repo.saveDeviceToken(userId, fcmToken, platform);
  }

  async unregisterDeviceToken(fcmToken: string) {
    if (!fcmToken) return { success: true };
    await this.repo.removeDeviceToken(fcmToken);
    return { success: true };
  }

  async sendPushNotificationToUsers(
    userIds: number[],
    title: string,
    body: string,
    dataPayload?: Record<string, string>
  ) {
    if (!userIds || userIds.length === 0) return;

    // 1. Lưu bản ghi Notification vào DB
    await Promise.all(
      userIds.map((uid) =>
        prisma.notification.create({
          data: {
            userId: uid,
            name: title,
            shortDescription: body,
            message: body,
          },
        })
      )
    );

    // 2. Lấy danh sách FCM tokens
    const tokens = await this.repo.getDeviceTokensByUserIds(userIds);
    const fcmTokens = Array.from(new Set(tokens.map((t) => t.fcmToken).filter(Boolean)));
    if (fcmTokens.length === 0) {
      console.log(`[FCM] Không có FCM Token nào cho ${userIds.length} users.`);
      return;
    }

    // 3. Gửi FCM multicast
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn('[FCM] Firebase Messaging chưa được kích hoạt, bỏ qua gửi push notification.');
      return;
    }

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title,
          body,
        },
        data: dataPayload || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'water_alert_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      console.log(
        `[FCM] Gửi Push Notification thành công: ${response.successCount} thành công, ${response.failureCount} thất bại.`
      );
    } catch (error) {
      console.error('[FCM] Lỗi gửi push notification:', error);
    }
  }

  async getNotificationList(userId?: number, isRead?: boolean) {
    const list = await this.repo.findNotifications(userId, isRead);

    return list.map((n) => ({
      id: n.id,
      name: n.name,
      short_description: n.shortDescription,
      is_read: n.isRead,
      create_date: n.createdAt.toISOString(),
      message: n.message || '',
    }));
  }

  async getDetail(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new Error('Không tìm thấy thông báo');

    return {
      id: item.id,
      name: item.name,
      short_description: item.shortDescription,
      is_read: item.isRead,
      create_date: item.createdAt.toISOString(),
      message: item.message || '',
    };
  }

  async markAllRead(userId?: number) {
    await this.repo.markAllRead(userId);
    return { success: true };
  }

  async removeNotification(id: number) {
    await this.repo.deleteNotification(id);
    return { success: true };
  }
}

export const notificationService = new NotificationService();
