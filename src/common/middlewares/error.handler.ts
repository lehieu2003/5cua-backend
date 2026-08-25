import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.error';
import { env } from '../config/env';
import { MESSAGES } from '../constants/messages.constant';

/**
 * Global Error Handler — Điểm duy nhất xử lý mọi lỗi trong ứng dụng.
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (env.isDev) {
    console.error(`[ERROR] ${req.method} ${req.path}`, err);
  } else if (!(err instanceof AppError && err.isOperational)) {
    console.error('[CRITICAL ERROR]', err);
  }

  // Operational error — Lỗi nghiệp vụ đã kiểm soát được
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      status: 'error',
      code: err.statusCode,
      message: err.message,
    });
    return;
  }

  // Prisma known errors
  if ((err as any).code === 'P2002') {
    const target = (err as any).meta?.target;
    let message: string = MESSAGES.SYSTEM.UNIQUE_VIOLATION;

    const checkField = (field: string) => {
      if (Array.isArray(target)) return target.includes(field);
      if (typeof target === 'string') return target.includes(field);
      return false;
    };

    if (checkField('phone')) message = MESSAGES.AUTH.PHONE_EXISTS;
    else if (checkField('email')) message = MESSAGES.AUTH.EMAIL_EXISTS;
    else if (checkField('username')) message = MESSAGES.AUTH.USERNAME_EXISTS;
    else if (checkField('code')) message = MESSAGES.BATCH.CODE_EXISTS;

    res.status(409).json({
      success: false,
      status: 'error',
      code: 409,
      message,
    });
    return;
  }

  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      status: 'error',
      code: 404,
      message: MESSAGES.SYSTEM.RECORD_NOT_FOUND,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, status: 'error', code: 401, message: MESSAGES.SYSTEM.TOKEN_INVALID });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, status: 'error', code: 401, message: MESSAGES.SYSTEM.TOKEN_EXPIRED });
    return;
  }

  // Unknown / Programmer error
  res.status(500).json({
    success: false,
    status: 'error',
    code: 500,
    message: env.isDev ? err.message : MESSAGES.SYSTEM.INTERNAL_ERROR,
    ...(env.isDev && { stack: err.stack }),
  });
};
