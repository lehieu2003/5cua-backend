import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { authRepository, AuthRepository } from './auth.repository';
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateProfileDto, RefreshTokenDto, LogoutDto } from './auth.dto';
import { env } from '../../common/config/env';
import { AppError } from '../../common/errors/app.error';
import { MESSAGES } from '../../common/constants/messages.constant';
import { UserRole } from '@prisma/client';
import { sseService } from '../../common/services/sse.service';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function calculateExpiry(expiresIn: string = '30d'): Date {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  const now = Date.now();
  if (!match) return new Date(now + 30 * 24 * 60 * 60 * 1000);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(now + value * (multipliers[unit] || 24 * 60 * 60 * 1000));
}

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

    if (!user.isActive) {
      throw AppError.forbidden(MESSAGES.AUTH.ACCOUNT_DISABLED);
    }

    // Xác định primary role của user
    const primaryFarmMember = user.farmMembers?.[0];
    const role: UserRole | string =
      user.memberType === 'ADMIN'
        ? UserRole.SUPER_ADMIN
        : primaryFarmMember?.role || UserRole.WORKER;

    const memberTypeFormatted = (user.memberType || 'standard').toLowerCase();
    const familyId = crypto.randomUUID();

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
        familyId,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as any }
    );

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: calculateExpiry(env.JWT_REFRESH_EXPIRES),
    });

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

  async listUsers(farmId?: number) {
    return this.repo.findAllUsers(farmId);
  }

  async updateUserStatus(currentAdminId: number, targetUserId: number, isActive: boolean) {
    if (currentAdminId === targetUserId) {
      throw AppError.badRequest('Bạn không thể tự khóa/vô hiệu hóa tài khoản của chính mình');
    }

    const updatedUser = await this.repo.updateUserStatus(targetUserId, isActive);

    if (!isActive) {
      sseService.emitToUser(targetUserId, {
        type: 'ACCOUNT_DEACTIVATED',
        userId: targetUserId,
        message: 'Tài khoản của bạn đã bị vô hiệu hóa bởi quản trị viên. Bạn sẽ được đăng xuất khỏi hệ thống.',
      });
    }

    return updatedUser;
  }

  async refreshToken(dto: RefreshTokenDto) {
    // 1. Verify token signature
    let decoded: any;
    try {
      decoded = jwt.verify(dto.refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw AppError.unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (!decoded || !decoded.userId) {
      throw AppError.unauthorized('Refresh token không hợp lệ');
    }

    // 2. Hash incoming token and lookup in database
    const tokenHash = hashToken(dto.refreshToken);
    const tokenRecord = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!tokenRecord) {
      throw AppError.unauthorized('Refresh token không tồn tại trong hệ thống');
    }

    // 3. REUSE DETECTION: If token was already revoked, family is compromised!
    if (tokenRecord.isRevoked) {
      // Invalidate all active tokens in this session family
      await this.repo.revokeFamilyTokens(tokenRecord.familyId);
      throw AppError.unauthorized('Refresh token đã bị vô hiệu hóa (phát hiện hành vi tái sử dụng token)');
    }

    // 4. Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      throw AppError.unauthorized('Refresh token đã hết hạn');
    }

    // 5. Check user status
    const user = await this.repo.findById(tokenRecord.userId);
    if (!user) {
      throw AppError.unauthorized(MESSAGES.AUTH.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw AppError.forbidden(MESSAGES.AUTH.ACCOUNT_DISABLED);
    }

    // 6. SINGLE-USE ROTATION: Invalidate current token
    await this.repo.revokeRefreshToken(tokenRecord.id);

    // 7. Issue new access token and rotated refresh token within the same family
    const primaryFarmMember = user.farmMembers?.[0];
    const role: UserRole | string =
      user.memberType === 'ADMIN'
        ? UserRole.SUPER_ADMIN
        : primaryFarmMember?.role || UserRole.WORKER;
    const memberTypeFormatted = (user.memberType || 'standard').toLowerCase();

    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role,
        memberType: memberTypeFormatted,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES as any }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role,
        memberType: memberTypeFormatted,
        familyId: tokenRecord.familyId,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES as any }
    );

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      familyId: tokenRecord.familyId,
      expiresAt: calculateExpiry(env.JWT_REFRESH_EXPIRES),
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(dto: LogoutDto) {
    if (dto?.refreshToken) {
      const tokenHash = hashToken(dto.refreshToken);
      const tokenRecord = await this.repo.findRefreshTokenByHash(tokenHash);
      if (tokenRecord) {
        await this.repo.revokeFamilyTokens(tokenRecord.familyId);
      }
    }
    return { success: true };
  }
}

export const authService = new AuthService();
