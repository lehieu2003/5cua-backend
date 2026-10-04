/**
 * E2E Farm-scope authorization suite (SEC-03) + hardening (SEC-04).
 * Ma trận membership seed: manager_baclieu = trại 1+3; worker_tuan/tech_minh = trại 1;
 * admin = tất cả. Farm id tra cứu động theo code để không hardcode.
 */
import { api, record, printSummary, verifyServer, login, teardownTestFarm } from './helpers';
import prisma from '../../src/database/prisma.service';

const SUITE = 'E2E FARM SCOPE & HARDENING TEST RESULTS';
const BASE = 'http://localhost:5000';

async function rawFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, init);
}

async function farmIdByCode(code: string, adminToken: string): Promise<number> {
  const res = await api('GET', '/api/v1/farms', { token: adminToken });
  const farms = res.body?.data ?? [];
  const f = farms.find((x: any) => x.code === code);
  if (!f) throw new Error(`Không tìm thấy farm ${code}`);
  return f.id;
}

async function run() {
  await verifyServer();
  const adminToken = await login('admin', 'Admin@5cua123');
  const workerToken = await login('worker_tuan', 'Admin@5cua123');
  const managerToken = await login('manager_baclieu', 'Admin@5cua123');

  const farm1 = await farmIdByCode('FARM-BL-01', adminToken);
  const farm2 = await farmIdByCode('FARM-CM-01', adminToken);
  const farm3 = await farmIdByCode('FARM-KG-01', adminToken);

  // id batch của trại 2 (để test IDOR detail)
  const batches2 = await api('GET', `/api/v1/batches?farmId=${farm2}`, { token: adminToken });
  const batch2Id = (batches2.body?.data ?? [])[0]?.id;
  const batches1 = await api('GET', `/api/v1/batches?farmId=${farm1}`, { token: adminToken });
  const batch1Id = (batches1.body?.data ?? [])[0]?.id;

  // User tự đăng ký, không thuộc trại nào
  const scopeUser = `e2e_scope_${Date.now()}`;
  const reg = await api('POST', '/api/v1/auth/register', {
    body: { username: scopeUser, password: 'Scope@123', fullName: 'Scope Test' },
  });
  record(
    '[SCOPE] Đăng ký công khai (không farm) → 201 + WORKER/standard',
    reg.status === 201 && reg.body?.data?.role === 'WORKER' && String(reg.body?.data?.memberType) === 'standard',
    `status=${reg.status}, role=${reg.body?.data?.role}, memberType=${reg.body?.data?.memberType}`
  );
  const scopeLogin = await api('POST', '/api/v1/auth/login', {
    body: { username: scopeUser, password: 'Scope@123' },
  });
  const scopeToken = scopeLogin.body?.data?.accessToken || '';

  try {
    // ── 1-3. Ma trận theo farmId trên query ────────────────────
    for (const [tok, label, fid, expect] of [
      [adminToken, 'admin', farm1, 200],
      [adminToken, 'admin', farm2, 200],
      [workerToken, 'worker_tuan', farm1, 200],
      [workerToken, 'worker_tuan', farm2, 403],
      [workerToken, 'worker_tuan', farm3, 403],
      [managerToken, 'manager_baclieu', farm3, 200],
      [managerToken, 'manager_baclieu', farm2, 403],
      [scopeToken, 'user-ko-thuoc-trai', farm1, 403],
    ] as Array<[string, string, number, number]>) {
      const res = await api('GET', `/api/v1/batches?farmId=${fid}`, { token: tok });
      record(
        `[SCOPE] ${label} GET /batches?farmId=${fid} → ${expect}`,
        res.status === expect,
        `got=${res.status}, message=${String(res.body?.message).slice(0, 60)}`
      );
    }

    // ── 4. Thiếu farmId + master data ──────────────────────────
    const noFarm = await api('GET', '/api/v1/batches', { token: workerToken });
    record(
      '[SCOPE] worker GET /batches thiếu farmId → 400',
      noFarm.status === 400,
      `got=${noFarm.status}`
    );
    const masterData = await api('GET', '/api/v1/feeding/products?categoryType=feed', { token: scopeToken });
    record(
      '[SCOPE] master-data /feeding/products không farmId → 200 (toàn cục)',
      masterData.status === 200,
      `got=${masterData.status}`
    );

    // ── 5. IDOR qua detail theo record id ──────────────────────
    if (batch2Id) {
      const r1 = await api('GET', `/api/v1/batches/${batch2Id}`, { token: workerToken });
      record(
        `[SCOPE] worker GET /batches/<id-trại-2> → 403`,
        r1.status === 403,
        `got=${r1.status}`
      );
    }
    if (batch1Id) {
      const r2 = await api('GET', `/api/v1/batches/${batch1Id}`, { token: workerToken });
      record(
        `[SCOPE] worker GET /batches/<id-trại-1> → 200`,
        r2.status === 200,
        `got=${r2.status}`
      );
    }
    const ponds2 = await api('GET', `/api/v1/ponds?farmId=${farm2}`, { token: adminToken });
    const pond2Id = (ponds2.body?.data ?? [])[0]?.id;
    if (pond2Id) {
      const r3 = await api('GET', `/api/v1/ponds/${pond2Id}`, { token: workerToken });
      record(
        `[SCOPE] worker GET /ponds/<id-trại-2> → 403`,
        r3.status === 403,
        `got=${r3.status}`
      );
    }

    // ── 6. Ghi chéo trại qua body ──────────────────────────────
    const crossWrite = await api('POST', '/api/v1/batches', {
      token: managerToken,
      body: {
        farmId: farm2,
        name: `E2E-CROSS-${Date.now()}`,
        productId: 1,
        importDate: new Date().toISOString().slice(0, 10),
        initialQuantity: 1,
        initialWeight: 1,
        warehouses: [],
      },
    });
    record(
      '[SCOPE] manager trại 1 POST /batches body farmId=trại 2 → 403',
      crossWrite.status === 403,
      `got=${crossWrite.status}, message=${String(crossWrite.body?.message).slice(0, 60)}`
    );

    // ── 7. /farms lọc theo membership ──────────────────────────
    const farmsW = await api('GET', '/api/v1/farms', { token: workerToken });
    const farmsWorker = farmsW.body?.data ?? [];
    record(
      '[SCOPE] GET /farms worker chỉ thấy trại mình thuộc',
      farmsW.status === 200 && Array.isArray(farmsWorker) && farmsWorker.length === 1 && farmsWorker[0].id === farm1,
      `got=${farmsW.status}, count=${farmsWorker.length}, ids=${farmsWorker.map((f: any) => f.id).join(',')}`
    );
    const farmsA = await api('GET', '/api/v1/farms', { token: adminToken });
    record(
      '[SCOPE] GET /farms admin thấy tất cả',
      farmsA.status === 200 && (farmsA.body?.data ?? []).length >= 4,
      `count=${(farmsA.body?.data ?? []).length}`
    );

    // ── 7b. Query theo pondId → resolve về farm (guard phải nhận diện) ──
    const pond1Row = await prisma.pond.findFirst({ where: { farmId: farm1 }, select: { id: true } });
    const pond2Row = await prisma.pond.findFirst({ where: { farmId: farm2 }, select: { id: true } });
    if (pond1Row && pond2Row) {
      const own = await api('GET', `/api/v1/water/checks?pondId=${pond1Row.id}`, { token: workerToken });
      record(
        '[SCOPE] worker GET /water/checks?pondId=<trại-1> → 200',
        own.status === 200,
        `got=${own.status}`
      );
      const other = await api('GET', `/api/v1/water/checks?pondId=${pond2Row.id}`, { token: workerToken });
      record(
        '[SCOPE] worker GET /water/checks?pondId=<trại-2> → 403',
        other.status === 403,
        `got=${other.status}`
      );
    }

    // ── 8. Detail endpoint farm-scoped khác ────────────────────
    const exports2 = await api('GET', `/api/v1/exports?farmId=${farm2}`, { token: adminToken });
    const export2Id = (exports2.body?.data ?? [])[0]?.id;
    if (export2Id) {
      const r = await api('GET', `/api/v1/exports/${export2Id}`, { token: workerToken });
      record(
        '[SCOPE] worker GET /exports/<id-trại-2> → 403',
        r.status === 403,
        `got=${r.status}`
      );
    }

    // ── 9. CORS whitelist (SEC-04) ─────────────────────────────
    const okOrigin = await rawFetch('/health', { headers: { Origin: 'http://localhost:3000' } });
    const evilOrigin = await rawFetch('/health', { headers: { Origin: 'http://evil.example.com' } });
    record(
      '[HARDEN] CORS: origin cho phép có ACAO, origin lạ không có',
      okOrigin.headers.get('access-control-allow-origin') === 'http://localhost:3000' &&
        !evilOrigin.headers.get('access-control-allow-origin'),
      `ok=${okOrigin.headers.get('access-control-allow-origin')}, evil=${evilOrigin.headers.get('access-control-allow-origin')}`
    );

    // ── 10. Body limit 5MB (SEC-04) ────────────────────────────
    const bigBody = await rawFetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'x'.repeat(6 * 1024 * 1024) }),
    });
    record(
      '[HARDEN] JSON body 6MB → 413',
      bigBody.status === 413,
      `got=${bigBody.status}`
    );

    // ── 11. Swagger tắt ở production (verify bằng code-gate, dev vẫn 200) ──
    const docs = await rawFetch('/api-docs/');
    record(
      '[HARDEN] /api-docs ở dev vẫn mở (prod gate đã có ở app.ts)',
      docs.status === 200,
      `got=${docs.status}`
    );
  } finally {
    // dọn user scope test
    await prisma.refreshToken.deleteMany({ where: { user: { username: { startsWith: 'e2e_scope_' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'e2e_scope_' } } });
  }

  printSummary(SUITE);
}

run().catch(async (err) => {
  console.error('Suite crashed:', err);
  await teardownTestFarm().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
