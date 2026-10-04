/**
 * E2E test harness — gọi thẳng API đang chạy trên :5000.
 * Dữ liệu test cô lập trong farm 'E2E-TEST-FARM', teardown cascade xoá sạch.
 */
import '../../src/common/config/env'; // load dotenv trước Prisma
import prisma from '../../src/database/prisma.service';

const BASE_URL = 'http://localhost:5000';

export interface ApiResult {
  status: number;
  body: any;
}

export async function api(
  method: string,
  path: string,
  opts?: { token?: string; body?: any }
): Promise<ApiResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(opts?.body !== undefined && { body: JSON.stringify(opts.body) }),
  });

  const text = await res.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // giữ nguyên text
  }
  return { status: res.status, body };
}

// ── Kết quả test ────────────────────────────────────────────────
export interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  skipped?: boolean;
}

const results: TestResult[] = [];

export function record(name: string, passed: boolean, details?: string): void {
  results.push({ name, passed, details });
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${name}${details ? ` — ${details}` : ''}`);
}

/** Đánh dấu test bỏ qua (ví dụ bị rate limit chặn) — không tính FAIL */
export function skip(name: string, details?: string): void {
  results.push({ name, passed: true, details, skipped: true });
  console.log(`  [SKIP] ${name}${details ? ` — ${details}` : ''}`);
}

export function printSummary(suiteName: string): void {
  console.log('\n===================================================');
  console.log(suiteName);
  console.log('===================================================');
  const failed = results.filter((r) => !r.passed).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(
    `TOTAL: ${results.length} | PASS: ${results.length - failed - skipped} | FAIL: ${failed} | SKIP: ${skipped}`
  );
  console.log('===================================================');
  prisma
    .$disconnect()
    .catch(() => {})
    .finally(() => process.exit(failed > 0 ? 1 : 0));
}

// ── Auth ────────────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<string> {
  const res = await api('POST', '/api/v1/auth/login', { body: { username, password } });
  if (res.status !== 200 || !res.body?.data?.accessToken) {
    throw new Error(`Login ${username} failed: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
  }
  return res.body.data.accessToken;
}

// ── Test farm fixture ───────────────────────────────────────────
export interface TestFarm {
  farmId: number;
  pondId: number;
  blockId: number;
  emptyBoxIds: number[];
  productId: number;
}

export async function setupTestFarm(): Promise<TestFarm> {
  // Farm + pond grid 1 block x 2 rows x 3 cols = 6 hộp EMPTY
  const farm = await prisma.farm.upsert({
    where: { code: 'E2E-TEST-FARM' },
    update: {},
    create: {
      code: 'E2E-TEST-FARM',
      name: 'E2E Test Farm (auto)',
      address: 'Test',
    },
  });

  const existingPond = await prisma.pond.findFirst({
    where: { farmId: farm.id, code: 'E2E-POND-01' },
  });
  if (existingPond) {
    await teardownTestFarm();
    return setupTestFarm();
  }

  const pond = await prisma.pond.create({
    data: {
      farmId: farm.id,
      code: 'E2E-POND-01',
      name: 'E2E Pond 01',
      pondType: 'box_grid',
      numBlock: 1,
      numRow: 2,
      numColumn: 3,
      totalBox: 6,
    },
  });

  const block = await prisma.block.create({
    data: { pondId: pond.id, posZ: 1, name: 'E2E Block 1' },
  });

  const emptyBoxIds: number[] = [];
  for (let row = 1; row <= 2; row++) {
    for (let col = 1; col <= 3; col++) {
      const box = await prisma.box.create({
        data: {
          blockId: block.id,
          code: `E2E-B${block.id}-R${row}C${col}`,
          row,
          column: col,
          status: 'EMPTY',
        },
      });
      emptyBoxIds.push(box.id);
    }
  }

  const product = await prisma.productTemplate.findFirst({ where: { isActive: true } });
  if (!product) throw new Error('Không có ProductTemplate nào trong DB (hãy chạy seed)');
  if (emptyBoxIds.length !== 6) throw new Error('Test farm phải có đúng 6 hộp');

  return { farmId: farm.id, pondId: pond.id, blockId: block.id, emptyBoxIds, productId: product.id };
}

export async function teardownTestFarm(): Promise<void> {
  // StockPickingMove → Box không có onDelete: Cascade — phải xoá moves trước
  await prisma.stockPickingMove.deleteMany({
    where: {
      OR: [
        { sourceBox: { block: { pond: { farm: { code: 'E2E-TEST-FARM' } } } } },
        { destBox: { block: { pond: { farm: { code: 'E2E-TEST-FARM' } } } } },
      ],
    },
  });
  await prisma.farm.deleteMany({ where: { code: 'E2E-TEST-FARM' } });
  // dọn user register test
  await prisma.user.deleteMany({ where: { username: { startsWith: 'e2e_user_' } } });
}

export async function verifyServer(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`health status ${res.status}`);
  } catch (err: any) {
    throw new Error(`Backend không chạy tại ${BASE_URL}. Hãy start backend trước. (${err.message})`);
  }
}
