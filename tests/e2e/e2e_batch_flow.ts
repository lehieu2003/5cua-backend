/**
 * E2E Batch lifecycle suite — tạo pond qua API, tạo đợt nhập + phân bổ hộp,
 * trạng thái, validation, summary. Toàn bộ trong E2E-TEST-FARM.
 */
import { api, record, printSummary, verifyServer, setupTestFarm, teardownTestFarm, login, type TestFarm } from './helpers';

const SUITE = 'E2E BATCH FLOW TEST RESULTS';

async function createBatch(adminToken: string, farm: TestFarm, name: string, boxIds: number[], extra?: Record<string, any>) {
  return api('POST', '/api/v1/batches', {
    token: adminToken,
    body: {
      farmId: farm.farmId,
      name,
      productId: farm.productId,
      importDate: new Date().toISOString().slice(0, 10),
      initialQuantity: 20,
      initialWeight: 9,
      warehouses: [
        {
          id: String(farm.farmId),
          product_uom_qty: '20',
          blocks: [{ id: String(farm.blockId), locations: boxIds.map((id) => ({ id: String(id) })) }],
        },
      ],
      ...extra,
    },
  });
}

async function getBoxStatuses(adminToken: string, pondId: number): Promise<Map<number, string>> {
  const res = await api('GET', `/api/v1/ponds/${pondId}/boxes`, { token: adminToken });
  const boxes = res.body?.data?.boxes ?? res.body?.data ?? [];
  return new Map(boxes.map((b: any) => [b.id, String(b.status || '').toUpperCase()]));
}

async function run() {
  await verifyServer();
  const farm = await setupTestFarm();
  const adminToken = await login('admin', 'Admin@5cua123');
  const ts = Date.now();

  try {
    // ── 1. Tạo pond qua API, kiểm tra toán học lưới hộp ────────
    const pondRes = await api('POST', '/api/v1/ponds', {
      token: adminToken,
      body: { farmId: farm.farmId, code: `E2E-POND-API-${ts}`, name: 'E2E Pond API', numBlock: 1, numRow: 2, numColumn: 2 },
    });
    const apiPondId = pondRes.body?.data?.id ?? pondRes.body?.data?.pond?.id;
    record(
      'POST /ponds tạo ao 1x2x2 → 200/201',
      (pondRes.status === 200 || pondRes.status === 201) && !!apiPondId,
      `status=${pondRes.status}, pondId=${apiPondId}`
    );

    if (!apiPondId) {
      printSummary(SUITE);
      return;
    }

    const boxesRes = await api('GET', `/api/v1/ponds/${apiPondId}/boxes`, { token: adminToken });
    const boxes = boxesRes.body?.data?.boxes ?? boxesRes.body?.data ?? [];
    record(
      'Ao mới có đúng 4 hộp EMPTY (đúng toán học grid)',
      boxes.length === 4 && boxes.every((b: any) => String(b.status).toUpperCase() === 'EMPTY'),
      `count=${boxes.length}, statuses=${boxes.map((b: any) => b.status).join(',')}`
    );

    // ── 2. Validation tạo pond ─────────────────────────────────
    const badPond = await api('POST', '/api/v1/ponds', {
      token: adminToken,
      body: { farmId: farm.farmId, name: 'E2E Bad Pond', numBlock: 1, numRow: 0, numColumn: 2 },
    });
    record(
      'POST /ponds thiếu code / numRow=0 → 400/422',
      badPond.status === 400 || badPond.status === 422,
      `status=${badPond.status}, body=${JSON.stringify(badPond.body).slice(0, 120)}`
    );

    // ── 3. Tạo batch A, cấp 2 hộp đầu của ao API ───────────────
    const pondBoxIds = boxes.map((b: any) => b.id);
    const batchA = await createBatch(adminToken, farm, `E2E-BATCH-A-${ts}`, [pondBoxIds[0], pondBoxIds[1]]);
    const batchAId = batchA.body?.data?.id ?? batchA.body?.data?.batch?.id ?? batchA.body?.data?.batch_id;
    record(
      'POST /batches tạo đợt A cấp 2 hộp → 201/200',
      (batchA.status === 200 || batchA.status === 201) && !!batchAId,
      `status=${batchA.status}, id=${batchAId}, body=${JSON.stringify(batchA.body).slice(0, 150)}`
    );

    if (!batchAId) {
      printSummary(SUITE);
      return;
    }

    const detailA = await api('GET', `/api/v1/batches/${batchAId}`, { token: adminToken });
    const dataA = detailA.body?.data ?? {};
    record(
      'GET /batches/:id → status DRAFT, currentQuantity khởi tạo',
      detailA.status === 200 && String(dataA.status ?? dataA.batch?.status ?? '').toUpperCase() === 'DRAFT',
      `status=${detailA.status}, batchStatus=${dataA.status ?? dataA.batch?.status}`
    );

    const boxMapA = await getBoxStatuses(adminToken, apiPondId);
    record(
      '2 hộp đã cấp chuyển OCCUPIED, 2 hộp còn EMPTY',
      boxMapA.get(pondBoxIds[0]) === 'OCCUPIED' && boxMapA.get(pondBoxIds[1]) === 'OCCUPIED' &&
        boxMapA.get(pondBoxIds[2]) === 'EMPTY' && boxMapA.get(pondBoxIds[3]) === 'EMPTY',
      `statuses=${[...boxMapA.entries()].map(([id, s]) => `${id}:${s}`).join(' ')}`
    );

    // ── 4. Trùng mã đợt → 409 ──────────────────────────────────
    const dupBatch = await createBatch(adminToken, farm, `E2E-BATCH-A-${ts}`, [pondBoxIds[2]]);
    record('Tạo đợt trùng mã → 409', dupBatch.status === 409, `status=${dupBatch.status}`);

    // ── 5. Cấp hộp đã OCCUPIED → phải bị chặn ──────────────────
    const overlap = await createBatch(adminToken, farm, `E2E-BATCH-OVERLAP-${ts}`, [pondBoxIds[0], pondBoxIds[2]]);
    record(
      'Đợt mới yêu cầu hộp đang OCCUPIED → 400/409',
      overlap.status === 400 || overlap.status === 409,
      `status=${overlap.status}, body=${JSON.stringify(overlap.body).slice(0, 150)}`
    );
    if (overlap.status === 200 || overlap.status === 201) {
      const boxMapAfter = await getBoxStatuses(adminToken, apiPondId);
      record(
        '  [BUG] Hộp OCCUPIED bị cấp chồng — batchId bị ghi đè',
        false,
        `box ${pondBoxIds[0]} status=${boxMapAfter.get(pondBoxIds[0])}`
      );
    }

    // ── 6. Validation số lượng & sản phẩm ──────────────────────
    const zeroQty = await createBatch(adminToken, farm, `E2E-BATCH-ZERO-${ts}`, [pondBoxIds[2]], { initialQuantity: 0 });
    record('initialQuantity=0 → 400', zeroQty.status === 400, `status=${zeroQty.status}, body=${JSON.stringify(zeroQty.body).slice(0, 120)}`);

    const badProduct = await createBatch(adminToken, farm, `E2E-BATCH-NOPROD-${ts}`, [pondBoxIds[2]], { productId: 999999 });
    record('productId không tồn tại → 404/400', badProduct.status === 404 || badProduct.status === 400, `status=${badProduct.status}`);

    // ── 7. Chuyển trạng thái đợt ───────────────────────────────
    const toInProgress = await api('PATCH', `/api/v1/batches/${batchAId}/status`, {
      token: adminToken, body: { status: 'IN_PROGRESS' },
    });
    const detailAfter = await api('GET', `/api/v1/batches/${batchAId}`, { token: adminToken });
    const stAfter = detailAfter.body?.data?.status ?? detailAfter.body?.data?.batch?.status;
    record(
      'PATCH status IN_PROGRESS → 200 và đổi thật',
      toInProgress.status === 200 && String(stAfter).toUpperCase() === 'IN_PROGRESS',
      `patch=${toInProgress.status}, now=${stAfter}`
    );

    const garbage = await api('PATCH', `/api/v1/batches/${batchAId}/status`, {
      token: adminToken, body: { status: 'KHUNG_YEU' },
    });
    const stAfterGarbage = String(
      (await api('GET', `/api/v1/batches/${batchAId}`, { token: adminToken })).body?.data?.status ?? ''
    ).toUpperCase();
    record(
      'PATCH status rác "KHUNG_YEU" → phải 400/422 hoặc giữ nguyên status (thực tế 200 + âm thầm về DRAFT = BUG-03)',
      (garbage.status === 400 || garbage.status === 422) || stAfterGarbage === 'IN_PROGRESS',
      `patch=${garbage.status}, status_after=${stAfterGarbage}`
    );

    const done = await api('PATCH', `/api/v1/batches/${batchAId}/status`, {
      token: adminToken, body: { status: 'COMPLETED' },
    });
    record(
      'PATCH status COMPLETED (IN_PROGRESS → COMPLETED) → 200',
      done.status === 200,
      `status=${done.status}`
    );

    // ── 8. Summary ─────────────────────────────────────────────
    const summary = await api('GET', `/api/v1/batches/summary?farmId=${farm.farmId}`, { token: adminToken });
    const sum = summary.body?.data ?? {};
    const sane =
      summary.status === 200 &&
      typeof sum === 'object' &&
      Object.keys(sum).length > 0;
    record(
      'GET /batches/summary?farmId → 200, có số liệu',
      sane,
      `status=${summary.status}, data=${JSON.stringify(sum).slice(0, 150)}`
    );
  } finally {
    await teardownTestFarm();
  }

  printSummary(SUITE);
}

run().catch(async (err) => {
  console.error('Suite crashed:', err);
  await teardownTestFarm().catch(() => {});
  process.exit(1);
});
