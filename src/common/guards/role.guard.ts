import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.guard';
import { AppError } from '../errors/app.error';
import { MESSAGES } from '../constants/messages.constant';

/**
 * Role Guard (RBAC) — Kiểm tra vai trò của người dùng trong hệ thống
 * @param allowedRoles Danh sách các Role được phép truy cập (VD: 'SUPER_ADMIN', 'FARM_OWNER', 'MANAGER', 'TECHNICIAN', 'WORKER')
 */
export const roleGuard = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      return next(AppError.unauthorized(MESSAGES.SYSTEM.UNAUTHORIZED));
    }

    // SUPER_ADMIN hoặc admin luôn có toàn quyền
    if (user.role === 'SUPER_ADMIN' || user.memberType === 'admin') {
      return next();
    }

    // Kiểm tra xem role của user có nằm trong danh sách được cấp phép không
    if (user.role && allowedRoles.includes(user.role)) {
      return next();
    }

    return next(AppError.forbidden(MESSAGES.SYSTEM.FORBIDDEN));
  };
};

/**
 * Member Type Guard — Kiểm tra loại thành viên (standard vs employee)
 * @param allowedTypes Danh sách memberType được phép (VD: 'standard', 'admin')
 */
export const memberTypeGuard = (...allowedTypes: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      return next(AppError.unauthorized(MESSAGES.SYSTEM.UNAUTHORIZED));
    }

    if (user.memberType === 'admin' || user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (user.memberType && allowedTypes.includes(user.memberType)) {
      return next();
    }

    return next(AppError.forbidden(MESSAGES.SYSTEM.FORBIDDEN));
  };
};
