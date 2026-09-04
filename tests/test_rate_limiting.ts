import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import {
  globalRateLimiter,
  authRateLimiter,
  authenticatedRateLimiter,
  heavyOperationLimiter,
  getCallerIdentifier,
} from '../src/common/middlewares/rate-limit.middleware';
import { env } from '../src/common/config/env';

const PORT = 5009;

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function runRequest(options: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const dataString = options.body ? JSON.stringify(options.body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: options.path,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          ...(dataString && { 'Content-Length': Buffer.byteLength(dataString) }),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 500, headers: res.headers, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function run() {
  console.log('--- Starting Rate Limiting Tests ---');

  const app = express();
  // Reverse proxy trust
  app.set('trust proxy', 1);
  app.use(express.json());

  // Mount test routes
  app.get('/health', (req, res) => {
    res.json({ status: 'online', ip: req.ip });
  });

  app.post('/api/v1/auth/login', authRateLimiter, (req, res) => {
    res.json({ status: 'success', user: req.body?.username });
  });

  app.get('/api/v1/farms', (req, res, next) => {
    authenticatedRateLimiter(req, res, () => {
      res.json({ status: 'success', data: [] });
    });
  });

  app.get('/api/v1/reports/export/batches', (req, res, next) => {
    heavyOperationLimiter(req, res, () => {
      res.json({ status: 'success', exported: true });
    });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  try {
    // ── Test 1.1: Express Trust Proxy ──────────────────────────────
    console.log('[1.1] Testing Express Trust Proxy');
    const proxyRes = await runRequest({
      method: 'GET',
      path: '/health',
      headers: {
        'X-Forwarded-For': '203.0.113.195',
      },
    });

    const trustProxyPassed = proxyRes.status === 200 && proxyRes.body.ip === '203.0.113.195';
    results.push({
      name: '1.1 Express Trust Proxy correctly resolves client IP from X-Forwarded-For',
      passed: trustProxyPassed,
      details: `Expected IP: 203.0.113.195, Resolved: ${proxyRes.body.ip}`,
    });

    // ── Test 1.2: Token vs Shared IP Key Generator Isolation ───────
    console.log('[1.2] Testing Key Generator Isolation');
    const fakeToken1 = jwt.sign({ userId: 101, username: 'technician_1' }, env.JWT_ACCESS_SECRET);
    const fakeToken2 = jwt.sign({ userId: 102, username: 'technician_2' }, env.JWT_ACCESS_SECRET);

    const mockReqToken1 = {
      headers: { authorization: `Bearer ${fakeToken1}` },
      ip: '192.168.1.50',
    } as any;
    const mockReqToken2 = {
      headers: { authorization: `Bearer ${fakeToken2}` },
      ip: '192.168.1.50',
    } as any;
    const mockReqNoToken = {
      headers: {},
      ip: '192.168.1.50',
    } as any;

    const id1 = getCallerIdentifier(mockReqToken1);
    const id2 = getCallerIdentifier(mockReqToken2);
    const idIp = getCallerIdentifier(mockReqNoToken);

    const keyGenPassed = id1 === 'user_101' && id2 === 'user_102' && idIp.includes('192.168.1.50');
    results.push({
      name: '1.3 Token vs Shared IP keyGenerator isolates users on same Wi-Fi',
      passed: keyGenPassed,
      details: `User 1 Key: ${id1}, User 2 Key: ${id2}, Anonymous Key: ${idIp}`,
    });

    // ── Test 2.1: Standard RateLimit Headers on /api/v1 ─────────────
    console.log('[2.1] Testing RateLimit headers on /api/v1/farms');
    const farmsRes = await runRequest({
      method: 'GET',
      path: '/api/v1/farms',
      headers: {
        authorization: `Bearer ${fakeToken1}`,
        'X-Forwarded-For': '14.161.20.10',
      },
    });

    const hasRateLimitHeader =
      farmsRes.headers['ratelimit-limit'] !== undefined &&
      farmsRes.headers['ratelimit-remaining'] !== undefined;

    results.push({
      name: '2.1 Standard RateLimit-* headers present on authenticated routes',
      passed: hasRateLimitHeader,
      details: `RateLimit-Limit: ${farmsRes.headers['ratelimit-limit']}, Remaining: ${farmsRes.headers['ratelimit-remaining']}`,
    });

    // ── Test 1.2: Auth Rate Limiter Composite Keying ───────────────
    console.log('[1.2] Testing Auth Rate Limiting on Login');
    const sharedIp = '14.161.99.88';

    // Send 15 requests for user A
    let userAHit429 = false;
    for (let i = 0; i < 16; i++) {
      const res = await runRequest({
        method: 'POST',
        path: '/api/v1/auth/login',
        headers: { 'X-Forwarded-For': sharedIp },
        body: { username: 'crab_worker_a', password: 'secretpassword' },
      });
      if (res.status === 429) {
        userAHit429 = true;
        break;
      }
    }

    // Now test user B from the same IP: should NOT be blocked!
    const resUserB = await runRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: { 'X-Forwarded-For': sharedIp },
      body: { username: 'crab_worker_b', password: 'secretpassword' },
    });

    const authIsolationPassed = userAHit429 && resUserB.status === 200;
    results.push({
      name: '1.2 Auth rate limiter throttles target user without blocking other accounts on same IP',
      passed: authIsolationPassed,
      details: `User A hit 429: ${userAHit429}, User B on same IP status: ${resUserB.status}`,
    });

    // ── Test 2.2: Heavy Operation Limiter (10 req/min) ─────────────
    console.log('[2.2] Testing Heavy Operation Limiter on Export');
    let heavyHit429 = false;
    let heavyRetryAfterFound = false;

    for (let i = 0; i < 12; i++) {
      const res = await runRequest({
        method: 'GET',
        path: '/api/v1/reports/export/batches',
        headers: {
          authorization: `Bearer ${fakeToken2}`,
          'X-Forwarded-For': '14.161.99.99',
        },
      });

      if (res.status === 429) {
        heavyHit429 = true;
        if (res.headers['retry-after']) {
          heavyRetryAfterFound = true;
        }
        break;
      }
    }

    results.push({
      name: '2.2 Heavy Operation Limiter triggers HTTP 429 with Retry-After header',
      passed: heavyHit429 && heavyRetryAfterFound,
      details: `Hit 429: ${heavyHit429}, Retry-After Header: ${heavyRetryAfterFound}`,
    });

  } finally {
    server.close();
  }

  console.log('\n=== Test Summary ===');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name} - ${r.details || ''}`);
    if (!r.passed) allPassed = false;
  }

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
