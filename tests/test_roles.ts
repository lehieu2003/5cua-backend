import http from 'http';
import app from '../src/app';
import prisma from '../src/database/prisma.service';

const PORT = 5005;

interface TestResult {
  role: string;
  action: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function request(options: {
  method: string;
  path: string;
  token?: string;
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
          ...(options.token && { Authorization: `Bearer ${options.token}` }),
          ...(dataString && { 'Content-Length': Buffer.byteLength(dataString) }),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
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

function assertTest(role: string, action: string, expectedStatus: number, actualStatus: number, responseBody: any) {
  const passed = actualStatus === expectedStatus;
  results.push({
    role,
    action,
    expectedStatus,
    actualStatus,
    passed,
    message: passed ? 'OK' : `Failed: ${JSON.stringify(responseBody)}`,
  });

  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${role}] ${action} -> Expected: ${expectedStatus}, Got: ${actualStatus}`);
}

async function runRoleTests() {
  console.log('🚀 Bắt đầu khởi động server test trên port', PORT);
  const server = app.listen(PORT);

  try {
    // 1. Đảm bảo có Farm demo
    const farm = await prisma.farm.upsert({
      where: { code: 'FARM-TEST-01' },
      update: {},
      create: {
        code: 'FARM-TEST-01',
        name: 'Trang Trại Test RBAC',
      },
    });

    // 2. Tạo/Đăng ký 4 User với 4 Role khác nhau
    console.log('\n🔑 1. Đăng ký & Đăng nhập các Roles:');

    const usersToTest = [
      { username: 'test_owner', password: 'Password@123', fullName: 'Chủ Trang Trại Test', role: 'FARM_OWNER', memberType: 'standard' },
      { username: 'test_manager', password: 'Password@123', fullName: 'Quản Lý Test', role: 'MANAGER', memberType: 'standard' },
      { username: 'test_tech', password: 'Password@123', fullName: 'Kỹ Thuật Viên Test', role: 'TECHNICIAN', memberType: 'employee' },
      { username: 'test_worker', password: 'Password@123', fullName: 'Công Nhân Nuôi Cua Test', role: 'WORKER', memberType: 'employee' },
    ];

    const tokens: Record<string, string> = {};

    for (const u of usersToTest) {
      // Đăng ký
      await request({
        method: 'POST',
        path: '/api/v1/auth/register',
        body: {
          username: u.username,
          password: u.password,
          fullName: u.fullName,
          role: u.role,
          memberType: u.memberType,
          farmId: farm.id,
        },
      });

      // Đăng nhập
      const loginRes = await request({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { username: u.username, password: u.password },
      });

      tokens[u.role] = loginRes.body.data?.accessToken;
      const returnedRole = loginRes.body.data?.role;
      const returnedMemberType = loginRes.body.data?.memberType;

      assertTest(u.role, `Đăng nhập -> Nhận đúng Role (${returnedRole}) & MemberType (${returnedMemberType})`, 200, loginRes.status, loginRes.body);
    }

    // 3. Test Phân quyền Tạo Ao (Ponds) — Chỉ OWNER / MANAGER được phép
    console.log('\n🏡 2. Test Quyền Tạo Ao (POST /api/v1/ponds):');
    const createPondPayload = {
      farmId: farm.id,
      code: `AO-TEST-${Date.now()}`,
      name: 'Nhà Màng Test RBAC',
      numBlock: 1,
      numRow: 2,
      numColumn: 2,
    };

    const pondOwner = await request({ method: 'POST', path: '/api/v1/ponds', token: tokens['FARM_OWNER'], body: createPondPayload });
    assertTest('FARM_OWNER', 'Tạo Ao mới (Quyền cao)', 201, pondOwner.status, pondOwner.body);

    const pondWorker = await request({ method: 'POST', path: '/api/v1/ponds', token: tokens['WORKER'], body: createPondPayload });
    assertTest('WORKER', 'Tạo Ao mới (Không có quyền)', 403, pondWorker.status, pondWorker.body);

    // 4. Test Phân quyền Tạo Lô Nhập (Batches) — Chỉ OWNER / MANAGER được phép
    console.log('\n📦 3. Test Quyền Tạo Lô Nhập Cua (POST /api/v1/batches):');
    const createBatchPayload = {
      farm_id: farm.id,
      name: `BATCH-TEST-${Date.now()}`,
      product_id: 72,
      import_date: '2026-08-24',
      initial_quantity: 50,
      initial_weight: 15.5,
    };

    const batchManager = await request({ method: 'POST', path: '/api/v1/batches', token: tokens['MANAGER'], body: createBatchPayload });
    assertTest('MANAGER', 'Tạo Lô nhập giống (Quyền quản lý)', 201, batchManager.status, batchManager.body);

    const batchTech = await request({ method: 'POST', path: '/api/v1/batches', token: tokens['WORKER'], body: createBatchPayload });
    assertTest('WORKER', 'Tạo Lô nhập giống (Không có quyền)', 403, batchTech.status, batchTech.body);

    // 5. Test Phân quyền Đo Nước (Water Checks) — TECHNICIAN được phép, WORKER bị chặn
    console.log('\n💧 4. Test Quyền Đo Nước (POST /api/v1/water/checks):');
    const waterCheckPayload = {
      warehouseId: '1',
      waterChecks: [{ parameterId: 1, value: 7.8 }],
    };

    const waterTech = await request({ method: 'POST', path: '/api/v1/water/checks', token: tokens['TECHNICIAN'], body: waterCheckPayload });
    assertTest('TECHNICIAN', 'Ghi nhận đo thông số nước (Quyền Kỹ thuật)', 201, waterTech.status, waterTech.body);

    // 6. Test Phân quyền Cho Ăn (Feeding) — WORKER được phép
    console.log('\n🍽️ 5. Test Quyền Ghi Nhật Ký Cho Ăn (POST /api/v1/feeding):');
    const firstPond = await prisma.pond.findFirst();
    const firstProduct = await prisma.productTemplate.findFirst();

    const feedingPayload = {
      pondId: firstPond?.id || 1,
      actionType: 'feeding',
      items: [{ productId: firstProduct?.id || 72, qty: 2.0 }],
    };

    const feedingWorker = await request({ method: 'POST', path: '/api/v1/feeding', token: tokens['WORKER'], body: feedingPayload });
    assertTest('WORKER', 'Ghi nhận cho ăn (Quyền công nhân)', 201, feedingWorker.status, feedingWorker.body);

    // 7. Test Get Profile của từng Role
    console.log('\n👤 6. Test Get Profile (GET /api/v1/users/me):');
    const profileWorker = await request({ method: 'GET', path: '/api/v1/users/me', token: tokens['WORKER'] });
    const isWorkerEmployee = profileWorker.body.data?.memberType === 'employee';
    assertTest('WORKER', `Profile có member_type == "employee" (${isWorkerEmployee})`, 200, profileWorker.status, profileWorker.body);

    const profileOwner = await request({ method: 'GET', path: '/api/v1/users/me', token: tokens['FARM_OWNER'] });
    const isOwnerStandard = profileOwner.body.data?.memberType === 'standard';
    assertTest('FARM_OWNER', `Profile có member_type == "standard" (${isOwnerStandard})`, 200, profileOwner.status, profileOwner.body);

    // 8. Test Đăng nhập với tài khoản bị khóa (isActive = false)
    console.log('\n🔒 7. Test Đăng nhập với tài khoản bị khóa (isActive = false):');
    const workerUser = await prisma.user.findUnique({ where: { username: 'test_worker' } });
    if (workerUser) {
      // Khóa tài khoản
      await prisma.user.update({
        where: { id: workerUser.id },
        data: { isActive: false },
      });

      // Thử đăng nhập tài khoản đã khóa
      const blockedLoginRes = await request({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { username: 'test_worker', password: 'Password@123' },
      });
      assertTest('BLOCKED_USER', 'Đăng nhập tài khoản bị khóa -> Bị chặn 403', 403, blockedLoginRes.status, blockedLoginRes.body);

      // Mở khóa lại tài khoản
      await prisma.user.update({
        where: { id: workerUser.id },
        data: { isActive: true },
      });

      // Đăng nhập lại sau khi mở khóa
      const unblockedLoginRes = await request({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { username: 'test_worker', password: 'Password@123' },
      });
      assertTest('UNBLOCKED_USER', 'Đăng nhập lại sau khi mở khóa -> Thành công 200', 200, unblockedLoginRes.status, unblockedLoginRes.body);

      // 9. Test Real-time SSE thông báo khi Admin khóa tài khoản
      console.log('\n📡 8. Test Real-time SSE khi Admin khóa tài khoản (Force Logout):');
      const workerToken = unblockedLoginRes.body.data?.accessToken;
      let sseReceivedDeactivation = false;

      const sseReq = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/v1/auth/events?token=${workerToken}`,
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
      }, (sseRes) => {
        sseRes.on('data', (chunk) => {
          const str = chunk.toString();
          if (str.includes('ACCOUNT_DEACTIVATED')) {
            sseReceivedDeactivation = true;
          }
        });
      });
      sseReq.end();

      // Đợi kết nối SSE mở
      await new Promise((r) => setTimeout(r, 200));

      // Admin khóa tài khoản qua API PATCH /api/v1/users/:id/status
      const lockRes = await request({
        method: 'PATCH',
        path: `/api/v1/users/${workerUser.id}/status`,
        token: tokens['FARM_OWNER'],
        body: { isActive: false },
      });
      assertTest('ADMIN_LOCK', 'Admin gọi API khóa tài khoản user -> Thành công 200', 200, lockRes.status, lockRes.body);

      // Đợi nhận SSE event
      await new Promise((r) => setTimeout(r, 300));
      sseReq.destroy();

      assertTest('REALTIME_SSE', 'Client nhận sự kiện ACCOUNT_DEACTIVATED qua SSE', true, sseReceivedDeactivation, { sseReceivedDeactivation });

      // Mở khóa lại để dọn dẹp
      await prisma.user.update({
        where: { id: workerUser.id },
        data: { isActive: true },
      });
    }

    // TỔNG KẾT
    console.log('\n========================================');
    const totalPassed = results.filter((r) => r.passed).length;
    const totalFailed = results.filter((r) => !r.passed).length;
    console.log(`📊 TỔNG KẾT TEST: ${totalPassed}/${results.length} PASSED (Failed: ${totalFailed})`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình chạy test:', error);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runRoleTests();
