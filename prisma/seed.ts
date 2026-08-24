import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, BoxStatus, UserRole } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding for 5Cua Smart Farm...');

  // Đọc password seed từ env — KHÔNG hardcode trong code
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword || seedPassword.trim() === '') {
    throw new Error(
      '[SEED ERROR] Thiếu biến SEED_ADMIN_PASSWORD trong .env\n' +
      '  → Hãy thêm: SEED_ADMIN_PASSWORD=YourStrongPassword123!'
    );
  }

  const farmCode = process.env.SEED_FARM_CODE || 'FARM-DEFAULT-01';
  const farmName = process.env.SEED_FARM_NAME || '5Cua Smart Farm';

  // 1. Seed Admin & Technician Users
  const passwordHash = await argon2.hash(seedPassword);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'Quản Trị Viên 5Cua',
      email: 'admin@5cua.vn',
      phone: '0901234567',
      passwordHash,
      memberType: 'ADMIN',
    },
  });

  const tech = await prisma.user.upsert({
    where: { username: 'kithuatvien_01' },
    update: {},
    create: {
      username: 'kithuatvien_01',
      fullName: 'Nguyễn Văn Kỹ Thuật',
      email: 'tech01@5cua.vn',
      phone: '0909888777',
      passwordHash,
      memberType: 'TECHNICIAN',
    },
  });

  console.log('✅ Users created:', admin.username, tech.username);

  // 2. Seed Master Categories & Products
  const catCrab = await prisma.productCategory.upsert({
    where: { code: 'CRAB_TYPE' },
    update: {},
    create: {
      code: 'CRAB_TYPE',
      name: 'Giống Cua Nuôi',
      type: 'type',
    },
  });

  const catFeed = await prisma.productCategory.upsert({
    where: { code: 'CRAB_FEED' },
    update: {},
    create: {
      code: 'CRAB_FEED',
      name: 'Thức Ăn Cua',
      type: 'feed',
    },
  });

  const catProbiotic = await prisma.productCategory.upsert({
    where: { code: 'PROBIOTIC' },
    update: {},
    create: {
      code: 'PROBIOTIC',
      name: 'Vi Sinh & Men',
      type: 'probiotic',
    },
  });

  // Products
  const crab72 = await prisma.productTemplate.upsert({
    where: { code: 'CUA_GẠCH_1' },
    update: {},
    create: {
      id: 72,
      categoryId: catCrab.id,
      code: 'CUA_GẠCH_1',
      name: 'Cua Gạch Loại 1 (300g-450g)',
      uom: 'con',
      price: 550000,
    },
  });

  const crabMeat = await prisma.productTemplate.upsert({
    where: { code: 'CUA_THIT_Y4' },
    update: {},
    create: {
      categoryId: catCrab.id,
      code: 'CUA_THIT_Y4',
      name: 'Cua Thịt Y4 Cà Mau',
      uom: 'con',
      price: 380000,
    },
  });

  const feedFish = await prisma.productTemplate.upsert({
    where: { code: 'FEED_CA_MOI' },
    update: {},
    create: {
      categoryId: catFeed.id,
      code: 'FEED_CA_MOI',
      name: 'Cá Mồi Tươi Cắt Khúc',
      uom: 'kg',
      price: 35000,
    },
  });

  const bioMin = await prisma.productTemplate.upsert({
    where: { code: 'BIO_MINERAL' },
    update: {},
    create: {
      categoryId: catProbiotic.id,
      code: 'BIO_MINERAL',
      name: 'Vi Khoáng Tạo Vỏ Siêu Tốc',
      uom: 'lít',
      price: 180000,
    },
  });

  console.log('✅ Master categories and products seeded.');

  // 3. Seed Water Parameters
  const waterParams = [
    { code: 'ph', name: 'Độ pH', unit: 'pH', minNormal: 7.5, maxNormal: 8.5, minCritical: 6.5, maxCritical: 9.0, ordinal: 1 },
    { code: 'salinity', name: 'Độ mặn', unit: '‰', minNormal: 15.0, maxNormal: 25.0, minCritical: 10.0, maxCritical: 32.0, ordinal: 2 },
    { code: 'temp', name: 'Nhiệt độ nước', unit: '°C', minNormal: 26.0, maxNormal: 30.0, minCritical: 22.0, maxCritical: 34.0, ordinal: 3 },
    { code: 'do', name: 'Oxy hòa tan (DO)', unit: 'mg/L', minNormal: 4.5, maxNormal: 8.0, minCritical: 3.0, maxCritical: 12.0, ordinal: 4 },
    { code: 'nh3', name: 'Khí độc NH3', unit: 'mg/L', minNormal: 0.0, maxNormal: 0.05, minCritical: 0.0, maxCritical: 0.1, ordinal: 5 },
    { code: 'no2', name: 'Khí độc NO2', unit: 'mg/L', minNormal: 0.0, maxNormal: 0.1, minCritical: 0.0, maxCritical: 0.5, ordinal: 6 },
    { code: 'alkalinity', name: 'Độ kiềm', unit: 'mg/L', minNormal: 120.0, maxNormal: 180.0, minCritical: 90.0, maxCritical: 220.0, ordinal: 7 },
  ];

  for (const wp of waterParams) {
    await prisma.waterParameter.upsert({
      where: { code: wp.code },
      update: {},
      create: wp,
    });
  }

  console.log('✅ Water parameters seeded.');

  // 4. Seed Demo Farm & Demo Pond with Grid Boxes
  const farm = await prisma.farm.upsert({
    where: { code: farmCode },
    update: {},
    create: {
      code: farmCode,
      name: farmName,
      address: process.env.SEED_FARM_ADDRESS || '',
      description: process.env.SEED_FARM_DESCRIPTION || 'Hệ thống nuôi cua công nghệ cao trong hộp tuần hoàn RAS',
    },
  });

  await prisma.farmMember.upsert({
    where: { farmId_userId: { farmId: farm.id, userId: admin.id } },
    update: {},
    create: { farmId: farm.id, userId: admin.id, role: UserRole.FARM_OWNER },
  });

  const pond = await prisma.pond.upsert({
    where: { farmId_code: { farmId: farm.id, code: 'AO-A1' } },
    update: {},
    create: {
      farmId: farm.id,
      code: 'AO-A1',
      name: 'Nhà Màng Nuôi Cua Hộp A1',
      pondType: 'box_grid',
      numBlock: 2,
      numRow: 3,
      numColumn: 4,
      totalBox: 24,
      volume: 45.0,
      area: 120.0,
    },
  });

  // Seed Blocks & Boxes if not exist
  const existingBlocks = await prisma.block.findMany({ where: { pondId: pond.id } });
  if (existingBlocks.length === 0) {
    for (let b = 1; b <= pond.numBlock; b++) {
      const block = await prisma.block.create({
        data: {
          pondId: pond.id,
          posZ: b,
          name: `Dãy ${b}`,
        },
      });

      const boxesData: any[] = [];
      for (let r = 1; r <= pond.numRow; r++) {
        for (let c = 1; c <= pond.numColumn; c++) {
          const isOccupied = (r + c) % 2 === 0;
          boxesData.push({
            blockId: block.id,
            code: `${pond.code}-B${b}-R${r}-C${c}`,
            row: r,
            column: c,
            status: isOccupied ? BoxStatus.OCCUPIED : BoxStatus.EMPTY,
            productId: isOccupied ? crab72.id : null,
          });
        }
      }

      await prisma.box.createMany({ data: boxesData });
    }
  }

  console.log('✅ Demo Farm & Ponds seeded successfully.');
  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
