import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `\n[CONFIG ERROR] Thiếu biến môi trường bắt buộc: "${key}"\n` +
      `  → Hãy kiểm tra file .env và đảm bảo biến này đã được khai báo.\n` +
      `  → Xem mẫu tại: .env.example\n`
    );
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key]?.trim() || defaultValue;
}

export const env = {
  // ── Server ──────────────────────────────────────────────────────
  PORT:     optionalEnv('PORT', '5000'),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  APP_URL:  optionalEnv('APP_URL', ''),   // Dùng trong Swagger server URL

  // ── Database ────────────────────────────────────────────────────
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // ── JWT Secrets (REQUIRED — không có default) ───────────────────
  JWT_ACCESS_SECRET:  requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES:  optionalEnv('JWT_ACCESS_EXPIRES',  '7d'),
  JWT_REFRESH_EXPIRES: optionalEnv('JWT_REFRESH_EXPIRES', '30d'),

  // ── Seed / Initial Data (dùng khi chạy prisma db seed) ──────────
  SEED_ADMIN_PASSWORD: optionalEnv('SEED_ADMIN_PASSWORD', ''),
  SEED_FARM_CODE:      optionalEnv('SEED_FARM_CODE', 'FARM-DEFAULT-01'),
  SEED_FARM_NAME:      optionalEnv('SEED_FARM_NAME', '5Cua Smart Farm'),

  // ── Redis (tuỳ chọn) ────────────────────────────────────────────
  REDIS_URL: optionalEnv('REDIS_URL', ''),

  // ── Helpers ─────────────────────────────────────────────────────
  get isDev()  { return this.NODE_ENV === 'development'; },
  get isProd() { return this.NODE_ENV === 'production'; },

  /**
   * Trả về base URL của server để dùng trong Swagger, email, webhook...
   * Ưu tiên APP_URL từ .env, fallback về localhost chỉ trong dev.
   */
  get baseUrl(): string {
    if (this.APP_URL) return this.APP_URL;
    if (this.isDev) return `http://localhost:${this.PORT}`;
    throw new Error(
      '[CONFIG ERROR] APP_URL phải được khai báo trong .env khi NODE_ENV=production'
    );
  },
} as const;
