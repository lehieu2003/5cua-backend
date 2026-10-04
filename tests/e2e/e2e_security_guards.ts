/**
 * E2E Security Guards suite — kiểm tra các endpoint GHI có bắt buộc đăng nhập hay không.
 * Quy tắc: endpoint có authGuard thì mọi request không token PHẢI trả 401.
 * Bất kỳ status nào khác (200/201/400/404/500) đều chứng minh request được xử lý
 * mà không cần đăng nhập = endpoint lộ (authGuard bị thiếu).
 * Các PATCH/DELETE dùng id 999999999 để không đụng dữ liệu seed.
 */
import { api, record, printSummary, verifyServer, setupTestFarm, teardownTestFarm, login } from './helpers';

const SUITE = 'E2E SECURITY GUARDS TEST RESULTS';

async function run() {
  await verifyServer();
  const farm = await setupTestFarm();
  const adminToken = await login('admin', 'Admin@5cua123');

  // Lấy 1 water parameter thật cho payload hợp lệ
  const paramsRes = await api('GET', '/api/v1/water/parameters');
  const paramId = paramsRes.body?.data?.[0]?.id ?? 1;

  // Pond riêng cho security suite để không đụng trạng thái hộp của suite khác
  const pondRes = await api('POST', '/api/v1/ponds', {
    token: adminToken,
    body: { farmId: farm.farmId, code: 'E2E-POND-SEC', name: 'E2E Pond SEC', numBlock: 1, numRow: 1, numColumn: 2 },
  });
  const secPondId = pondRes.body?.data?.id ?? pondRes.body?.data?.pond?.id;
  if (!secPondId) {
    console.error('Không tạo được pond cho security suite:', JSON.stringify(pondRes.body).slice(0, 200));
    printSummary(SUITE);
    return;
  }
  const secPondBoxes = await api('GET', `/api/v1/ponds/${secPondId}/boxes`, { token: adminToken });
  const boxIds: number[] = (secPondBoxes.body?.data?.boxes ?? secPondBoxes.body?.data ?? [])
    .map((b: any) => b.id)
    .filter((id: any) => typeof id === 'number');
  const [boxA, boxB] = boxIds;

  console.log(`Security pond #${secPondId} boxes: ${boxIds.join(',')}\n`);

  const expect401 = async (name: string, method: string, path: string, body?: any) => {
    const res = await api(method, path, { body });
    record(
      `[GUARD] ${method} ${path.replace(/\d+/, ':id')} không token → 401`,
      res.status === 401,
      `status=${res.status}, code=${res.body?.code}, message=${String(res.body?.message).slice(0, 80)}`
    );
  };

  await expect401('moves', 'POST', '/api/v1/moves', {
    sourceBoxId: boxA, destBoxId: boxB, reason: 'E2E guard test',
  });
  await expect401('feeding', 'POST', '/api/v1/feeding', {
    actionType: 'feeding', pondId: secPondId, items: [{ productId: farm.productId, qty: 1 }],
  });
  await expect401('water/checks', 'POST', '/api/v1/water/checks', {
    warehouseId: String(secPondId), waterChecks: [{ parameterId: paramId, value: 7 }],
  });
  await expect401('inspections/cleaning', 'POST', '/api/v1/inspections/cleaning', {
    warehouseId: String(secPondId), boxs: [{ id: String(boxA), isSoftShell: true }],
  });
  await expect401('inspections/convert-crab', 'POST', '/api/v1/inspections/convert-crab', {
    warehouseId: String(secPondId), productId: String(farm.productId), productIdNew: String(farm.productId), boxs: [{ id: String(boxA) }],
  });
  await expect401('batches/:id/status', 'PATCH', '/api/v1/batches/999999999/status', { status: 'IN_PROGRESS' });
  await expect401('moves/:id/status', 'PATCH', '/api/v1/moves/999999999/status', { status: 'DONE' });
  await expect401('exports/:id/status', 'PATCH', '/api/v1/exports/999999999/status', { status: 'CONFIRMED' });
  await expect401('notifications/:id', 'DELETE', '/api/v1/notifications/999999999');
  await expect401('ponds/:id', 'PUT', `/api/v1/ponds/${secPondId}`, { name: 'E2E Hijack Attempt' });

  // ── RBAC: WORKER không được phép các thao tác quản trị ───────
  const workerToken = await login('worker_tuan', 'Admin@5cua123');

  const workerBatch = await api('POST', '/api/v1/batches', {
    token: workerToken,
    body: {
      farmId: farm.farmId, name: `E2E-BATCH-WORKER-${Date.now()}`, productId: farm.productId,
      importDate: new Date().toISOString().slice(0, 10), initialQuantity: 10, initialWeight: 4.5,
      warehouses: [{ id: String(farm.farmId), product_uom_qty: '10', blocks: [{ id: String(farm.blockId), locations: [{ id: String(boxA) }] }] }],
    },
  });
  record(
    '[RBAC] WORKER tạo batch → 403',
    workerBatch.status === 403,
    `status=${workerBatch.status}, code=${workerBatch.body?.code}, message=${String(workerBatch.body?.message).slice(0, 80)}`
  );

  const workerPond = await api('POST', '/api/v1/ponds', {
    token: workerToken,
    body: { farmId: farm.farmId, code: 'E2E-POND-WORKER', name: 'E2E Worker Pond', numBlock: 1, numRow: 1, numColumn: 1 },
  });
  record(
    '[RBAC] WORKER tạo pond → 403',
    workerPond.status === 403,
    `status=${workerPond.status}, message=${String(workerPond.body?.message).slice(0, 80)}`
  );

  const workerExport = await api('POST', '/api/v1/exports', {
    token: workerToken,
    body: { farmId: farm.farmId, boxes: [{ boxId: boxA, productId: farm.productId, weight: 0.4, price: 100000 }] },
  });
  record(
    '[RBAC] WORKER tạo export → 403',
    workerExport.status === 403,
    `status=${workerExport.status}, message=${String(workerExport.body?.message).slice(0, 80)}`
  );

  await teardownTestFarm();
  printSummary(SUITE);
}

run().catch(async (err) => {
  console.error('Suite crashed:', err);
  await teardownTestFarm().catch(() => {});
  process.exit(1);
});
