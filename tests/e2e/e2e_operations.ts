/**
 * E2E Operations suite — feeding, inspection, water check (biên ngưỡng), moves.
 * Toàn bộ trong E2E-TEST-FARM. Tự tạo batch để có hộp OCCUPIED cho move test.
 */
import { api, record, printSummary, verifyServer, setupTestFarm, teardownTestFarm, login, type TestFarm } from './helpers';
import prisma from '../../src/database/prisma.service';

const SUITE = 'E2E OPERATIONS TEST RESULTS';

async function run() {
  await verifyServer();
  const farm = await setupTestFarm();
  const adminToken = await login('admin', 'Admin@5cua123');
  const ts = Date.now();

  try {
    // ── Arrange: tạo batch cấp 3 hộp đầu của pond chính ────────
    const batchRes = await api('POST', '/api/v1/batches', {
      token: adminToken,
      body: {
        farmId: farm.farmId,
        name: `E2E-BATCH-OPS-${ts}`,
        productId: farm.productId,
        importDate: new Date().toISOString().slice(0, 10),
        initialQuantity: 30,
        initialWeight: 13.5,
        warehouses: [{
          id: String(farm.farmId),
          product_uom_qty: '30',
          blocks: [{ id: String(farm.blockId), locations: farm.emptyBoxIds.slice(0, 2).map((id) => ({ id: String(id) })) }],
        }],
      },
    });
    const batchId = batchRes.body?.data?.id ?? batchRes.body?.data?.batch?.id;
    if (!batchId) {
      console.error('Không tạo được batch OPS:', JSON.stringify(batchRes.body).slice(0, 200));
      printSummary(SUITE);
      return;
    }
    const [box0, box1, box2] = farm.emptyBoxIds; // box2 giữ EMPTY cho move test

    // ── 1. Feeding ─────────────────────────────────────────────
    const feedOk = await api('POST', '/api/v1/feeding', {
      token: adminToken,
      body: { actionType: 'feeding', pondId: farm.pondId, items: [{ productId: farm.productId, qty: 0.5 }], note: 'E2E feeding' },
    });
    record(
      'POST /feeding hợp lệ → 200/201',
      feedOk.status === 200 || feedOk.status === 201,
      `status=${feedOk.status}, body=${JSON.stringify(feedOk.body).slice(0, 120)}`
    );

    const feedList = await api('GET', `/api/v1/feeding?farmId=${farm.farmId}&actionType=feeding`, { token: adminToken });
    const feedItems = feedList.body?.data?.data ?? feedList.body?.data?.items ?? [];
    record(
      'GET /feeding?farmId → danh sách có bản ghi vừa tạo (note E2E feeding)',
      feedList.status === 200 && Array.isArray(feedItems) && feedItems.some((f: any) => f.note === 'E2E feeding'),
      `status=${feedList.status}, count=${Array.isArray(feedItems) ? feedItems.length : 'không phải mảng'}, shape=${JSON.stringify(feedList.body?.data).slice(0, 80)}`
    );

    const feedZero = await api('POST', '/api/v1/feeding', {
      token: adminToken,
      body: { actionType: 'feeding', pondId: farm.pondId, items: [{ productId: farm.productId, qty: 0 }] },
    });
    record(
      'Feeding qty=0 → 400/422 (500 = bug)',
      feedZero.status === 400 || feedZero.status === 422,
      `status=${feedZero.status}, body=${JSON.stringify(feedZero.body).slice(0, 120)}`
    );

    const feedBadType = await api('POST', '/api/v1/feeding', {
      token: adminToken,
      body: { actionType: 'abc', pondId: farm.pondId, items: [{ productId: farm.productId, qty: 1 }] },
    });
    record(
      'Feeding actionType "abc" → 400/422 (500 = bug)',
      feedBadType.status === 400 || feedBadType.status === 422,
      `status=${feedBadType.status}`
    );

    // ── 2. Inspection cleaning ─────────────────────────────────
    const cleanOk = await api('POST', '/api/v1/inspections/cleaning', {
      token: adminToken,
      body: {
        warehouseId: String(farm.pondId),
        softShellQuantity: '1',
        deadQuantity: '0',
        boxs: [{ id: String(box0), isSoftShell: true, isDead: false }],
      },
    });
    record(
      'POST /inspections/cleaning hợp lệ → 200/201',
      cleanOk.status === 200 || cleanOk.status === 201,
      `status=${cleanOk.status}, body=${JSON.stringify(cleanOk.body).slice(0, 150)}`
    );

    const inspectRows = await prisma.inspectionCleaningRecord.count({ where: { pondId: farm.pondId } });
    record('Inspection record được ghi DB', inspectRows > 0, `count=${inspectRows}`);

    // ── 3. Water check — biên ngưỡng ───────────────────────────
    const p = await prisma.waterParameter.findFirst({
      where: { minCritical: { lt: prisma.waterParameter.fields.minNormal } },
    });
    if (!p) {
      skipWaterTests();
    } else {
      const paramsApi = await api('GET', '/api/v1/water/parameters', { token: adminToken });
      const apiParam = (paramsApi.body?.data ?? []).find((x: any) => x.id === p.id);
      record(
        'GET /water/parameters trả đủ ngưỡng min/max cho client (BUG-07 đã fix)',
        !!apiParam && apiParam.minNormal !== undefined && apiParam.maxCritical !== undefined && !!apiParam.unit,
        `minNormal=${apiParam?.minNormal}, maxNormal=${apiParam?.maxNormal}, unit=${apiParam?.unit}`
      );
      record('[INFO] Dùng param từ DB: ' + p.code + ' normal=' + p.minNormal + '-' + p.maxNormal + ' critical=' + p.minCritical + '-' + p.maxCritical, true);
      const mid = (p.minNormal + p.maxNormal) / 2;
      const checks: Array<[string, number, boolean, string?]> = [
        ['giữa dải an toàn', mid, false],
        ['ĐÚNG BIÊN minNormal', p.minNormal, false],
        ['vượt maxNormal +1', p.maxNormal + 1, true, 'WARNING'],
        ['dưới minCritical -1', p.minCritical - 1, true, 'CRITICAL'],
      ];

      const countBefore = await api('GET', `/api/v1/water/warnings/count?farmId=${farm.farmId}`, { token: adminToken });
      const beforeUnresolved = countBefore.body?.data?.count ?? countBefore.body?.data?.unresolvedCount ?? 0;

      for (const [label, value, expectWarn, expectSeverity] of checks) {
        const res = await api('POST', '/api/v1/water/checks', {
          token: adminToken,
          body: { warehouseId: String(farm.pondId), waterChecks: [{ parameterId: p.id, value }] },
        });
        const d = res.body?.data ?? {};
        let passed = (res.status === 200 || res.status === 201) && !!d.has_warning === expectWarn;
        if (passed && expectWarn) passed = d.warnings_created > 0;
        record(
          `Water check ${label} (param ${p.code}, value=${value}) → has_warning=${expectWarn}`,
          passed,
          `status=${res.status}, has_warning=${d.has_warning}, severity_param=${expectSeverity ?? '-'}, resp=${JSON.stringify(d).slice(0, 120)}`
        );
      }

      const countAfter = await api('GET', `/api/v1/water/warnings/count?farmId=${farm.farmId}`, { token: adminToken });
      const afterUnresolved = countAfter.body?.data?.count ?? countAfter.body?.data?.unresolvedCount ?? 0;
      record(
        'warnings/count (data.count) tăng sau 2 check có cảnh báo',
        afterUnresolved >= beforeUnresolved + 2,
        `before=${beforeUnresolved}, after=${afterUnresolved}`
      );
      record(
        '[BUG-06] Response warnings/count phải có unresolvedCount (frontend AdminLayout đọc key này — thực tế chỉ có count → badge luôn 0)',
        countAfter.body?.data?.unresolvedCount !== undefined,
        `data=${JSON.stringify(countAfter.body?.data)}`
      );
    }

    // ── 4. Moves ───────────────────────────────────────────────
    const moveOk = await api('POST', '/api/v1/moves', {
      token: adminToken,
      body: { sourceBoxId: box0, destBoxId: box2, reason: 'E2E move' },
    });
    const moveId = moveOk.body?.data?.move_id ?? moveOk.body?.data?.id;
    record(
      `Move hộp ${box0}→${box2} (OCCUPIED→EMPTY) → 200`,
      (moveOk.status === 200 || moveOk.status === 201) && !!moveId,
      `status=${moveOk.status}, move_id=${moveId}, body=${JSON.stringify(moveOk.body).slice(0, 150)}`
    );

    if (moveId) {
      const box0After = await prisma.box.findUnique({ where: { id: box0 } });
      const box2After = await prisma.box.findUnique({ where: { id: box2 } });
      record(
        'Sau move: nguồn EMPTY + mất batchId, đích OCCUPIED + nhận batchId',
        box0After?.status === 'EMPTY' && box0After?.batchId === null &&
          box2After?.status === 'OCCUPIED' && String(box2After?.batchId) === String(batchId),
        `src=${box0After?.status}/batch=${box0After?.batchId}, dst=${box2After?.status}/batch=${box2After?.batchId}`
      );

      const movesList = await api('GET', `/api/v1/moves?farmId=${farm.farmId}`, { token: adminToken });
      const moveRows = movesList.body?.data ?? [];
      record(
        'GET /moves?farmId có bản ghi move vừa tạo',
        movesList.status === 200 && Array.isArray(moveRows) && moveRows.some((m: any) => m.id === moveId || m.move_id === moveId),
        `status=${movesList.status}, count=${Array.isArray(moveRows) ? moveRows.length : '-'}`
      );

      const badStatus = await api('PATCH', `/api/v1/moves/${moveId}/status`, {
        token: adminToken, body: { status: 'XYZ' },
      });
      record(
        'PATCH /moves/:id/status "XYZ" → phải 400/422 (500 = bug)',
        badStatus.status === 400 || badStatus.status === 422,
        `status=${badStatus.status}, body=${JSON.stringify(badStatus.body).slice(0, 120)}`
      );
    }

    // Negative moves — kỳ vọng 4xx, 500 (throw Error thường) = BUG-02
    const invalidMoves: Array<[string, any]> = [
      ['nguồn đang EMPTY', { sourceBoxId: box0, destBoxId: box1 }],
      ['đích đang OCCUPIED', { sourceBoxId: box2, destBoxId: box1 }],
      ['nguồn == đích', { sourceBoxId: box1, destBoxId: box1 }],
      ['boxId không tồn tại', { sourceBoxId: 999999999, destBoxId: box1 }],
    ];
    for (const [label, body] of invalidMoves) {
      const res = await api('POST', '/api/v1/moves', { token: adminToken, body });
      const is4xx = res.status >= 400 && res.status < 500;
      record(
        `Move ${label} → 4xx với message nghiệp vụ (500 = bug trả sai mã lỗi)`,
        is4xx,
        `status=${res.status}, message=${String(res.body?.message).slice(0, 80)}`
      );
    }
  } finally {
    await teardownTestFarm();
  }

  printSummary(SUITE);
}

function skipWaterTests(): void {
  record('Water parameters trống trong DB — không test được biên ngưỡng', false, 'GET /water/parameters rỗng');
}

run().catch(async (err) => {
  console.error('Suite crashed:', err);
  await teardownTestFarm().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
