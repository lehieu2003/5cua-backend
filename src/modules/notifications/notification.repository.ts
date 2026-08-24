import prisma from '../../database/prisma.service';

export class NotificationRepository {
  async findNotifications(userId?: number, isRead?: boolean) {
    return prisma.notification.findMany({
      where: {
        ...(userId && { OR: [{ userId }, { userId: null }] }),
        ...(isRead !== undefined && { isRead }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findById(id: number) {
    return prisma.notification.findUnique({ where: { id } });
  }

  async markAllRead(userId?: number) {
    return prisma.notification.updateMany({
      where: {
        ...(userId && { OR: [{ userId }, { userId: null }] }),
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async deleteNotification(id: number) {
    return prisma.notification.delete({ where: { id } });
  }
}

export const notificationRepository = new NotificationRepository();
