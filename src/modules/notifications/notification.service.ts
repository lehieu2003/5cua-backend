import { notificationRepository, NotificationRepository } from './notification.repository';

export class NotificationService {
  constructor(private readonly repo: NotificationRepository = notificationRepository) {}

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
