import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { MESSAGES } from '../constants/messages.constant';
import { AuthenticatedRequest } from '../guards/auth.guard';

/**
 * Helper trích xuất danh tính client:
 * 1. Ưu tiên `req.user.userId` (khi authGuard đã chạy)
 * 2. Nếu có Authorization: Bearer <token>, decode nhanh `userId` mà không cần query database
 * 3. Fallback về IP chuẩn hoá (IPv4/IPv6 CIDR) nếu request ẩn danh
 */
export function getCallerIdentifier(req: Request, prefix = ''): string {
  const user = (req as AuthenticatedRequest).user;
  if (user && user.userId) {
    return prefix ? `${prefix}_user_${user.userId}` : `user_${user.userId}`;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token) as { userId?: number } | null;
      if (decoded && decoded.userId) {
        return prefix ? `${prefix}_user_${decoded.userId}` : `user_${decoded.userId}`;
      }
    } catch (_) {}
  }

  const clientIp = ipKeyGenerator(req.ip || '');
  return prefix ? `${prefix}_${clientIp}` : clientIp;
}

/**
 * Global Rate Limiter:
 * Giới hạn toàn bộ request đến API để chống DoS / flood request ở mức hạ tầng.
 * Bỏ qua /health và /api-docs để không ảnh hưởng đến healthcheck hệ thống.
 * Mặc định: 1500 requests / 15 phút cho mỗi IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 1500, // Tối đa 1500 requests mỗi 15 phút
  standardHeaders: true, // Trả về thông tin giới hạn trong headers `RateLimit-*`
  legacyHeaders: false, // Tắt header cũ `X-RateLimit-*`
  skip: (req) => req.path === '/health' || req.path.startsWith('/api-docs'),
  message: {
    status: 'error',
    code: 429,
    message: MESSAGES.SYSTEM.RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Auth Rate Limiter (Nghiêm ngặt theo IP + Username):
 * Giới hạn request vào các endpoint nhạy cảm (Login, Register, Quên mật khẩu)
 * để chống tấn công Brute-force & Password Spraying.
 * Key: IP + target username (đảm bảo bảo vệ tài khoản mà không làm nghẽn người dùng khác trên cùng IP).
 * Mặc định: 15 lần / 15 phút.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 15, // Tối đa 15 lần thử
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const rawUsername = req.body && typeof req.body.username === 'string' ? req.body.username : '';
    const username = rawUsername.trim().toLowerCase();
    const clientIp = ipKeyGenerator(req.ip || '');
    return username ? `auth_${clientIp}_${username}` : `auth_${clientIp}`;
  },
  message: {
    status: 'error',
    code: 429,
    message: MESSAGES.AUTH.AUTH_RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Authenticated User Rate Limiter:
 * Giới hạn các request nghiệp vụ thông thường (Farms, Ponds, Batches, Feeding, Water, Move...)
 * Được định danh theo `user.userId` từ JWT token.
 * Giải quyết triệt để vấn đề NAT / Shared Wi-Fi tại nông trại (nhiều công nhân chia sẻ 1 IP).
 * Mặc định: 600 requests / 15 phút cho mỗi User (hoặc fallback về IP nếu chưa authenticate).
 */
export const authenticatedRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 600, // 600 requests mỗi 15 phút (~40 requests/phút)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getCallerIdentifier(req),
  message: {
    status: 'error',
    code: 429,
    message: MESSAGES.SYSTEM.USER_RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Heavy Operation Rate Limiter:
 * Giới hạn các tác vụ tốn nhiều tài nguyên CPU / RAM (xuất Excel, báo cáo phân tích nặng, PDF).
 * Mặc định: 10 requests / 1 phút cho mỗi User (hoặc IP).
 */
export const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  limit: 10, // Tối đa 10 lần xuất / 1 phút
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getCallerIdentifier(req, 'heavy'),
  message: {
    status: 'error',
    code: 429,
    message: MESSAGES.SYSTEM.HEAVY_OPERATION_RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Upload Rate Limiter:
 * Giới hạn số lần upload file / ảnh để tránh spam chiếm dụng bộ nhớ server.
 * Mặc định: 30 lần upload / 15 phút theo User hoặc IP.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getCallerIdentifier(req, 'upload'),
  message: {
    status: 'error',
    code: 429,
    message: 'Bạn đã tải lên quá nhiều tệp tin. Vui lòng thử lại sau ít phút.',
  },
});


