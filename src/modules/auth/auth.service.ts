import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { authRepository, AuthRepository } from './auth.repository';
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateProfileDto } from './auth.dto';
import { env } from '../../common/config/env';
import { AppError } from '../../common/errors/app.error';
import { MESSAGES } from '../../common/constants/messages.constant';
import { UserRole } from '@prisma/client';

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  async login(dto: LoginDto) {
    const user = await this.repo.findByUsername(dto.username);
    if (!user) {
      throw AppError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw AppError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Xác định primary role của user
    const primaryFarmMember = user.farmMembers?.[0];
    const role: UserRole | string =
      user.memberType === 'ADMIN'
        ? UserRole.SUPER_ADMIN
        : primaryFarmMember?.role || UserRole.WORKER;

    const memberTypeFormatted = (user.memberType || 'standard').toLowerCase();

    const accessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role,
        memberType: memberTypeFormatted,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES as any }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role,
        memberType: memberTypeFormatted,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as any }
    );

    const farms = user.farmMembers?.map((fm) => ({
      farmId: fm.farm.id,
      farmName: fm.farm.name,
      farmCode: fm.farm.code,
      role: fm.role,
    })) || [];

    return {
      userId: user.id,
      username: user.username,
      name: user.fullName,
      partnerDisplayName: user.fullName,
      role,
      memberType: memberTypeFormatted,
      member_type: memberTypeFormatted,
      accessToken,
      refreshToken,
      image1920: user.avatarUrl,
      farms,
    };
  }

  async register(dto: RegisterDto) {
    // 1. Kiểm tra username
    const existingUser = await this.repo.findByUsername(dto.username.trim());
    if (existingUser) {
      throw AppError.conflict(MESSAGES.AUTH.USERNAME_EXISTS);
    }

    // 2. Kiểm tra phone nếu có
    const phone = dto.phone?.trim();
    if (phone) {
      const existingPhone = await this.repo.findByPhone(phone);
      if (existingPhone) {
        throw AppError.conflict(MESSAGES.AUTH.PHONE_EXISTS);
      }
    }

    // 3. Kiểm tra email nếu có
    const email = dto.email?.trim();
    if (email) {
      const existingEmail = await this.repo.findByEmail(email);
      if (existingEmail) {
        throw AppError.conflict(MESSAGES.AUTH.EMAIL_EXISTS);
      }
    }

    const passwordHash = await argon2.hash(dto.password);
    const newUser = await this.repo.createUser({
      username: dto.username,
      passwordHash,
      fullName: dto.fullName,
      email: email || null,
      phone: phone || null,
      memberType: dto.memberType,
      role: dto.role as UserRole,
      farmId: dto.farmId,
    });

    return {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      memberType: (newUser.memberType || 'standard').toLowerCase(),
      member_type: (newUser.memberType || 'standard').toLowerCase(),
      role: dto.role || 'WORKER',
    };
  }

  async getProfile(userId: number) {
    const profile = await this.repo.findById(userId);
    if (!profile) {
      throw AppError.notFound(MESSAGES.AUTH.USER_NOT_FOUND);
    }

    const primaryFarmMember = profile.farmMembers?.[0];
    const role: UserRole | string =
      profile.memberType === 'ADMIN'
        ? UserRole.SUPER_ADMIN
        : primaryFarmMember?.role || UserRole.WORKER;

    const memberTypeFormatted = (profile.memberType || 'standard').toLowerCase();

    const farms = profile.farmMembers?.map((fm) => ({
      farmId: fm.farm.id,
      farmName: fm.farm.name,
      farmCode: fm.farm.code,
      role: fm.role,
    })) || [];

    return {
      id: profile.id,
      username: profile.username,
      fullName: profile.fullName,
      name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      image_1920: profile.avatarUrl,
      role,
      memberType: memberTypeFormatted,
      member_type: memberTypeFormatted,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      farms,
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const phone = dto.phone?.trim();
    if (phone) {
      const existingPhone = await this.repo.findByPhone(phone);
      if (existingPhone && existingPhone.id !== userId) {
        throw AppError.conflict(MESSAGES.AUTH.PHONE_EXISTS);
      }
    }

    const email = dto.email?.trim();
    if (email) {
      const existingEmail = await this.repo.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        throw AppError.conflict(MESSAGES.AUTH.EMAIL_EXISTS);
      }
    }

    return this.repo.updateProfile(userId, {
      fullName: dto.fullName,
      email: email || undefined,
      phone: phone || undefined,
      avatarUrl: dto.avatarBase64,
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.repo.findById(userId);
    if (!user) throw AppError.notFound(MESSAGES.AUTH.USER_NOT_FOUND);

    const fullUser = await this.repo.findByUsername(user.username);
    if (!fullUser) throw AppError.notFound(MESSAGES.AUTH.USER_NOT_FOUND);

    const isMatch = await argon2.verify(fullUser.passwordHash, dto.oldPassword);
    if (!isMatch) {
      throw AppError.badRequest(MESSAGES.AUTH.INVALID_OLD_PASSWORD);
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.repo.updatePassword(userId, newHash);
    return { success: true };
  }
}

export const authService = new AuthService();
