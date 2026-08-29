import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with official branches...');

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

  // Suppliers & Inventory
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'sup-001' },
    update: {},
    create: {
      id: 'sup-001',
      name: 'شركة النيل للأقمشة',
      phone: '01099988877',
      address: 'القاهرة — شارع المعز',
      balance: -5200,
      notes: 'مورد رئيسي للستان والحرير',
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { id: 'sup-002' },
    update: {},
    create: {
      id: 'sup-002',
      name: 'مصنع الدلتا للستائر',
      phone: '01011223344',
      address: 'المنصورة',
      balance: -1800,
      notes: 'مورد بلاك آوت وتول ومواسير',
    },
  });

  const inventoryItems = [
    { code: 'SAT-01', name: 'ستان سواريه', category: 'سواريه', totalQuantity: 120, costPrice: 320, sellPrice: 450, branch: 'الفرع الرئيسي', supplier: 'شركة النيل' },
    { code: 'SLK-01', name: 'حرير طبيعي', category: 'سواريه', totalQuantity: 45, costPrice: 650, sellPrice: 900, branch: 'فرع عرابي', supplier: 'شركة النيل' },
    { code: 'CRP-01', name: 'كريب مزدوج', category: 'سواريه', totalQuantity: 200, costPrice: 200, sellPrice: 300, branch: 'فرع عمر أفندي', supplier: 'شركة النيل' },
    { code: 'CHF-01', name: 'شيفون ناعم', category: 'سواريه', totalQuantity: 180, costPrice: 150, sellPrice: 250, branch: 'فرع الثلاثيني', supplier: 'مستورد الشرق' },
    { code: 'VLV-01', name: 'قطيفة ستائر', category: 'ستائر', totalQuantity: 95, costPrice: 260, sellPrice: 380, branch: 'الفرع الرئيسي', supplier: 'مصنع الدلتا' },
    { code: 'LNN-01', name: 'كتان بلجيكي', category: 'ستائر', totalQuantity: 110, costPrice: 220, sellPrice: 320, branch: 'فرع عرابي', supplier: 'مصنع الدلتا' },
    { code: 'TUL-01', name: 'تول ناعم', category: 'ستائر', totalQuantity: 350, costPrice: 70, sellPrice: 120, branch: 'الفرع الرئيسي', supplier: 'مصنع الدلتا' },
    { code: 'BLK-01', name: 'بلاك آوت', category: 'ستائر', totalQuantity: 160, costPrice: 180, sellPrice: 280, branch: 'فرع عرابي', supplier: 'مصنع الدلتا' },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }

  console.log('✅ Inventory seeded for all 4 branches');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
