import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. General Manager (openappo)
  const superAdmin = await prisma.user.upsert({
    where: { phone: '01558282760' },
    update: {
      name: 'openappo',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي — القاهرة',
    },
    create: {
      name: 'openappo',
      phone: '01558282760',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي — القاهرة',
    },
  });
  console.log('✅ Super Admin (openappo) created:', superAdmin.phone);

  // 2. Store Owner / Manager (أحمد كشك)
  const storeOwner = await prisma.user.upsert({
    where: { phone: '01063821000' },
    update: {
      name: 'أحمد كشك',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي — القاهرة',
    },
    create: {
      name: 'أحمد كشك',
      phone: '01063821000',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي — القاهرة',
    },
  });
  console.log('✅ Store Owner (أحمد كشك) created:', storeOwner.phone);

  // 3. Technician users
  await prisma.user.upsert({
    where: { phone: '01011111111' },
    update: {},
    create: {
      name: 'أحمد حسن',
      phone: '01011111111',
      password: hashedPassword,
      role: 'TECHNICIAN',
      branch: 'مركز المعاينات والتركيبات',
    },
  });

  await prisma.user.upsert({
    where: { phone: '01022222222' },
    update: {},
    create: {
      name: 'محمد علي',
      phone: '01022222222',
      password: hashedPassword,
      role: 'TECHNICIAN',
      branch: 'مركز المعاينات والتركيبات',
    },
  });

  // 4. Branch staff
  await prisma.user.upsert({
    where: { phone: '01033333333' },
    update: {},
    create: {
      name: 'موظف الفرع الثاني',
      phone: '01033333333',
      password: hashedPassword,
      role: 'BRANCH_STAFF',
      branch: 'فرع الأقمشة الثاني — بنها',
    },
  });

  await prisma.user.upsert({
    where: { phone: '01044444444' },
    update: {},
    create: {
      name: 'موظف الفرع الثالث',
      phone: '01044444444',
      password: hashedPassword,
      role: 'BRANCH_STAFF',
      branch: 'فرع السوارية الثالث — بنها',
    },
  });

  // 5. Workshop supervisor
  await prisma.user.upsert({
    where: { phone: '01055555555' },
    update: {},
    create: {
      name: 'مشرف الورشة المركزية',
      phone: '01055555555',
      password: hashedPassword,
      role: 'WORKSHOP',
      branch: 'الورشة المركزية للتفصيل',
    },
  });

  console.log('✅ Users seeded');

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
    { code: 'SAT-01', name: 'ستان سواريه', category: 'سواريه', quantityMeters: 120, costPerMeter: 320, pricePerMeter: 450, supplierId: supplier1.id },
    { code: 'SLK-01', name: 'حرير طبيعي', category: 'سواريه', quantityMeters: 45, costPerMeter: 650, pricePerMeter: 900, supplierId: supplier1.id },
    { code: 'CRP-01', name: 'كريب مزدوج', category: 'سواريه', quantityMeters: 200, costPerMeter: 200, pricePerMeter: 300, supplierId: supplier1.id },
    { code: 'CHF-01', name: 'شيفون ناعم', category: 'سواريه', quantityMeters: 180, costPerMeter: 150, pricePerMeter: 250, supplierId: supplier1.id },
    { code: 'VLV-01', name: 'قطيفة ستائر', category: 'ستائر', quantityMeters: 95, costPerMeter: 260, pricePerMeter: 380, supplierId: supplier2.id },
    { code: 'LNN-01', name: 'كتان بلجيكي', category: 'ستائر', quantityMeters: 110, costPerMeter: 220, pricePerMeter: 320, supplierId: supplier2.id },
    { code: 'TUL-01', name: 'تول ناعم', category: 'ستائر', quantityMeters: 350, costPerMeter: 70, pricePerMeter: 120, supplierId: supplier2.id },
    { code: 'BLK-01', name: 'بلاك آوت', category: 'ستائر', quantityMeters: 160, costPerMeter: 180, pricePerMeter: 280, supplierId: supplier2.id },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }

  console.log('✅ Inventory seeded');
  console.log('🎉 Seeding complete!');
  console.log('📱 Super Admin (General Manager): 01558282760 (openappo) / 123456');
  console.log('📱 Store Manager (Ahmed Kishk): 01063821000 (أحمد كشك) / 123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
