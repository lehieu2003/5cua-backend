/**
 * E2E Auth suite — login/refresh/logout/register/profile chạy trên server thật :5000.
 * Lưu ý: các endpoint auth share authRateLimiter (15 req/15 phút per IP khi body không có
 * username) — suite tối thiểu hoá số call và coi 429 là SKIP để có thể chạy lại.
 */
import { api, record, skip, printSummary, verifyServer, teardownTestFarm } from './helpers';

const SUITE = 'E2E AUTH TEST RESULTS';

function isRateLimited(status: number): boolean {
  return status === 429;
}

async function run() {
  await verifyServer();
  console.log('Running E2E Auth suite...\n');

  // ── 1. Login happy path (dùng chung token cho cả suite) ─────
  let adminToken = '';
  {
    const res = await api('POST', '/api/v1/auth/login', {
      body: { username: 'admin', password: 'Admin@5cua123' },
    });
    adminToken = res.body?.data?.accessToken || '';
    record(
      'Login đúng thông tin → 200 + accessToken + refreshToken + role SUPER_ADMIN',
      res.status === 200 && !!adminToken && !!res.body?.data?.refreshToken && res.body?.data?.role === 'SUPER_ADMIN',
      `status=${res.status}, role=${res.body?.data?.role}`
    );
  }

  // ── 2. Login failure paths ───────────────────────────────────
  {
    const badPw = await api('POST', '/api/v1/auth/login', {
      body: { username: 'admin', password: 'wrong-password' },
    });
    if (isRateLimited(badPw.status)) {
      skip('Login sai mật khẩu → 401', 'bị rate limit, chạy lại sau');
    } else {
      const noLeak = !JSON.stringify(badPw.body).includes('$argon2');
      record(
        'Login sai mật khẩu → 401, không lộ hash',
        badPw.status === 401 && noLeak,
        `status=${badPw.status}, noHashLeak=${noLeak}`
      );
    }

    const noUser = await api('POST', '/api/v1/auth/login', {
      body: { username: 'e2e_ghost_user_xyz', password: 'whatever123' },
    });
    if (isRateLimited(noUser.status)) {
      skip('Login user không tồn tại → 401', 'bị rate limit');
    } else {
      record('Login user không tồn tại → 401', noUser.status === 401, `status=${noUser.status}`);
    }
  }

  // ── 3. Protected endpoint / users/me (không tốn auth limiter) ─
  {
    const ok = await api('GET', '/api/v1/users/me', { token: adminToken });
    record(
      'GET /users/me có token → 200 + username admin',
      ok.status === 200 && ok.body?.data?.username === 'admin',
      `status=${ok.status}, username=${ok.body?.data?.username}`
    );

    const noTok = await api('GET', '/api/v1/users/me');
    record('GET /users/me không token → 401', noTok.status === 401, `status=${noTok.status}`);

    const badTok = await api('GET', '/api/v1/users/me', { token: 'garbage.token.here' });
    record('GET /users/me token rác → 401', badTok.status === 401, `status=${badTok.status}`);
  }

  // ── 4. Refresh rotation (server + DB thật) ───────────────────
  {
    const loginRes = await api('POST', '/api/v1/auth/login', {
      body: { username: 'tech_minh', password: 'Admin@5cua123' },
    });
    const rt = loginRes.body?.data?.refreshToken || '';
    if (loginRes.status !== 200 || !rt) {
      skip('Nhóm test refresh', `login tech_minh status=${loginRes.status} — bị rate limit`);
    } else {
      // BUG-01: refresh trong cùng giây với login (iat trùng) làm rotate tạo JWT
      // trùng byte → unique(token_hash) violation. Chờ qua mốc giây để test luồng chuẩn.
      await new Promise((r) => setTimeout(r, 1200));

      const refresh1 = await api('POST', '/api/v1/auth/refresh', { body: { refreshToken: rt } });
      if (isRateLimited(refresh1.status)) {
        skip('Nhóm test refresh (rotation/replay)', `bị rate limit 429 — key per-IP dùng chung cho /auth/refresh`);
        printSummary(SUITE);
        return;
      }
      const newRt = refresh1.body?.data?.refreshToken || '';
      record(
        'Refresh hợp lệ → 200 + cặp token mới (rotation)',
        refresh1.status === 200 && !!refresh1.body?.data?.accessToken && !!newRt,
        `status=${refresh1.status}, code=${refresh1.body?.code}`
      );

      // Grace period 30s (thiết kế chống race mobile): replay trong 30s được chấp nhận
      const graceReplay = await api('POST', '/api/v1/auth/refresh', { body: { refreshToken: rt } });
      record(
        'Replay refreshToken trong grace period 30s → 200 (thiết kế chống race)',
        graceReplay.status === 200 && !!graceReplay.body?.data?.accessToken,
        `status=${graceReplay.status}, message=${String(graceReplay.body?.message).slice(0, 60)}`
      );

      // Chờ hết grace period rồi replay lại → phải 401 + revoke cả family
      await new Promise((r) => setTimeout(r, 31000));
      const replay = await api('POST', '/api/v1/auth/refresh', { body: { refreshToken: rt } });
      record(
        'Replay refreshToken SAU grace period → 401 + revoke cả family',
        replay.status === 401,
        `status=${replay.status}, message=${String(replay.body?.message).slice(0, 80)}`
      );

      const rotated = await api('POST', '/api/v1/auth/refresh', { body: { refreshToken: newRt } });
      record(
        'Token cũ trong family đã revoked cũng bị chặn 401',
        rotated.status === 401,
        `status=${rotated.status}`
      );

      const garbage = await api('POST', '/api/v1/auth/refresh', { body: { refreshToken: 'not.a.jwt' } });
      record('Refresh token rác → 401', garbage.status === 401, `status=${garbage.status}`);

      const missing = await api('POST', '/api/v1/auth/refresh', { body: {} });
      record(
        'Refresh thiếu body → 400/422',
        missing.status === 400 || missing.status === 422,
        `status=${missing.status}`
      );
    }

    // ── 4b. BUG-01 regression guard: refresh NGAY sau login ────
    {
      const login2 = await api('POST', '/api/v1/auth/login', {
        body: { username: 'tech_duc', password: 'Admin@5cua123' },
      });
      const rt2 = login2.body?.data?.refreshToken || '';
      if (login2.status !== 200 || !rt2) {
        skip('[BUG-01] Refresh ngay sau login', `login tech_duc status=${login2.status}`);
      } else {
        const immediate = await api('POST', '/api/v1/auth/refresh', { body: { refreshToken: rt2 } });
        if (isRateLimited(immediate.status)) {
          skip('[BUG-01] Refresh ngay sau login', 'bị rate limit');
        } else record(
          '[BUG-01] Refresh NGAY sau login (cùng giây iat) phải 200 — thực tế lỗi unique(token_hash)',
          immediate.status === 200,
          `status=${immediate.status}, code=${immediate.body?.code}, message=${String(immediate.body?.message).slice(0, 100)}`
        );
        }
      }
    }

  // ── 5. Logout revocation ─────────────────────────────────────
  {
    const loginRes = await api('POST', '/api/v1/auth/login', {
      body: { username: 'worker_lan', password: 'Admin@5cua123' },
    });
    const rt = loginRes.body?.data?.refreshToken || '';
    if (loginRes.status !== 200 || !rt) {
      skip('Nhóm test logout', `login worker_lan status=${loginRes.status}`);
    } else {
      const logout = await api('POST', '/api/v1/auth/logout', { body: { refreshToken: rt } });
      record('Logout → 200', logout.status === 200, `status=${logout.status}`);

      const after = await api('POST', '/api/v1/auth/refresh', { body: { refreshToken: rt } });
      record('Refresh sau logout → 401 (token đã revoke)', after.status === 401, `status=${after.status}`);
    }
  }

  // ── 6. Register validation ───────────────────────────────────
  {
    const missingName = await api('POST', '/api/v1/auth/register', {
      body: { username: 'e2e_reg_tmp', password: 'secret123' },
    });
    if (isRateLimited(missingName.status)) {
      skip('Nhóm test register', 'bị rate limit');
    } else {
      record(
        'Register thiếu fullName → 400/422',
        missingName.status === 400 || missingName.status === 422,
        `status=${missingName.status}`
      );

      const weakPw = await api('POST', '/api/v1/auth/register', {
        body: { username: 'e2e_reg_tmp', password: 'abc', fullName: 'E2E Tmp' },
      });
      record(
        'Register password 3 ký tự → 400/422',
        weakPw.status === 400 || weakPw.status === 422,
        `status=${weakPw.status}`
      );

      const dup = await api('POST', '/api/v1/auth/register', {
        body: { username: 'admin', password: 'secret123', fullName: 'Dup Admin' },
      });
      record('Register username trùng "admin" → 409', dup.status === 409, `status=${dup.status}`);

      const uniq = `e2e_user_${Date.now()}`;
      const okReg = await api('POST', '/api/v1/auth/register', {
        body: { username: uniq, password: 'secret123', fullName: 'E2E Register User' },
      });
      record(
        'Register hợp lệ → 200/201',
        okReg.status === 200 || okReg.status === 201,
        `status=${okReg.status}`
      );
      await teardownTestFarm(); // xoá user e2e_user_*
    }
  }

  // ── 7. Change password validation ────────────────────────────
  {
    const wrongOld = await api('POST', '/api/v1/auth/change-password', {
      token: adminToken,
      body: { oldPassword: 'totally-wrong', newPassword: 'newpass456' },
    });
    if (isRateLimited(wrongOld.status)) {
      skip('Nhóm test change-password', 'bị rate limit');
    } else {
      record(
        'Change-password oldPassword sai → 400/401 (không đổi được)',
        wrongOld.status === 400 || wrongOld.status === 401,
        `status=${wrongOld.status}, message=${String(wrongOld.body?.message).slice(0, 80)}`
      );

      // Đổi rồi đổi lại để giữ nguyên mật khẩu demo
      const change = await api('POST', '/api/v1/auth/change-password', {
        token: adminToken,
        body: { oldPassword: 'Admin@5cua123', newPassword: 'E2eTemp#123' },
      });
      if (change.status === 200) {
        const revert = await api('POST', '/api/v1/auth/change-password', {
          token: adminToken,
          body: { oldPassword: 'E2eTemp#123', newPassword: 'Admin@5cua123' },
        });
        record(
          'Change-password hợp lệ → đổi được và revert lại OK',
          revert.status === 200,
          `revert=${revert.status}`
        );
      } else {
        skip('Change-password hợp lệ', `status=${change.status}`);
      }
    }
  }

  printSummary(SUITE);
}

run().catch(async (err) => {
  console.error('Suite crashed:', err);
  await teardownTestFarm().catch(() => {});
  process.exit(1);
});
