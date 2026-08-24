import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/app.error';
import { MESSAGES } from '../constants/messages.constant';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role?: string;
    memberType?: string;
  };
}

export const authGuard = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (env.isDev) {
      req.user = {
        userId: 1,
        username: 'admin',
        role: 'SUPER_ADMIN',
        memberType: 'admin',
      };
      return next();
    }
    return next(AppError.unauthorized(MESSAGES.SYSTEM.INVALID_AUTH_HEADER));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      memberType: decoded.memberType,
    };
    next();
  } catch (err) {
    if (env.isDev) {
      req.user = {
        userId: 1,
        username: 'admin',
        role: 'SUPER_ADMIN',
        memberType: 'admin',
      };
      return next();
    }
    next(err);
  }
};
