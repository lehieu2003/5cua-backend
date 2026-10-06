// auth.cookies.ts — dual-mode refresh token: cookie HttpOnly cho web, body cho mobile.
import type { Request } from 'express';
import { env } from '../../common/config/env';

export const REFRESH_COOKIE = 'refresh_token';

// Phải đồng bộ với JWT_REFRESH_EXPIRES (mặc định 30d)
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function refreshCookieOptions() {
  return {
    httpOnly: true as const,
    secure: env.isProd,
    sameSite: 'strict' as const,
    path: '/api/v1/auth', // chỉ gửi cho các endpoint auth — giảm bề mặt
    maxAge: REFRESH_TTL_MS,
  };
}

/** Options cho clearCookie — KHÔNG chứa maxAge (maxAge dương giữ cookie rỗng sống lại). */
export function refreshCookieClearOptions() {
  const { maxAge: _omit, ...opts } = refreshCookieOptions();
  return opts;
}

/** Web admin tự khai báo qua header; mobile/curl không gửi header → nhánh body cũ. */
export function isWebRequest(req: Request): boolean {
  return req.headers['x-client-type'] === 'web';
}

/** Token lấy từ cookie trước (web), thiếu mới đọc body (mobile). */
export function resolveRefreshToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[REFRESH_COOKIE] || req.body?.refreshToken || undefined;
}
