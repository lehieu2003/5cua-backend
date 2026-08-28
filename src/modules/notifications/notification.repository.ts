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

  async saveDeviceToken(userId: number, fcmToken: string, platform?: string) {
    return prisma.deviceToken.upsert({
      where: { fcmToken },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, fcmToken, platform },
    });
  }

  async removeDeviceToken(fcmToken: string) {
    return prisma.deviceToken.deleteMany({
      where: { fcmToken },
    });
  }

  async getDeviceTokensByUserIds(userIds: number[]) {
    return prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { fcmToken: true, userId: true },
    });
  }
}

export const notificationRepository = new NotificationRepository();
