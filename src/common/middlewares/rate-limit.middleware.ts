import rateLimit from 'express-rate-limit';
import { MESSAGES } from '../constants/messages.constant';

/**
 * Global Rate Limiter:
 * Giới hạn toàn bộ request đến API để chống DoS / flood request.
 * Mặc định: 300 requests / 15 phút cho mỗi IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 300, // Tối đa 300 requests mỗi 15 phút
  standardHeaders: true, // Trả về thông tin giới hạn trong headers `RateLimit-*`
  legacyHeaders: false, // Tắt header cũ `X-RateLimit-*`
  message: {
    status: 'error',
    code: 429,
    message: MESSAGES.SYSTEM.RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Auth Rate Limiter (Nghiêm ngặt):
 * Giới hạn request vào các endpoint nhạy cảm (Login, Register, Quên mật khẩu)
 * để chống tấn công Brute-force & Password Spraying.
 * Mặc định: 10 lần / 15 phút cho mỗi IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 15, // Tối đa 15 lần thử
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: MESSAGES.AUTH.AUTH_RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Upload Rate Limiter:
 * Giới hạn số lần upload file / ảnh để tránh spam chiếm dụng bộ nhớ server.
 * Mặc định: 30 lần upload / 15 phút.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Bạn đã tải lên quá nhiều tệp tin. Vui lòng thử lại sau ít phút.',
  },
});
