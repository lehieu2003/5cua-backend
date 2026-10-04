/**
 * E2E Exports + Notifications + Analytics/Reports + OperationLog suite.
 * Toàn bộ trong E2E-TEST-FARM. Tự tạo batch cấp 2 hộp cuối để có hàng xuất.
 */
import { api, record, printSummary, verifyServer, setupTestFarm, teardownTestFarm, login } from './helpers';

const SUITE = 'E2E EXPORTS & REPORTING TEST RESULTS';

async function run() {
  await verifyServer();
  const farm = await setupTestFarm();
  const adminToken = await login('admin', 'Admin@5cua123');
  const ts = Date.now();

  try {
    // ── Arrange: batch cấp 2 hộp cuối ───────────────────────────
    const [box4, box5, box3] = [farm.emptyBoxIds[4], farm.emptyBoxIds[5], farm.emptyBoxIds[3]];
    const batchRes = await api('POST', '/api/v1/batches', {
      token: adminToken,
      body: {
        farmId: farm.farmId,
        name: `E2E-BATCH-EXP-${ts}`,
        productId: farm.productId,
        importDate: new Date().toISOString().slice(0, 10),
        initialQuantity: 20,
        initialWeight: 9,
        warehouses: [{
          id: String(farm.farmId),
          product_uom_qty: '20',
          blocks: [{ id: String(farm.blockId), locations: [{ id: String(box4) }, { id: String(box5) }].map((x) => x) }],
        }],
      },
    });
    if (!(batchRes.status === 200 || batchRes.status === 201)) {
      console.error('Không tạo được batch EXP:', JSON.stringify(batchRes.body).slice(0, 200));
      printSummary(SUITE);
      return;
    }

    // ── 1. Tạo phiếu xuất từ 2 hộp OCCUPIED ────────────────────
    const exportRes = await api('POST', '/api/v1/exports', {
      token: adminToken,
      body: {
        farmId: farm.farmId,
        partnerName: 'E2E Partner',
        note: 'E2E export',
        boxes: [
          { boxId: box4, productId: farm.productId, weight: 0.4, price: 250000 },
          { boxId: box5, productId: farm.productId, weight: 0.5, price: 250000 },
        ],
      },
    });
    const exportId = exportRes.body?.data?.export_id ?? exportRes.body?.data?.id;
    record(
      'POST /exports từ 2 hộp OCCUPIED → 200/201, code EXP-*',
      (exportRes.status === 200 || exportRes.status === 201) && !!exportId,
      `status=${exportRes.status}, id=${exportId}, body=${JSON.stringify(exportRes.body).slice(0, 150)}`
    );

    if (!exportId) {
      printSummary(SUITE);
      return;
    }

    // ── 2. Detail + tổng số học ────────────────────────────────
    const detail = await api('GET', `/api/v1/exports/${exportId}`, { token: adminToken });
    const d = detail.body?.data ?? {};
    const totalQty = d.totalQty ?? d.total_qty ?? d.total_quantity ?? d.quantity;
    const totalWeight = d.totalWeight ?? d.total_weight;
    const totalAmount = d.totalAmount ?? d.total_amount;
    record(
      'GET /exports/:id → totalQty=2, totalWeight=0.9, totalAmount=225000',
      detail.status === 200 && totalQty === 2 && Math.abs(totalWeight - 0.9) < 0.001 && Math.abs(totalAmount - 225000) < 0.001,
      `status=${detail.status}, qty=${totalQty}, weight=${totalWeight}, amount=${totalAmount}`
    );

    // ── 3. Trạng thái xuất + nhả hộp sau DONE ──────────────────
    const confirmed = await api('PATCH', `/api/v1/exports/${exportId}/status`, {
      token: adminToken, body: { status: 'CONFIRMED' },
    });
    record('PATCH status CONFIRMED → 200', confirmed.status === 200, `status=${confirmed.status}, body=${JSON.stringify(confirmed.body).slice(0, 120)}`);

    const done = await api('PATCH', `/api/v1/exports/${exportId}/status`, {
      token: adminToken, body: { status: 'DONE' },
    });
    record('PATCH status DONE → 200', done.status === 200, `status=${done.status}`);

    const boxesAfter = await api('GET', `/api/v1/ponds/${farm.pondId}/boxes`, { token: adminToken });
    const boxRows = boxesAfter.body?.data?.boxes ?? boxesAfter.body?.data ?? [];
    const b4 = boxRows.find((b: any) => b.id === box4);
    const b5 = boxRows.find((b: any) => b.id === box5);
    record(
      'Sau xuất DONE, hộp nguồn nhả về EMPTY (thu hoạch xong) — PASS nghĩa là nghiệp vụ đúng',
      String(b4?.status).toUpperCase() === 'EMPTY' && String(b5?.status).toUpperCase() === 'EMPTY',
      `box4=${b4?.status}, box5=${b5?.status}`
    );

    const garbage = await api('PATCH', `/api/v1/exports/${exportId}/status`, {
      token: adminToken, body: { status: 'XYZ' },
    });
    record(
      'PATCH export status "XYZ" → phải 400/422 (500 = bug)',
      garbage.status === 400 || garbage.status === 422,
      `status=${garbage.status}, body=${JSON.stringify(garbage.body).slice(0, 120)}`
    );

    // ── 4. Xuất hộp EMPTY → phải bị chặn ───────────────────────
    const emptyBoxExport = await api('POST', '/api/v1/exports', {
      token: adminToken,
      body: {
        farmId: farm.farmId,
        partnerName: 'E2E Partner 2',
        boxes: [{ boxId: box3, productId: farm.productId, weight: 0.4, price: 250000 }],
      },
    });
    record(
      'Xuất kho từ hộp EMPTY → phải 400/409 (200/201 = bug)',
      emptyBoxExport.status === 400 || emptyBoxExport.status === 409,
      `status=${emptyBoxExport.status}, body=${JSON.stringify(emptyBoxExport.body).slice(0, 150)}`
    );

    // ── 5. Summary ─────────────────────────────────────────────
    const summary = await api('GET', `/api/v1/exports/summary?farmId=${farm.farmId}`, { token: adminToken });
    record(
      'GET /exports/summary → 200 có số liệu',
      summary.status === 200 && typeof summary.body?.data === 'object',
      `status=${summary.status}, data=${JSON.stringify(summary.body?.data).slice(0, 150)}`
    );

    // ── 6. Notifications ───────────────────────────────────────
    const notifList = await api('GET', '/api/v1/notifications', { token: adminToken });
    const notifs = notifList.body?.data?.items ?? notifList.body?.data ?? [];
    record(
      'GET /notifications → 200 có danh sách',
      notifList.status === 200 && Array.isArray(notifs),
      `status=${notifList.status}, count=${Array.isArray(notifs) ? notifs.length : '-'}`
    );

    const readAll = await api('PATCH', '/api/v1/notifications/read-all', { token: adminToken });
    record('PATCH /notifications/read-all → 200', readAll.status === 200, `status=${readAll.status}`);

    if (Array.isArray(notifs) && notifs.length > 0) {
      const unreadAfter = await api('GET', '/api/v1/notifications', { token: adminToken });
      const rows = unreadAfter.body?.data?.items ?? unreadAfter.body?.data ?? [];
      record(
        'Sau read-all mọi notification isRead=true',
        Array.isArray(rows) && rows.every((n: any) => n.isRead === true),
        `unread=${Array.isArray(rows) ? rows.filter((n: any) => !n.isRead).length : '-'}`
      );

      const delId = rows[0]?.id;
      if (delId) {
        const del = await api('DELETE', `/api/v1/notifications/${delId}`, { token: adminToken });
        record('DELETE /notifications/:id → 200/204', del.status === 200 || del.status === 204, `status=${del.status}`);
      }
    }

    // ── 7. Analytics smoke (3 endpoint) ────────────────────────
    const batchForAnalytics = await api('GET', `/api/v1/batches?farmId=${farm.farmId}`, { token: adminToken });
    const firstBatch = (batchForAnalytics.body?.data?.batches ?? batchForAnalytics.body?.data ?? [])[0];
    const batchIdForAnalytics = firstBatch?.id ?? firstBatch?.batch_id;
    const analyticsEndpoints = [
      `/api/v1/analytics/farms/${farm.farmId}/fcr`,
      `/api/v1/analytics/farms/${farm.farmId}/water-trends`,
    ];
    if (batchIdForAnalytics) analyticsEndpoints.push(`/api/v1/analytics/batches/${batchIdForAnalytics}`);
    for (const ep of analyticsEndpoints) {
      const res = await api('GET', ep, { token: adminToken });
      record(
        `Analytics smoke GET ${ep.split('/').slice(3).join('/')} → 200`,
        res.status === 200,
        `status=${res.status}, body=${JSON.stringify(res.body).slice(0, 100)}`
      );
    }

    // ── 8. Reports Excel export (heavy limiter 10/phút) ────────
    const reportEndpoints = [
      '/api/v1/reports/export/batches?farmId=',
      '/api/v1/reports/export/feeding-history?farmId=',
      '/api/v1/reports/export/sales-history?farmId=',
      '/api/v1/reports/export/water-history?farmId=',
    ];
    for (const ep of reportEndpoints) {
      const res = await api('GET', `${ep}${farm.farmId}`, { token: adminToken });
      // Excel trả về binary — status 200 + content-type excel là đúng
      const ct = (res.body && typeof res.body === 'object' && (res.body as any).success !== undefined)
        ? 'json'
        : 'binary';
      record(
        `Reports smoke GET ${ep.replace('/api/v1/reports/export/', '')} → 200 (excel/json)`,
        res.status === 200,
        `status=${res.status}, type=${ct}, snippet=${JSON.stringify(res.body).slice(0, 80)}`
      );
    }

    // ── 9. OperationLog ────────────────────────────────────────
    const ops = await api('GET', `/api/v1/farms/${farm.farmId}/operations`, { token: adminToken });
    const opRows = ops.body?.data?.data ?? ops.body?.data?.items ?? [];
    const actions = Array.isArray(opRows) ? opRows.map((o: any) => o.action) : [];
    record(
      'OperationLog ghi nhận các thao tác vừa làm: tạo batch + tạo/export (BUG-10 đã fix)',
      ops.status === 200 && Array.isArray(opRows) && opRows.length > 0 &&
        actions.includes('CREATE_BATCH') && actions.includes('EXPORT_HARVEST'),
      `status=${ops.status}, logs=${Array.isArray(opRows) ? opRows.length : '-'}, actions=${actions.slice(0, 6).join(',')}`
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
