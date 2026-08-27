import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/app.error';
import { MESSAGES } from '../constants/messages.constant';
import prisma from '../../database/prisma.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role?: string;
    memberType?: string;
  };
}

/**
 * authGuard:
 * Middleware xác thực Bearer JWT Token.
 * Đồng thời kiểm tra tính hợp lệ và trạng thái hoạt động (isActive) của tài khoản trong CSDL.
 */
export const authGuard = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized(MESSAGES.SYSTEM.INVALID_AUTH_HEADER));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;

    if (!decoded || !decoded.userId) {
      return next(AppError.unauthorized(MESSAGES.SYSTEM.TOKEN_INVALID));
    }

    // Kiểm tra người dùng trong CSDL (phòng trường hợp đã bị khóa hoặc xóa)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, isActive: true },
    });

    if (!user) {
      return next(AppError.unauthorized(MESSAGES.AUTH.USER_NOT_FOUND));
    }

    if (!user.isActive) {
      return next(AppError.forbidden(MESSAGES.AUTH.ACCOUNT_DISABLED));
    }

    req.user = {
      userId: user.id,
      username: user.username,
      role: decoded.role,
      memberType: decoded.memberType,
    };
    next();
  } catch (err) {
    next(err);
  }
};
