import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, BoxStatus, UserRole, BatchStatus, ExportStatus, ActionType } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Rich Database Seeding for 5Cua Smart Farm...');

  const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const passwordHash = await argon2.hash(seedPassword);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SEED USERS & ROLES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('👥 Seeding Users...');
  const usersData = [
    { username: 'admin', fullName: 'Nguyễn Văn Quản Trị', email: 'admin@5cua.vn', phone: '0901234567', memberType: 'ADMIN' },
    { username: 'owner_baclieu', fullName: 'Trần Văn Chủ Trại Bạc Liêu', email: 'owner.bl@5cua.vn', phone: '0912345678', memberType: 'STANDARD' },
    { username: 'owner_camau', fullName: 'Phạm Hữu Tài (Chủ Trại Cà Mau)', email: 'owner.cm@5cua.vn', phone: '0913345678', memberType: 'STANDARD' },
    { username: 'manager_baclieu', fullName: 'Lê Hoàng Quản Lý', email: 'manager.bl@5cua.vn', phone: '0922345678', memberType: 'STANDARD' },
    { username: 'manager_camau', fullName: 'Võ Minh Điều Hành', email: 'manager.cm@5cua.vn', phone: '0923345678', memberType: 'STANDARD' },
    { username: 'tech_minh', fullName: 'Đặng Văn Kỹ Thuật Nước', email: 'tech.minh@5cua.vn', phone: '0933345678', memberType: 'TECHNICIAN' },
    { username: 'tech_duc', fullName: 'Huỳnh Minh Đức (Kỹ Thuật)', email: 'tech.duc@5cua.vn', phone: '0934345678', memberType: 'TECHNICIAN' },
    { username: 'worker_tuan', fullName: 'Nguyễn Anh Tuấn (Vận Hành)', email: 'worker.tuan@5cua.vn', phone: '0944345678', memberType: 'STANDARD' },
    { username: 'worker_lan', fullName: 'Trần Thị Lan (Chăm Sóc)', email: 'worker.lan@5cua.vn', phone: '0945345678', memberType: 'STANDARD' },
    { username: 'worker_hung', fullName: 'Bùi Văn Hùng (Kỹ Thuật Viên)', email: 'worker.hung@5cua.vn', phone: '0946345678', memberType: 'STANDARD' },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName, email: u.email, phone: u.phone, passwordHash },
      create: { ...u, passwordHash },
    });
    createdUsers[u.username] = user;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SEED MASTER CATEGORIES & PRODUCTS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('🦀 Seeding Master Categories & Products...');
  const catCrab = await prisma.productCategory.upsert({
    where: { code: 'CRAB_TYPE' },
    update: {},
    create: { code: 'CRAB_TYPE', name: 'Giống Cua Nuôi', type: 'type' },
  });

  const catFeed = await prisma.productCategory.upsert({
    where: { code: 'CRAB_FEED' },
    update: {},
    create: { code: 'CRAB_FEED', name: 'Thức Ăn Cua', type: 'feed' },
  });

  const catProbiotic = await prisma.productCategory.upsert({
    where: { code: 'PROBIOTIC' },
    update: {},
    create: { code: 'PROBIOTIC', name: 'Vi Sinh & Men', type: 'probiotic' },
  });

  const productsData = [
    { code: 'CUA_GACH_1', name: 'Cua Gạch Loại 1 Cà Mau (350g-500g)', categoryId: catCrab.id, uom: 'con', price: 580000 },
    { code: 'CUA_THIT_Y4', name: 'Cua Thịt Y4 Năm Căn (400g-600g)', categoryId: catCrab.id, uom: 'con', price: 420000 },
    { code: 'CUA_COM_LOT', name: 'Cua Cốm 2 Da Siêu Phẩm (250g-400g)', categoryId: catCrab.id, uom: 'con', price: 650000 },
    { code: 'CUA_YEM_VUONG', name: 'Cua Yếm Vuông Bạc Liêu', categoryId: catCrab.id, uom: 'con', price: 360000 },
    { code: 'FEED_CA_MOI', name: 'Cá Mồi Biển Tươi Cắt Khúc', categoryId: catFeed.id, uom: 'kg', price: 35000 },
    { code: 'FEED_NGHEU_SO', name: 'Nghêu Sò Nhuyễn Thể Tươi Sống', categoryId: catFeed.id, uom: 'kg', price: 28000 },
    { code: 'FEED_VIEN_RAS', name: 'Thức Ăn Viên Chuyên Dụng RAS', categoryId: catFeed.id, uom: 'kg', price: 48000 },
    { code: 'BIO_MINERAL', name: 'Vi Khoáng Tạo Vỏ & Tăng Trọng Nhanh', categoryId: catProbiotic.id, uom: 'lít', price: 180000 },
    { code: 'BIO_MEN_TIEU_HOA', name: 'Men Vi Sinh Đường Ruột Bio-Crab', categoryId: catProbiotic.id, uom: 'lít', price: 220000 },
    { code: 'BIO_ZEOLITE', name: 'Men Xử Lý Đáy & Khí Độc NH3/NO2', categoryId: catProbiotic.id, uom: 'kg', price: 150000 },
  ];

  const createdProducts: Record<string, any> = {};
  for (const p of productsData) {
    const prod = await prisma.productTemplate.upsert({
      where: { code: p.code },
      update: { name: p.name, price: p.price },
      create: p,
    });
    createdProducts[p.code] = prod;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SEED WATER PARAMETERS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('🧪 Seeding Water Parameters...');
  const waterParams = [
    { code: 'ph', name: 'Độ pH', unit: 'pH', minNormal: 7.5, maxNormal: 8.5, minCritical: 6.5, maxCritical: 9.0, ordinal: 1 },
    { code: 'salinity', name: 'Độ mặn', unit: '‰', minNormal: 15.0, maxNormal: 25.0, minCritical: 10.0, maxCritical: 32.0, ordinal: 2 },
    { code: 'temp', name: 'Nhiệt độ nước', unit: '°C', minNormal: 26.0, maxNormal: 30.0, minCritical: 22.0, maxCritical: 34.0, ordinal: 3 },
    { code: 'do', name: 'Oxy hòa tan (DO)', unit: 'mg/L', minNormal: 4.5, maxNormal: 8.0, minCritical: 3.0, maxCritical: 12.0, ordinal: 4 },
    { code: 'nh3', name: 'Khí độc NH3', unit: 'mg/L', minNormal: 0.0, maxNormal: 0.05, minCritical: 0.0, maxCritical: 0.1, ordinal: 5 },
    { code: 'no2', name: 'Khí độc NO2', unit: 'mg/L', minNormal: 0.0, maxNormal: 0.1, minCritical: 0.0, maxCritical: 0.5, ordinal: 6 },
    { code: 'alkalinity', name: 'Độ kiềm', unit: 'mg/L', minNormal: 120.0, maxNormal: 180.0, minCritical: 90.0, maxCritical: 220.0, ordinal: 7 },
  ];

  const createdWaterParams: Record<string, any> = {};
  for (const wp of waterParams) {
    const p = await prisma.waterParameter.upsert({
      where: { code: wp.code },
      update: wp,
      create: wp,
    });
    createdWaterParams[wp.code] = p;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SEED FARMS & FARM MEMBERS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('🏠 Seeding 4 Trang Trại (Farms)...');
  const farmsData = [
    {
      code: 'FARM-BL-01',
      name: 'Trang Trại Nuôi Cua 5Cua Bạc Liêu',
      address: 'Xã Vĩnh Trạch Đông, TP Bạc Liêu, Tỉnh Bạc Liêu',
      description: 'Hệ thống nuôi cua công nghệ cao trong hộp tuần hoàn RAS quy mô 5.000 hộp.',
    },
    {
      code: 'FARM-CM-01',
      name: 'Trang Trại Cua Biển Năm Căn Cà Mau',
      address: 'Thị trấn Năm Căn, Huyện Năm Căn, Tỉnh Cà Mau',
      description: 'Trại chuyên biệt cua gạch và cua cốm xuất khẩu tiêu chuẩn VietGAP.',
    },
    {
      code: 'FARM-KG-01',
      name: 'Trang Trại Cua Công Nghệ Cao Kiên Giang',
      address: 'Phường Tô Châu, TP Hà Tiên, Tỉnh Kiên Giang',
      description: 'Hệ thống kiểm soát vi khí hậu tự động kết hợp sensor IoT.',
    },
    {
      code: 'FARM-BT-01',
      name: 'Trang Trại Nuôi Cua Bến Tre',
      address: 'Xã Thới Thuận, Huyện Bình Đại, Tỉnh Bến Tre',
      description: 'Mô hình RAS ven biển cung ứng cua thịt chất lượng cao.',
    },
  ];

  const createdFarms: Record<string, any> = {};
  for (const f of farmsData) {
    const farm = await prisma.farm.upsert({
      where: { code: f.code },
      update: f,
      create: f,
    });
    createdFarms[f.code] = farm;
  }

  // Assign Farm Members
  const farmMembersData = [
    // Farm Bạc Liêu
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['admin'].id, role: UserRole.SUPER_ADMIN },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['owner_baclieu'].id, role: UserRole.FARM_OWNER },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['manager_baclieu'].id, role: UserRole.MANAGER },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['tech_minh'].id, role: UserRole.TECHNICIAN },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['worker_tuan'].id, role: UserRole.WORKER },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['worker_lan'].id, role: UserRole.WORKER },

    // Farm Cà Mau
    { farmId: createdFarms['FARM-CM-01'].id, userId: createdUsers['admin'].id, role: UserRole.SUPER_ADMIN },
    { farmId: createdFarms['FARM-CM-01'].id, userId: createdUsers['owner_camau'].id, role: UserRole.FARM_OWNER },
    { farmId: createdFarms['FARM-CM-01'].id, userId: createdUsers['manager_camau'].id, role: UserRole.MANAGER },
    { farmId: createdFarms['FARM-CM-01'].id, userId: createdUsers['tech_duc'].id, role: UserRole.TECHNICIAN },
    { farmId: createdFarms['FARM-CM-01'].id, userId: createdUsers['worker_hung'].id, role: UserRole.WORKER },

    // Farm Kiên Giang
    { farmId: createdFarms['FARM-KG-01'].id, userId: createdUsers['admin'].id, role: UserRole.SUPER_ADMIN },
    { farmId: createdFarms['FARM-KG-01'].id, userId: createdUsers['manager_baclieu'].id, role: UserRole.MANAGER },

    // Farm Bến Tre
    { farmId: createdFarms['FARM-BT-01'].id, userId: createdUsers['admin'].id, role: UserRole.SUPER_ADMIN },
    { farmId: createdFarms['FARM-BT-01'].id, userId: createdUsers['owner_baclieu'].id, role: UserRole.FARM_OWNER },
  ];

  for (const fm of farmMembersData) {
    await prisma.farmMember.upsert({
      where: { farmId_userId: { farmId: fm.farmId, userId: fm.userId } },
      update: { role: fm.role },
      create: fm,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SEED PONDS, BLOCKS & BOXES MATRIX
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📐 Seeding Ponds and Box Grids...');
  const pondsConfig = [
    // Farm Bạc Liêu (4 Ponds)
    { farmCode: 'FARM-BL-01', code: 'AO-BL-01', name: 'Nhà Màng 01 - Cua Gạch A', numBlock: 2, numRow: 4, numColumn: 8, volume: 60, area: 150 },
    { farmCode: 'FARM-BL-01', code: 'AO-BL-02', name: 'Nhà Màng 02 - Cua Thịt Y4', numBlock: 2, numRow: 4, numColumn: 8, volume: 60, area: 150 },
    { farmCode: 'FARM-BL-01', code: 'AO-BL-03', name: 'Nhà Màng 03 - Cua Cốm Lột', numBlock: 3, numRow: 5, numColumn: 6, volume: 75, area: 180 },
    { farmCode: 'FARM-BL-01', code: 'AO-BL-04', name: 'Nhà Màng 04 - Dưỡng & Vỗ Béo', numBlock: 2, numRow: 3, numColumn: 6, volume: 40, area: 100 },

    // Farm Cà Mau (3 Ponds)
    { farmCode: 'FARM-CM-01', code: 'AO-CM-01', name: 'Khu A1 - Cua Gạch Xuất Khẩu', numBlock: 2, numRow: 4, numColumn: 10, volume: 80, area: 200 },
    { farmCode: 'FARM-CM-01', code: 'AO-CM-02', name: 'Khu A2 - Cua Thịt Đặc Biệt', numBlock: 2, numRow: 4, numColumn: 8, volume: 60, area: 150 },
    { farmCode: 'FARM-CM-01', code: 'AO-CM-03', name: 'Khu B1 - Ươm Giống & Cốm', numBlock: 2, numRow: 3, numColumn: 6, volume: 45, area: 110 },

    // Farm Kiên Giang (2 Ponds)
    { farmCode: 'FARM-KG-01', code: 'AO-KG-01', name: 'Ao Nuôi Số 1 Kiên Giang', numBlock: 2, numRow: 4, numColumn: 6, volume: 50, area: 120 },
    { farmCode: 'FARM-KG-01', code: 'AO-KG-02', name: 'Ao Nuôi Số 2 Kiên Giang', numBlock: 2, numRow: 4, numColumn: 6, volume: 50, area: 120 },

    // Farm Bến Tre (2 Ponds)
    { farmCode: 'FARM-BT-01', code: 'AO-BT-01', name: 'Ao Nuôi Số 1 Bến Tre', numBlock: 2, numRow: 3, numColumn: 8, volume: 45, area: 110 },
    { farmCode: 'FARM-BT-01', code: 'AO-BT-02', name: 'Ao Nuôi Số 2 Bến Tre', numBlock: 2, numRow: 3, numColumn: 8, volume: 45, area: 110 },
  ];

  const createdPonds: Record<string, any> = {};
  const allCreatedBoxes: any[] = [];

  for (const pc of pondsConfig) {
    const farm = createdFarms[pc.farmCode];
    const totalBox = pc.numBlock * pc.numRow * pc.numColumn;
    const pond = await prisma.pond.upsert({
      where: { farmId_code: { farmId: farm.id, code: pc.code } },
      update: { name: pc.name, numBlock: pc.numBlock, numRow: pc.numRow, numColumn: pc.numColumn, totalBox, volume: pc.volume, area: pc.area },
      create: {
        farmId: farm.id,
        code: pc.code,
        name: pc.name,
        pondType: 'box_grid',
        numBlock: pc.numBlock,
        numRow: pc.numRow,
        numColumn: pc.numColumn,
        totalBox,
        volume: pc.volume,
        area: pc.area,
      },
    });
    createdPonds[pc.code] = pond;

    // Create Blocks & Boxes
    const existingBlocks = await prisma.block.findMany({ where: { pondId: pond.id } });
    if (existingBlocks.length === 0) {
      for (let b = 1; b <= pc.numBlock; b++) {
        const block = await prisma.block.create({
          data: { pondId: pond.id, posZ: b, name: `Dãy ${b}` },
        });

        const boxesToInsert: any[] = [];
        for (let r = 1; r <= pc.numRow; r++) {
          for (let c = 1; c <= pc.numColumn; c++) {
            // Determine status realistically: ~65% Occupied, 25% Empty, 5% Maintenance, 5% Cleaning
            const rand = Math.random();
            let status: BoxStatus = BoxStatus.EMPTY;
            let prodId: number | null = null;

            if (rand < 0.65) {
              status = BoxStatus.OCCUPIED;
              prodId = pc.code.includes('CUA_GACH') || pc.code.includes('01') ? createdProducts['CUA_GACH_1'].id : createdProducts['CUA_THIT_Y4'].id;
            } else if (rand < 0.90) {
              status = BoxStatus.EMPTY;
            } else if (rand < 0.95) {
              status = BoxStatus.MAINTENANCE;
            } else {
              status = BoxStatus.CLEANING;
            }

            boxesToInsert.push({
              blockId: block.id,
              code: `${pc.code}-D${b}-T${r}-C${c}`,
              row: r,
              column: c,
              status,
              productId: prodId,
              occupiedAt: status === BoxStatus.OCCUPIED ? new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000) : null,
            });
          }
        }

        await prisma.box.createMany({ data: boxesToInsert });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SEED STOCK IMPORT BATCHES (Đợt Nhập Cua Giống)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📦 Seeding Stock Import Batches...');
  const batchesData = [
    {
      farmId: createdFarms['FARM-BL-01'].id,
      code: 'BATCH-BL-2026-01',
      productId: createdProducts['CUA_GACH_1'].id,
      originText: 'Vựa Con Giống Cà Mau - Năm Căn',
      importDate: new Date('2026-07-01'),
      expectedHarvestDate: new Date('2026-08-30'),
      initialQuantity: 300,
      initialWeight: 105.0,
      currentQuantity: 285,
      deadQuantity: 15,
      deadWeight: 4.8,
      cost: 75000000,
      expectedRevenue: 174000000,
      expectedSuccessRate: 95.0,
      status: BatchStatus.IN_PROGRESS,
      note: 'Cua giống cái khỏe, gạch bắt đầu vàng đều, tỷ lệ tăng trọng rất tốt.',
    },
    {
      farmId: createdFarms['FARM-BL-01'].id,
      code: 'BATCH-BL-2026-02',
      productId: createdProducts['CUA_THIT_Y4'].id,
      originText: 'Trại Giống Thủy Sản Ngọc Hiển',
      importDate: new Date('2026-07-15'),
      expectedHarvestDate: new Date('2026-09-10'),
      initialQuantity: 250,
      initialWeight: 95.0,
      currentQuantity: 242,
      deadQuantity: 8,
      deadWeight: 2.9,
      cost: 58000000,
      expectedRevenue: 135000000,
      expectedSuccessRate: 96.0,
      status: BatchStatus.IN_PROGRESS,
      note: 'Cua đực yếm khít, thịt chắc, thích nghi nhanh với nước RAS.',
    },
    {
      farmId: createdFarms['FARM-BL-01'].id,
      code: 'BATCH-BL-2026-00',
      productId: createdProducts['CUA_COM_LOT'].id,
      originText: 'Cơ Sở Cua Cốm Đầm Dơi',
      importDate: new Date('2026-05-10'),
      expectedHarvestDate: new Date('2026-06-25'),
      initialQuantity: 200,
      initialWeight: 60.0,
      currentQuantity: 0,
      deadQuantity: 10,
      deadWeight: 3.0,
      cost: 45000000,
      expectedRevenue: 120000000,
      expectedSuccessRate: 95.0,
      status: BatchStatus.COMPLETED,
      note: 'Đã xuất bán toàn bộ cho hệ thống nhà hàng Sài Gòn.',
    },
    {
      farmId: createdFarms['FARM-CM-01'].id,
      code: 'BATCH-CM-2026-01',
      productId: createdProducts['CUA_GACH_1'].id,
      originText: 'Vựa Con Giống Hải Sản Năm Căn',
      importDate: new Date('2026-07-20'),
      expectedHarvestDate: new Date('2026-09-20'),
      initialQuantity: 400,
      initialWeight: 140.0,
      currentQuantity: 388,
      deadQuantity: 12,
      deadWeight: 4.1,
      cost: 98000000,
      expectedRevenue: 232000000,
      expectedSuccessRate: 97.0,
      status: BatchStatus.IN_PROGRESS,
      note: 'Cua gạch tuyển chọn đặc biệt xuất khẩu thị trường Châu Á.',
    },
    {
      farmId: createdFarms['FARM-KG-01'].id,
      code: 'BATCH-KG-2026-01',
      productId: createdProducts['CUA_THIT_Y4'].id,
      originText: 'Vựa Cua Kiên Lương',
      importDate: new Date('2026-08-01'),
      expectedHarvestDate: new Date('2026-09-30'),
      initialQuantity: 180,
      initialWeight: 68.0,
      currentQuantity: 176,
      deadQuantity: 4,
      deadWeight: 1.4,
      cost: 42000000,
      expectedRevenue: 98000000,
      expectedSuccessRate: 98.0,
      status: BatchStatus.IN_PROGRESS,
      note: 'Lô thử nghiệm đầu tiên tại cơ sở Hà Tiên.',
    },
  ];

  for (const b of batchesData) {
    await prisma.stockImportBatch.upsert({
      where: { code: b.code },
      update: b,
      create: b,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SEED EXPORT HISTORIES (Phiếu Xuất Bán Cua)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('💰 Seeding Export Harvest Histories...');
  const exportsData = [
    {
      farmId: createdFarms['FARM-BL-01'].id,
      code: 'EXP-BL-2026-01',
      partnerName: 'Vựa Cua Hải Sản Sài Gòn (Q.1, TP.HCM)',
      exportDate: new Date('2026-08-10T09:30:00Z'),
      totalQty: 85,
      totalWeight: 38.5,
      totalAmount: 22330000,
      status: ExportStatus.DONE,
      note: 'Xuất cua gạch loại 1 tươi sống, đóng thùng xốp oxy.',
    },
    {
      farmId: createdFarms['FARM-BL-01'].id,
      code: 'EXP-BL-2026-02',
      partnerName: 'Nhà Hàng Biển Đông Cần Thơ',
      exportDate: new Date('2026-08-15T14:00:00Z'),
      totalQty: 120,
      totalWeight: 54.0,
      totalAmount: 31320000,
      status: ExportStatus.DONE,
      note: 'Cua gạch và cua cốm giao trong ngày.',
    },
    {
      farmId: createdFarms['FARM-BL-01'].id,
      code: 'EXP-BL-2026-03',
      partnerName: 'Chuỗi Hải Sản Hoàng Gia',
      exportDate: new Date('2026-08-20T10:15:00Z'),
      totalQty: 200,
      totalWeight: 92.0,
      totalAmount: 55200000,
      status: ExportStatus.DONE,
      note: 'Đơn hàng xuất khẩu đợt 1.',
    },
    {
      farmId: createdFarms['FARM-CM-01'].id,
      code: 'EXP-CM-2026-01',
      partnerName: 'Công Ty CP Xuất Nhập Khẩu Thủy Sản Cà Mau',
      exportDate: new Date('2026-08-18T08:00:00Z'),
      totalQty: 300,
      totalWeight: 135.0,
      totalAmount: 78300000,
      status: ExportStatus.DONE,
      note: 'Xuất khẩu chính ngạch sang Singapore.',
    },
    {
      farmId: createdFarms['FARM-KG-01'].id,
      code: 'EXP-KG-2026-01',
      partnerName: 'Resort Vinpearl Phú Quốc',
      exportDate: new Date('2026-08-22T16:45:00Z'),
      totalQty: 60,
      totalWeight: 26.5,
      totalAmount: 16430000,
      status: ExportStatus.DONE,
      note: 'Cung cấp tiệc buffet hải sản cuối tuần.',
    },
  ];

  for (const exp of exportsData) {
    await prisma.exportHistory.upsert({
      where: { code: exp.code },
      update: exp,
      create: exp,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. SEED WATER MONITORING & TIME-SERIES CHECKS & WARNINGS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('🌊 Seeding Water Monitoring History & Realtime Warnings...');
  const targetPonds = [
    createdPonds['AO-BL-01'],
    createdPonds['AO-BL-02'],
    createdPonds['AO-CM-01'],
  ].filter(Boolean);

  for (const pond of targetPonds) {
    // Generate 15 measurement logs for each pond over the last 5 days
    for (let i = 15; i >= 1; i--) {
      const checkDate = new Date(Date.now() - i * 8 * 3600000);
      const isWarn = i === 2 || i === 5;

      const phVal = isWarn ? 8.8 : Number((7.6 + Math.random() * 0.7).toFixed(1));
      const tempVal = Number((27.5 + Math.random() * 2.0).toFixed(1));
      const salVal = Number((18.0 + Math.random() * 5.0).toFixed(1));
      const doVal = isWarn ? 3.8 : Number((5.2 + Math.random() * 1.5).toFixed(1));

      const history = await prisma.waterCheckHistory.create({
        data: {
          pondId: pond.id,
          checkDate,
          hasWarning: isWarn,
          note: isWarn ? 'Phát hiện pH tăng nhẹ và DO giảm, đã bật sục khí tăng cường' : 'Thông số ổn định, nước trong.',
        },
      });

      // Insert check items
      const itemsToCreate = [
        { historyId: history.id, parameterId: createdWaterParams['ph'].id, value: phVal, isWarning: phVal > 8.5 || phVal < 7.5 },
        { historyId: history.id, parameterId: createdWaterParams['temp'].id, value: tempVal, isWarning: false },
        { historyId: history.id, parameterId: createdWaterParams['salinity'].id, value: salVal, isWarning: false },
        { historyId: history.id, parameterId: createdWaterParams['do'].id, value: doVal, isWarning: doVal < 4.5 },
      ];

      await prisma.waterCheckItem.createMany({ data: itemsToCreate });
    }
  }

  // Seed Water Warnings
  const warningsData = [
    {
      farmId: createdFarms['FARM-BL-01'].id,
      pondId: createdPonds['AO-BL-01'].id,
      title: 'Độ pH Vượt Ngưỡng Cho Phép',
      message: 'Ao AO-BL-01 đo được pH = 8.8 (ngưỡng an toàn 7.5 - 8.5). Cần bổ sung mật rỉ đường hoặc châm nước mềm.',
      severity: 'WARNING',
      isResolved: false,
    },
    {
      farmId: createdFarms['FARM-BL-01'].id,
      pondId: createdPonds['AO-BL-02'].id,
      title: 'Oxy Hòa Tan (DO) Dưới Mức Chuẩn',
      message: 'Ao AO-BL-02 đo được DO = 3.8 mg/L (yêu cầu tối thiểu >= 4.5 mg/L). Đã kích hoạt máy thổi khí dự phòng.',
      severity: 'CRITICAL',
      isResolved: false,
    },
    {
      farmId: createdFarms['FARM-CM-01'].id,
      pondId: createdPonds['AO-CM-01'].id,
      title: 'Độ Mặn Giảm Do Mưa Lớn',
      message: 'Ao AO-CM-01 độ mặn giảm xuống 13‰ do mưa lớn kéo dài. Cần bổ sung muối hột khoáng.',
      severity: 'WARNING',
      isResolved: false,
    },
  ];

  for (const w of warningsData) {
    await prisma.waterWarning.create({ data: w });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. SEED FEEDING & PROBIOTIC OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('🥩 Seeding Feeding and Probiotic Logs...');
  for (const pond of targetPonds) {
    for (let f = 5; f >= 1; f--) {
      const recordedAt = new Date(Date.now() - f * 24 * 3600000);

      // Feeding record
      const feedRec = await prisma.feedingRecord.create({
        data: {
          pondId: pond.id,
          actionType: ActionType.FEEDING,
          crabQuantityAtTime: 60,
          note: 'Cua ăn khỏe, tiêu thụ 95% lượng cá mồi trong 40 phút.',
          recordedAt,
        },
      });

      await prisma.feedingItem.create({
        data: {
          recordId: feedRec.id,
          productId: createdProducts['FEED_CA_MOI'].id,
          quantity: 3.5,
        },
      });

      // Probiotic record
      const probRec = await prisma.feedingRecord.create({
        data: {
          pondId: pond.id,
          actionType: ActionType.PROBIOTIC,
          crabQuantityAtTime: 60,
          note: 'Châm vi sinh định kỳ giúp ổn định chất lượng nước tuần hoàn RAS.',
          recordedAt: new Date(recordedAt.getTime() + 7200000),
        },
      });

      await prisma.feedingItem.create({
        data: {
          recordId: probRec.id,
          productId: createdProducts['BIO_MINERAL'].id,
          quantity: 0.5,
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. SEED SYSTEM OPERATION LOGS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📝 Seeding System Operation Logs...');
  const opLogsData = [
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['admin'].id, action: 'CREATE_BATCH', details: { batchCode: 'BATCH-BL-2026-01', totalCrabs: 300 } },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['manager_baclieu'].id, action: 'ALLOCATE_BOXES', details: { pondCode: 'AO-BL-01', allocatedCount: 64 } },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['tech_minh'].id, action: 'WATER_CHECK', details: { pondCode: 'AO-BL-01', ph: 7.9, do: 6.2 } },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['worker_tuan'].id, action: 'FEEDING', details: { pondCode: 'AO-BL-01', feedProduct: 'Cá Mồi Tươi' } },
    { farmId: createdFarms['FARM-BL-01'].id, userId: createdUsers['manager_baclieu'].id, action: 'EXPORT_HARVEST', details: { exportCode: 'EXP-BL-2026-01', revenue: 22330000 } },
    { farmId: createdFarms['FARM-CM-01'].id, userId: createdUsers['owner_camau'].id, action: 'CREATE_POND', details: { pondCode: 'AO-CM-01', totalBoxes: 80 } },
  ];

  for (const log of opLogsData) {
    await prisma.operationLog.create({
      data: {
        farmId: log.farmId,
        userId: log.userId,
        action: log.action,
        details: log.details as any,
      },
    });
  }

  console.log('🎉 Super Rich Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
