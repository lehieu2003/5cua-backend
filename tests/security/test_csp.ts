/**
 * Security test — CSP headers (Stage 1).
 * Chạy against server thật :5000 như các e2e suite khác.
 * (a) Mọi route API phải có CSP strict: script-src KHÔNG chứa 'unsafe-eval'.
 * (b) /api-docs (chỉ tồn tại non-prod) giữ CSP nới để Swagger UI chạy được.
 */
import { verifyServer } from '../e2e/helpers';

const BASE = process.env.API_URL || 'http://localhost:5000';
const SUITE = 'SECURITY CSP TEST RESULTS';
let pass = 0, fail = 0;

async function cspOf(path: string): Promise<{ status: number; csp: string }> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: res.status, csp: res.headers.get('content-security-policy') ?? '' };
}

function record(name: string, ok: boolean, detail: string) {
  if (ok) pass++; else fail++;
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  await verifyServer();
  console.log('Running security CSP suite...\n');

  // (a) API strict
  const health = await cspOf('/health');
  const hasCsp = health.csp.length > 0;
  const scriptSrc = /script-src[^;]*/.exec(health.csp)?.[0] ?? '';
  record(
    'GET /health có Content-Security-Policy',
    hasCsp,
    hasCsp ? health.csp.slice(0, 80) : 'MISSING HEADER'
  );
  record(
    "script-src không chứa 'unsafe-eval' (strict)",
    hasCsp && !scriptSrc.includes('unsafe-eval'),
    `script-src="${scriptSrc}"`
  );

  // (b) /api-docs nới (chỉ non-prod)
  const docs = await cspOf('/api-docs/');
  if (docs.status === 404) {
    console.log('[SKIP] /api-docs không tồn tại (prod) — bỏ qua case nới lỏng');
    pass++;
  } else {
    const docsScript = /script-src[^;]*/.exec(docs.csp)?.[0] ?? '';
    record(
      "GET /api-docs/ CSP nới (unsafe-eval cho Swagger UI)",
      docsScript.includes('unsafe-eval'),
      `script-src="${docsScript}"`
    );
  }

  console.log(`\n${SUITE}: ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Suite lỗi không mong đợi:', e);
  process.exit(1);
});
