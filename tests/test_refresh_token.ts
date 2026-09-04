import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthService, hashToken, calculateExpiry } from '../src/modules/auth/auth.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { RefreshTokenSchema, LogoutSchema } from '../src/modules/auth/auth.dto';
import { validate } from '../src/common/middlewares/validate.middleware';
import { asyncHandler } from '../src/common/utils/async.handler';
import { env } from '../src/common/config/env';
import { UserRole } from '@prisma/client';

const PORT = 5011;

interface RefreshTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

class MockAuthRepository {
  public users: Map<number, any> = new Map();
  public refreshTokens: Map<number, RefreshTokenRecord> = new Map();
  private nextTokenId = 1;

  constructor() {
    this.users.set(1, {
      id: 1,
      username: 'testuser',
      passwordHash: 'dummy',
      fullName: 'Test User',
      memberType: 'STANDARD',
      isActive: true,
      farmMembers: [
        {
          role: UserRole.WORKER,
          farm: { id: 10, name: 'Farm 1', code: 'F1' },
        },
      ],
    });

    this.users.set(2, {
      id: 2,
      username: 'deactivated_user',
      passwordHash: 'dummy',
      fullName: 'Deactivated User',
      memberType: 'STANDARD',
      isActive: false,
      farmMembers: [],
    });
  }

  async findById(id: number) {
    return this.users.get(id) || null;
  }

  async findByUsername(username: string) {
    for (const u of this.users.values()) {
      if (u.username === username) return u;
    }
    return null;
  }

  async createRefreshToken(data: {
    userId: number;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }) {
    const record: RefreshTokenRecord = {
      id: this.nextTokenId++,
      userId: data.userId,
      tokenHash: data.tokenHash,
      familyId: data.familyId,
      isRevoked: false,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    this.refreshTokens.set(record.id, record);
    return record;
  }

  async findRefreshTokenByHash(tokenHash: string) {
    for (const record of this.refreshTokens.values()) {
      if (record.tokenHash === tokenHash) return record;
    }
    return null;
  }

  async revokeRefreshToken(id: number) {
    const record = this.refreshTokens.get(id);
    if (record) {
      record.isRevoked = true;
    }
    return record;
  }

  async revokeFamilyTokens(familyId: string) {
    let count = 0;
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId) {
        record.isRevoked = true;
        count++;
      }
    }
    return { count };
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function makeRequest(options: {
  method: string;
  path: string;
  body?: any;
}): Promise<{ status: number; body: any }> {
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
          ...(dataString && { 'Content-Length': Buffer.byteLength(dataString) }),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode || 500, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  const mockRepo = new MockAuthRepository();
  const authService = new AuthService(mockRepo as any);
  const authController = new AuthController(authService);

  const app = express();
  app.use(express.json());

  app.post(
    '/api/v1/auth/refresh',
    validate(RefreshTokenSchema),
    asyncHandler((req, res) => authController.refreshToken(req, res))
  );

  app.post(
    '/api/v1/auth/logout',
    validate(LogoutSchema),
    asyncHandler((req, res) => authController.logout(req, res))
  );

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}`);

  try {
    // 1. Initial valid refresh token creation
    const familyId1 = crypto.randomUUID();
    const initialRefreshToken1 = jwt.sign(
      { userId: 1, username: 'testuser', role: 'WORKER', memberType: 'standard', familyId: familyId1 },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    await mockRepo.createRefreshToken({
      userId: 1,
      tokenHash: hashToken(initialRefreshToken1),
      familyId: familyId1,
      expiresAt: calculateExpiry('30d'),
    });

    // Test 1: Valid single-use refresh token exchange
    {
      const res = await makeRequest({
        method: 'POST',
        path: '/api/v1/auth/refresh',
        body: { refreshToken: initialRefreshToken1 },
      });

      const passed =
        res.status === 200 &&
        res.body.success === true &&
        Boolean(res.body.data?.accessToken) &&
        Boolean(res.body.data?.refreshToken);

      results.push({
        name: 'Single-Use Refresh: Valid token returns 200 with new accessToken & rotated refreshToken',
        passed,
        details: `status=${res.status}, hasNewAccess=${Boolean(res.body.data?.accessToken)}, hasNewRefresh=${Boolean(res.body.data?.refreshToken)}`,
      });

      // Verify old token is marked revoked in repository
      const oldRecord = await mockRepo.findRefreshTokenByHash(hashToken(initialRefreshToken1));
      const oldIsRevoked = oldRecord?.isRevoked === true;
      results.push({
        name: 'Single-Use Refresh: Consumed refresh token is marked revoked in DB',
        passed: oldIsRevoked,
        details: `isRevoked=${oldRecord?.isRevoked}`,
      });

      const rotatedRefreshToken = res.body.data?.refreshToken;

      // Test 2: Replay / Reuse Detection
      // Client presents old consumed token again!
      {
        const replayRes = await makeRequest({
          method: 'POST',
          path: '/api/v1/auth/refresh',
          body: { refreshToken: initialRefreshToken1 },
        });

        const replayPassed = replayRes.status === 401;
        results.push({
          name: 'Reuse Detection: Presenting consumed token returns 401 Unauthorized',
          passed: replayPassed,
          details: `status=${replayRes.status}, message=${replayRes.body?.message}`,
        });

        // Verify family was invalidated
        const rotatedRecord = await mockRepo.findRefreshTokenByHash(hashToken(rotatedRefreshToken));
        const familyRevoked = rotatedRecord?.isRevoked === true;
        results.push({
          name: 'Reuse Detection: Entire session family is invalidated upon reuse attempt',
          passed: familyRevoked,
          details: `rotatedRecord.isRevoked=${rotatedRecord?.isRevoked}`,
        });

        // Rotated token should now also be rejected
        const rotatedRes = await makeRequest({
          method: 'POST',
          path: '/api/v1/auth/refresh',
          body: { refreshToken: rotatedRefreshToken },
        });

        results.push({
          name: 'Reuse Detection: Previously rotated token in revoked family is rejected',
          passed: rotatedRes.status === 401,
          details: `status=${rotatedRes.status}`,
        });
      }
    }

    // Test 3: Deactivated User
    {
      const familyId2 = crypto.randomUUID();
      const deactRefreshToken = jwt.sign(
        { userId: 2, username: 'deactivated_user', role: 'WORKER', memberType: 'standard', familyId: familyId2 },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );
      await mockRepo.createRefreshToken({
        userId: 2,
        tokenHash: hashToken(deactRefreshToken),
        familyId: familyId2,
        expiresAt: calculateExpiry('30d'),
      });

      const res = await makeRequest({
        method: 'POST',
        path: '/api/v1/auth/refresh',
        body: { refreshToken: deactRefreshToken },
      });

      results.push({
        name: 'Deactivated User: Disabled account cannot refresh token (403 Forbidden)',
        passed: res.status === 403,
        details: `status=${res.status}, message=${res.body?.message}`,
      });
    }

    // Test 4: Server-Side Logout Revocation
    {
      const familyId3 = crypto.randomUUID();
      const logoutRefreshToken = jwt.sign(
        { userId: 1, username: 'testuser', role: 'WORKER', memberType: 'standard', familyId: familyId3 },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );
      await mockRepo.createRefreshToken({
        userId: 1,
        tokenHash: hashToken(logoutRefreshToken),
        familyId: familyId3,
        expiresAt: calculateExpiry('30d'),
      });

      // Call server logout
      const logoutRes = await makeRequest({
        method: 'POST',
        path: '/api/v1/auth/logout',
        body: { refreshToken: logoutRefreshToken },
      });

      const logoutRecord = await mockRepo.findRefreshTokenByHash(hashToken(logoutRefreshToken));
      const logoutPassed = logoutRes.status === 200 && logoutRecord?.isRevoked === true;

      results.push({
        name: 'Server Logout: POST /api/v1/auth/logout revokes token on server',
        passed: logoutPassed,
        details: `status=${logoutRes.status}, isRevoked=${logoutRecord?.isRevoked}`,
      });

      // Attempt refresh with logged out token
      const afterLogoutRefresh = await makeRequest({
        method: 'POST',
        path: '/api/v1/auth/refresh',
        body: { refreshToken: logoutRefreshToken },
      });

      results.push({
        name: 'Server Logout: Refreshing with logged out token fails with 401',
        passed: afterLogoutRefresh.status === 401,
        details: `status=${afterLogoutRefresh.status}`,
      });
    }

    // Test 5: Validation and malformed tokens
    {
      const missingBodyRes = await makeRequest({
        method: 'POST',
        path: '/api/v1/auth/refresh',
        body: {},
      });

      results.push({
        name: 'Validation: Missing refreshToken returns 422/400 validation error',
        passed: missingBodyRes.status === 422 || missingBodyRes.status === 400,
        details: `status=${missingBodyRes.status}`,
      });

      const invalidTokenRes = await makeRequest({
        method: 'POST',
        path: '/api/v1/auth/refresh',
        body: { refreshToken: 'invalid.jwt.token' },
      });

      results.push({
        name: 'Validation: Tampered/invalid token signature returns 401 Unauthorized',
        passed: invalidTokenRes.status === 401,
        details: `status=${invalidTokenRes.status}`,
      });
    }

  } finally {
    server.close();
  }

  console.log('\n===================================================');
  console.log('REFRESH TOKEN & LOGOUT REVOCATION TEST RESULTS');
  console.log('===================================================');
  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? 'PASS' : 'FAIL';
    console.log(`[${symbol}] ${r.name}`);
    if (r.details) console.log(`       ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('===================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
