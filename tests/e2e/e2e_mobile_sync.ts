/**
 * E2E Mobile-sync suite — contract giữa Flutter app và backend.
 * Phản chiếu đúng body/query mà 5cua-flutter gửi (kể cả key snake_case
 * và warehouseId) — mọi thay đổi contract cho mobile phải qua suite này.
 */
import { api, record, printSummary, verifyServer, login, setupTestFarm, teardownTestFarm, type TestFarm } from './helpers';
import prisma from '../../src/database/prisma.service';

const SUITE = 'E2E MOBILE SYNC TEST RESULTS';

async function run() {
  await verifyServer();
  const workerToken = await login('worker_tuan', 'Admin@5cua123');
  const adminToken = await login('admin', 'Admin@5cua123');

  // worker_tuan là WORKER của FARM-BL-01 (seed)
  const farm1 = await prisma.farm.findUnique({ where: { code: 'FARM-BL-01' } });
  if (!farm1) throw new Error('Thiếu FARM-BL-01 — hãy chạy npm run prisma:seed');
  const pond = await prisma.pond.findFirst({ where: { farmId: farm1.id }, orderBy: { id: 'asc' } });
  if (!pond) throw new Error('FARM-BL-01 không có ao');
  const param = await prisma.waterParameter.findFirst({ orderBy: { ordinal: 'asc' } });
  if (!param) throw new Error('Chưa seed WaterParameter');

  const createdHistoryIds: number[] = [];
  const createdCleaningIds: number[] = [];

  try {
    // ── MOB-GUARD: farmAccessGuard phải hiểu warehouseId mà mobile gửi ──
    const hist = await api('GET', `/api/v1/water/checks?warehouseId=${pond.id}&offset=0`, {
      token: workerToken,
    });
    record(
      '[GUARD] GET /water/checks?warehouseId → 200 (guard nhận warehouseId)',
      hist.status === 200,
      `status=${hist.status}, body=${JSON.stringify(hist.body).slice(0, 140)}`
    );

    const post = await api('POST', '/api/v1/water/checks', {
      token: workerToken,
      body: {
        warehouseId: String(pond.id),
        waterChecks: [{ id: String(param.id), value_id: '1' }],
        note: 'e2e-mobile-sync',
      },
    });
    record(
      '[GUARD] POST /water/checks (warehouseId + waterChecks[].value_id) → 201',
      post.status === 201,
      `status=${post.status}, body=${JSON.stringify(post.body).slice(0, 160)}`
    );
    if (post.body?.data?.record_id) createdHistoryIds.push(Number(post.body.data.record_id));

    const clean = await api('POST', '/api/v1/inspections/cleaning', {
      token: workerToken,
      body: { warehouseId: String(pond.id), softShellQuantity: '0', deadQuantity: '0', boxes: [] },
    });
    record(
      '[GUARD] POST /inspections/cleaning (warehouseId, key boxes) → 201',
      clean.status === 201,
      `status=${clean.status}, body=${JSON.stringify(clean.body).slice(0, 160)}`
    );
    if (clean.body?.data?.record_id) createdCleaningIds.push(Number(clean.body.data.record_id));
  } finally {
    for (const id of createdHistoryIds) {
      await prisma.waterCheckHistory.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdCleaningIds) {
      await prisma.inspectionCleaningRecord.delete({ where: { id } }).catch(() => {});
    }
  }

  // ── MOB-INSPECT: mobile gửi key `boxes`, backend đọc `boxs` → lệch ──
  let fixture: TestFarm | null = null;
  try {
    fixture = await setupTestFarm();
    const [p1, p2] = await prisma.productTemplate.findMany({
      where: { isActive: true },
      take: 2,
      orderBy: { id: 'asc' },
    });

    // Cho 2 hộp có cua để test chuyển đổi / kiểm tra chết
    const convBoxId = fixture.emptyBoxIds[0];
    const deadBoxId = fixture.emptyBoxIds[1];
    await prisma.box.update({ where: { id: convBoxId }, data: { status: 'OCCUPIED', productId: p1.id } });
    await prisma.box.update({ where: { id: deadBoxId }, data: { status: 'OCCUPIED', productId: p1.id } });

    const conv = await api('POST', '/api/v1/inspections/convert-crab', {
      token: adminToken,
      body: { warehouseId: String(fixture.pondId), productIdNew: p2.id, boxes: [{ id: String(convBoxId) }] },
    });
    const convBoxAfter = await prisma.box.findUnique({ where: { id: convBoxId } });
    record(
      '[INSPECT] POST /inspections/convert-crab (key boxes) → 200 + đổi product',
      conv.status === 200 && convBoxAfter?.productId === p2.id,
      `status=${conv.status}, box.productId=${convBoxAfter?.productId}, expect=${p2.id}, body=${JSON.stringify(conv.body).slice(0, 120)}`
    );

    const cleanDead = await api('POST', '/api/v1/inspections/cleaning', {
      token: adminToken,
      body: {
        warehouseId: String(fixture.pondId),
        softShellQuantity: '0',
        deadQuantity: '1',
        boxes: [{ id: String(deadBoxId), isDead: true }],
      },
    });
    const deadBoxAfter = await prisma.box.findUnique({ where: { id: deadBoxId } });
    record(
      '[INSPECT] POST /inspections/cleaning (key boxes, isDead) → 201 + hộp về EMPTY',
      cleanDead.status === 201 && deadBoxAfter?.status === 'EMPTY' && deadBoxAfter?.productId === null,
      `status=${cleanDead.status}, box.status=${deadBoxAfter?.status}, box.productId=${deadBoxAfter?.productId}`
    );
  } finally {
    if (fixture) await teardownTestFarm();
  }

  // ── MOB-STATUS: mobile hủy phiếu bằng 'cancel' (chữ thường, thiếu 'led') ──
  {
    const f = await setupTestFarm();
    try {
      const ts = Date.now();
      const batchRes = await api('POST', '/api/v1/batches', {
        token: adminToken,
        body: {
          farmId: f.farmId,
          name: `E2E-BATCH-STATUS-${ts}`,
          productId: f.productId,
          importDate: new Date().toISOString().slice(0, 10),
          initialQuantity: 10,
          initialWeight: 4,
          warehouses: [{
            id: String(f.farmId),
            product_uom_qty: '10',
            blocks: [{ id: String(f.blockId), locations: [{ id: String(f.emptyBoxIds[0]) }, { id: String(f.emptyBoxIds[1]) }] }],
          }],
        },
      });
      if (!(batchRes.status === 200 || batchRes.status === 201)) {
        throw new Error(`Tạo batch fixture lỗi: ${JSON.stringify(batchRes.body).slice(0, 160)}`);
      }

      // Mobile gửi snake_case cho moves (switch_pond_api.dart)
      const moveRes = await api('POST', '/api/v1/moves', {
        token: adminToken,
        body: { source_box_id: f.emptyBoxIds[0], dest_box_id: f.emptyBoxIds[2], reason: 'E2E mobile sync' },
      });
      const moveId = moveRes.body?.data?.move_id ?? moveRes.body?.data?.id;

      const moveCancel = await api('PATCH', `/api/v1/moves/${moveId}/status`, {
        token: adminToken,
        body: { status: 'cancel' },
      });
      const moveAfter = moveId ? await prisma.stockPickingMove.findUnique({ where: { id: Number(moveId) } }) : null;
      record(
        '[STATUS] PATCH /moves/:id/status "cancel" → 200 + CANCELLED',
        moveCancel.status === 200 && moveAfter?.status === 'CANCELLED',
        `status=${moveCancel.status}, db=${moveAfter?.status}, body=${JSON.stringify(moveCancel.body).slice(0, 140)}`
      );

      const exportRes = await api('POST', '/api/v1/exports', {
        token: adminToken,
        body: {
          farmId: f.farmId,
          partnerName: 'E2E Mobile Sync',
          boxes: [{ boxId: f.emptyBoxIds[1], productId: f.productId, weight: 0.3, price: 200000 }],
        },
      });
      const exportId = exportRes.body?.data?.export_id ?? exportRes.body?.data?.id;
      const exportCancel = await api('PATCH', `/api/v1/exports/${exportId}/status`, {
        token: adminToken,
        body: { status: 'cancel' },
      });
      const exportAfter = exportId ? await prisma.exportHistory.findUnique({ where: { id: Number(exportId) } }) : null;
      record(
        '[STATUS] PATCH /exports/:id/status "cancel" → 200 + CANCELLED',
        exportCancel.status === 200 && exportAfter?.status === 'CANCELLED',
        `status=${exportCancel.status}, db=${exportAfter?.status}, body=${JSON.stringify(exportCancel.body).slice(0, 140)}`
      );
    } finally {
      await teardownTestFarm();
    }
  }

  printSummary(SUITE);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
