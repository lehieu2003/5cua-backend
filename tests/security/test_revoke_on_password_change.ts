/**
 * Security test — đổi mật khẩu phải thu hồi MỌI refresh token của user.
 * Kịch bản: token bị đánh cắp (thiết bị mất) → nạn nhân đổi mật khẩu →
 * token cũ phải chết ngay, không còn hợp lệ thêm 30 ngày nữa.
 * (Đổi mật khẩu tạm rồi revert về gốc để không phá các suite khác.)
 */
import { verifyServer } from '../e2e/helpers';

const BASE = process.env.API_URL || 'http://localhost:5000';
const ORIGINAL = 'Admin@5cua123';
const TEMP = 'Temp@Revoke456';
const SUITE = 'SECURITY REVOKE-ON-PASSWORD-CHANGE TEST RESULTS';
let pass = 0, fail = 0;

function record(name: string, ok: boolean, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}

async function run() {
  await verifyServer();
  console.log('Running revoke-on-password-change suite...\n');

  // 1. Login lấy bộ token (access + refresh)
  const login1 = await post('/api/v1/auth/login', { username: 'admin', password: ORIGINAL });
  const accessToken = login1.json?.data?.accessToken;
  const oldRefreshToken = login1.json?.data?.refreshToken;
  record('Login ban đầu → 200 + tokens', login1.status === 200 && !!accessToken && !!oldRefreshToken, `status=${login1.status}`);

  // 2. Đổi mật khẩu (đây là hành động phải giết các token cũ)
  const change = await post(
    '/api/v1/auth/change-password',
    { oldPassword: ORIGINAL, newPassword: TEMP },
    { Authorization: `Bearer ${accessToken}` },
  );
  record('Đổi mật khẩu → 200', change.status === 200, `status=${change.status}, msg=${change.json?.message ?? ''}`);

  // 3. Refresh token CŨ phải chết ngay
  const reuse = await post('/api/v1/auth/refresh', { refreshToken: oldRefreshToken });
  record(
    'Refresh token cũ sau đổi mật khẩu → 401 (đã revoke toàn bộ)',
    reuse.status === 401,
    `status=${reuse.status}`
  );

  // 4. Đổi lại mật khẩu gốc (dùng access token cũ vẫn hợp lệ tới khi hết hạn — không sao)
  const revert = await post(
    '/api/v1/auth/change-password',
    { oldPassword: TEMP, newPassword: ORIGINAL },
    { Authorization: `Bearer ${accessToken}` },
  );
  record('Revert mật khẩu gốc → 200', revert.status === 200, `status=${revert.status}`);

  // 5. Login lại bằng mật khẩu gốc vẫn OK
  const login2 = await post('/api/v1/auth/login', { username: 'admin', password: ORIGINAL });
  record('Login lại với mật khẩu gốc → 200', login2.status === 200, `status=${login2.status}`);

  console.log(`\n${SUITE}: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Suite lỗi không mong đợi:', e);
  process.exit(1);
});
