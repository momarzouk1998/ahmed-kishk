const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all old test transactions (inspections, quotes, orders, inventory, customers)...');
  try {
    await prisma.inspectionRequest.deleteMany({});
    await prisma.quotationOrder.deleteMany({});
    await prisma.pipelineOrder.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.salesInvoice.deleteMany({});
    await prisma.purchaseInvoice.deleteMany({});
    await prisma.systemStore.deleteMany({});
    console.log('✅ All old test data purged successfully.');
  } catch (err) {
    console.error('Error purging operational data:', err);
  }

  console.log('🌱 Seeding database with official branches and users...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. General Manager (openappo)
  const superAdmin = await prisma.user.upsert({
    where: { phone: '01558282760' },
    update: {
      name: 'openappo',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي',
    },
    create: {
      name: 'openappo',
      phone: '01558282760',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي',
    },
  });
  console.log('✅ Super Admin (openappo) created:', superAdmin.phone);

  // 2. Store Owner / Manager (أحمد كشك) - 1 مستخدم الفرع الرئيسي
  const storeOwner = await prisma.user.upsert({
    where: { phone: '01063821000' },
    update: {
      name: 'أحمد كشك',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي',
    },
    create: {
      name: 'أحمد كشك',
      phone: '01063821000',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي',
    },
  });
  console.log('✅ Store Owner (أحمد كشك) created:', storeOwner.phone);

  // 3. فرع عرابي (18 ش عدلي - ستائر وتنجيد) - 2 مستخدمين
  await prisma.user.upsert({
    where: { phone: '01011111111' },
    update: { branch: 'فرع عرابي' },
    create: {
      name: 'موظف فرع عرابي 1',
      phone: '01011111111',
      password: hashedPassword,
      role: 'BRANCH_STAFF',
      branch: 'فرع عرابي',
    },
  });

  await prisma.user.upsert({
    where: { phone: '01022222222' },
    update: { branch: 'فرع عرابي' },
    create: {
      name: 'موظف فرع عرابي 2',
      phone: '01022222222',
      password: hashedPassword,
      role: 'BRANCH_STAFF',
      branch: 'فرع عرابي',
    },
  });

  // 4. فرع عمر أفندي (أقمشة فقط) - 2 مستخدمين
  await prisma.user.upsert({
    where: { phone: '01033333333' },
    update: { branch: 'فرع عمر أفندي' },
    create: {
      name: 'موظف فرع عمر أفندي 1',
      phone: '01033333333',
      password: hashedPassword,
      role: 'BRANCH_STAFF',
      branch: 'فرع عمر أفندي',
    },
  });

  await prisma.user.upsert({
    where: { phone: '01044444444' },
    update: { branch: 'فرع عمر أفندي' },
    create: {
      name: 'موظف فرع عمر أفندي 2',
      phone: '01044444444',
      password: hashedPassword,
      role: 'BRANCH_STAFF',
      branch: 'فرع عمر أفندي',
    },
  });

  // 5. فرع الثلاثيني (أقمشة فقط) - 1 مستخدم
  await prisma.user.upsert({
    where: { phone: '01055555555' },
    update: { branch: 'فرع الثلاثيني' },
    create: {
      name: 'موظف فرع الثلاثيني',
      phone: '01055555555',
      password: hashedPassword,
      role: 'BRANCH_STAFF',
      branch: 'فرع الثلاثيني',
    },
  });

  console.log('✅ Users seeded for the 4 official branches');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
