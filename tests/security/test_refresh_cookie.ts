/**
 * Security test — HttpOnly refresh cookie cho web (Stage 2).
 * Chạy against server thật :5000. 7 case theo spec 2026-10-06 mục 5.
 * Fetch không tự giữ cookie — test tự bóc Set-Cookie và gửi lại qua header Cookie.
 */
import { verifyServer } from '../e2e/helpers';

const BASE = process.env.API_URL || 'http://localhost:5000';
const ADMIN = { username: 'admin', password: 'Admin@5cua123' };
const WEB = { 'Content-Type': 'application/json', 'X-Client-Type': 'web' };
const MOBILE = { 'Content-Type': 'application/json' };
const SUITE = 'SECURITY REFRESH-COOKIE TEST RESULTS';
let pass = 0, fail = 0;

function record(name: string, ok: boolean, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`);
}

interface Res { status: number; json: any; setCookies: string[] }
async function post(path: string, body: unknown, headers: Record<string, string>): Promise<Res> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  let json: any = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json, setCookies: res.headers.getSetCookie() };
}
const cookieOf = (setCookies: string[], name: string) =>
  setCookies.find((c) => c.startsWith(`${name}=`)) ?? '';
const cookieValue = (cookie: string) => cookie.split('=')[1]?.split(';')[0] ?? '';

function is429(r: Res) { return r.status === 429; }

async function run() {
  await verifyServer();
  console.log('Running security refresh-cookie suite...\n');

  // ── Case 2 (mobile regression): login không header → body có refreshToken ──
  const m = await post('/api/v1/auth/login', ADMIN, MOBILE);
  if (is429(m)) { console.log('[SKIP] rate limited — chạy lại sau'); process.exit(0); }
  record(
    'Login mobile (không header) → body CÓ refreshToken (backward-compat)',
    m.status === 200 && typeof m.json?.data?.refreshToken === 'string',
    `status=${m.status}`
  );
  const mobileRt = m.json?.data?.refreshToken ?? '';

  // ── Case 1: login web → cookie HttpOnly, body KHÔNG refreshToken ──
  const w = await post('/api/v1/auth/login', ADMIN, WEB);
  const rtCookie = cookieOf(w.setCookies, 'refresh_token');
  const flags = rtCookie.toLowerCase();
  record(
    'Login web → 200 + Set-Cookie refresh_token',
    w.status === 200 && rtCookie.length > 0,
    `status=${w.status}, setCookie=${rtCookie ? 'có' : 'KHÔNG'}`
  );
  record(
    'Cookie có HttpOnly + SameSite=Strict + Path=/api/v1/auth',
    flags.includes('httponly') && flags.includes('samesite=strict') && flags.includes('path=/api/v1/auth'),
    rtCookie.slice(rtCookie.indexOf(';') + 1, rtCookie.indexOf(';') + 90)
  );
  record(
    'Login web → body KHÔNG chứa refreshToken',
    w.status === 200 && w.json?.data?.refreshToken === undefined,
    `refreshToken=${w.json?.data?.refreshToken === undefined ? 'undefined ✓' : 'BỊ TRẢ VỀ!'}`
  );
  const rt1 = cookieValue(rtCookie);

  // ── Case 3+7: refresh web qua cookie + Origin hợp lệ → rotation ──
  const r1 = await post('/api/v1/auth/refresh', {}, {
    ...WEB, Cookie: `refresh_token=${rt1}`, Origin: 'http://localhost:3000',
  });
  const rt2Cookie = cookieOf(r1.setCookies, 'refresh_token');
  const rt2 = cookieValue(rt2Cookie);
  record(
    'Refresh web (cookie + Origin allowlist) → 200',
    r1.status === 200,
    `status=${r1.status}, body=${JSON.stringify(r1.json).slice(0, 80)}`
  );
  record(
    'Rotation: cookie mới khác cookie cũ (ghi đè)',
    r1.status === 200 && rt2.length > 0 && rt2 !== rt1,
    `đổi=${rt2 !== rt1}`
  );

  // ── Case 6: Origin lạ → 403 ──
  const rEvil = await post('/api/v1/auth/refresh', {}, {
    ...WEB, Cookie: `refresh_token=${rt2}`, Origin: 'https://evil.example.com',
  });
  record(
    'Refresh với Origin lạ → 403',
    rEvil.status === 403,
    `status=${rEvil.status}`
  );

  // ── Case 4: refresh mobile qua body vẫn chạy ──
  const rm = await post('/api/v1/auth/refresh', { refreshToken: mobileRt }, MOBILE);
  record(
    'Refresh mobile (body) → 200 (không bị origin guard chặn — không Origin header)',
    rm.status === 200,
    `status=${rm.status}`
  );

  // ── Case 5: logout web (cookie) → clearCookie + revoke ──
  const lo = await post('/api/v1/auth/logout', {}, { ...WEB, Cookie: `refresh_token=${rt2}` });
  const cleared = cookieOf(lo.setCookies, 'refresh_token');
  record(
    'Logout web → 200 + clearCookie (Max-Age=0/Expires quá khứ)',
    lo.status === 200 && /max-age=0|expires=thu, 01 jan 1970/i.test(cleared.toLowerCase()),
    `status=${lo.status}, clear=${cleared.slice(0, 60)}`
  );
  const rAfter = await post('/api/v1/auth/refresh', {}, {
    ...WEB, Cookie: `refresh_token=${rt2}`, Origin: 'http://localhost:3000',
  });
  record(
    'Refresh sau logout → 401 (token đã revoke server-side)',
    rAfter.status === 401,
    `status=${rAfter.status}`
  );

  console.log(`\n${SUITE}: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Suite lỗi không mong đợi:', e);
  process.exit(1);
});
