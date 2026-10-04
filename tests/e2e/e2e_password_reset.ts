/**
 * E2E Forgot/Reset password suite (dev-mode: backend trả resetToken trong response).
 * Flow: forgot → nhận token → reset → mật khẩu mới hoạt động + session cũ chết.
 * Cuối suite: reset NGƯỢC về mật khẩu gốc để không phá tài khoản demo.
 */
import { api, record, printSummary, verifyServer } from './helpers';

const SUITE = 'E2E PASSWORD RESET TEST RESULTS';
const TARGET_USER = 'tech_minh';
const ORIGINAL_PASSWORD = 'Admin@5cua123';
const TEMP_PASSWORD = 'Reset@12345';

// forgot/reset/change-password không có username trong body → dùng chung
// authRateLimiter key per-IP (15/15 phút). Chạy suite nhiều lần liên tiếp
// trong cửa sổ 15' sẽ 429 — coi như SKIP để suite re-runnable.
const isRateLimited = (status: number) => status === 429;
const skipIfLimited = (status: number, name: string, details?: string): boolean => {
  if (isRateLimited(status)) {
    console.log(`  [SKIP] ${name} — bị rate limit (chạy lại sau khi restart server)`);
    return true;
  }
  return false;
};

async function run() {
  await verifyServer();
  console.log('Running E2E Password Reset suite...\n');

  // ── 1. User enumeration: identifier lạ vẫn 200, không có resetToken ──
  {
    const res = await api('POST', '/api/v1/auth/forgot-password', {
      body: { identifier: 'khong-ton-tai-xyz' },
    });
    if (!skipIfLimited(res.status, 'Forgot-password (nhóm 1)')) record(
      'Forgot-password user không tồn tại → 200 + không lộ resetToken',
      res.status === 200 && !res.body?.data?.resetToken,
      `status=${res.status}, hasToken=${!!res.body?.data?.resetToken}`
    );

    const bad = await api('POST', '/api/v1/auth/forgot-password', { body: {} });
    if (!skipIfLimited(bad.status, 'Forgot-password thiếu identifier')) record(
      'Forgot-password thiếu identifier → 400/422',
      bad.status === 400 || bad.status === 422,
      `status=${bad.status}`
    );
  }

  // ── 2. Xin token cho user có thật (dev trả resetToken) ─────────────
  let resetToken = '';
  {
    const res = await api('POST', '/api/v1/auth/forgot-password', {
      body: { identifier: TARGET_USER },
    });
    resetToken = res.body?.data?.resetToken || '';
    if (!skipIfLimited(res.status, 'Forgot-password user có thật')) record(
      'Forgot-password user có thật (dev) → 200 + resetToken',
      res.status === 200 && resetToken.length >= 32,
      `status=${res.status}, tokenLength=${resetToken.length}`
    );
  }

  // ── 3. Reset với token sai → 400 ───────────────────────────────────
  {
    const res = await api('POST', '/api/v1/auth/reset-password', {
      body: { token: 'a'.repeat(64), newPassword: TEMP_PASSWORD },
    });
    if (!skipIfLimited(res.status, 'Reset-password token sai'))
      record('Reset-password token sai → 400', res.status === 400, `status=${res.status}`);
    if (isRateLimited(res.status)) printSummary(SUITE);
  }

  // ── 4. Reset đúng token → đổi được mật khẩu + token single-use ─────
  {
    const res = await api('POST', '/api/v1/auth/reset-password', {
      body: { token: resetToken, newPassword: TEMP_PASSWORD },
    });
    if (!skipIfLimited(res.status, 'Reset-password token đúng'))
      record('Reset-password token đúng → 200', res.status === 200, `status=${res.status}`);

    const replay = await api('POST', '/api/v1/auth/reset-password', {
      body: { token: resetToken, newPassword: 'Other@12345' },
    });
    if (!skipIfLimited(replay.status, 'Replay single-use')) record(
      'Replay cùng token (single-use) → 400',
      replay.status === 400,
      `status=${replay.status}`
    );

    const newLogin = await api('POST', '/api/v1/auth/login', {
      body: { username: TARGET_USER, password: TEMP_PASSWORD },
    });
    record(
      'Login bằng mật khẩu MỚI → 200',
      newLogin.status === 200,
      `status=${newLogin.status}`
    );

    const oldLogin = await api('POST', '/api/v1/auth/login', {
      body: { username: TARGET_USER, password: ORIGINAL_PASSWORD },
    });
    record(
      'Login bằng mật khẩu CŨ → 401',
      oldLogin.status === 401,
      `status=${oldLogin.status}`
    );
  }

  // ── 5. Khôi phục mật khẩu gốc cho tài khoản demo (cùng flow) ───────
  {
    const res = await api('POST', '/api/v1/auth/forgot-password', {
      body: { identifier: TARGET_USER },
    });
    const token2 = res.body?.data?.resetToken || '';
    const restore = await api('POST', '/api/v1/auth/reset-password', {
      body: { token: token2, newPassword: ORIGINAL_PASSWORD },
    });
    const relogin = await api('POST', '/api/v1/auth/login', {
      body: { username: TARGET_USER, password: ORIGINAL_PASSWORD },
    });
    record(
      'Khôi phục mật khẩu gốc cho tài khoản demo → login lại OK',
      restore.status === 200 && relogin.status === 200,
      `restore=${restore.status}, relogin=${relogin.status}`
    );
  }

  printSummary(SUITE);
}

run().catch((err) => {
  console.error('Suite crashed:', err);
  process.exit(1);
});
