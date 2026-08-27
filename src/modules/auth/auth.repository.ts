import prisma from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

export class AuthRepository {
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        farmMembers: {
          include: {
            farm: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async findByPhone(phone: string) {
    return prisma.user.findFirst({
      where: { phone },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        memberType: true,
        isActive: true,
        createdAt: true,
        farmMembers: {
          include: {
            farm: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async createUser(data: {
    username: string;
    passwordHash: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    memberType?: string;
    role?: UserRole;
    farmId?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: data.username.trim(),
          passwordHash: data.passwordHash,
          fullName: data.fullName.trim(),
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          memberType: (data.memberType || 'standard').toUpperCase(),
        },
      });

      if (data.farmId) {
        await tx.farmMember.create({
          data: {
            farmId: data.farmId,
            userId: user.id,
            role: data.role || UserRole.WORKER,
          },
        });
      }

      return user;
    });
  }

  async updatePassword(userId: number, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async updateProfile(userId: number, data: { fullName?: string; email?: string; phone?: string; avatarUrl?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName.trim() }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });
  }

  async findAllUsers(farmId?: number) {
    const where: any = {};
    if (farmId) {
      where.farmMembers = {
        some: {
          farmId,
        },
      };
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        memberType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        farmMembers: {
          include: {
            farm: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const primaryFarmMember = u.farmMembers?.[0];
      const role =
        u.memberType === 'ADMIN'
          ? UserRole.SUPER_ADMIN
          : primaryFarmMember?.role || UserRole.WORKER;
      return {
        ...u,
        role,
      };
    });
  }

  async updateUserStatus(userId: number, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
      },
    });
  }
}

export const authRepository = new AuthRepository();
