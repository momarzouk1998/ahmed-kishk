import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash the default password
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { phone: '01558282760' },
    update: {
      name: 'أحمد كشك',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي',
    },
    create: {
      name: 'أحمد كشك',
      phone: '01558282760',
      password: hashedPassword,
      role: 'ADMIN',
      branch: 'الفرع الرئيسي',
    },
  });
  console.log('✅ Admin user created:', admin.phone);

  // Create technician users
  const technician1 = await prisma.user.upsert({
    where: { phone: '01011111111' },
    update: {},
    create: {
      name: 'أحمد حسن',
      phone: '01011111111',
      password: await bcrypt.hash('123456', 10),
      role: 'TECHNICIAN',
      branch: 'الفرع الرئيسي',
    },
  });

  const technician2 = await prisma.user.upsert({
    where: { phone: '01022222222' },
    update: {},
    create: {
      name: 'محمد علي',
      phone: '01022222222',
      password: await bcrypt.hash('123456', 10),
      role: 'TECHNICIAN',
      branch: 'الفرع الرئيسي',
    },
  });

  // Create branch staff
  await prisma.user.upsert({
    where: { phone: '01033333333' },
    update: {},
    create: {
      name: 'موظف فرع ثاني',
      phone: '01033333333',
      password: await bcrypt.hash('123456', 10),
      role: 'BRANCH_STAFF',
      branch: 'فرع ثاني',
    },
  });

  console.log('✅ Users seeded');

  // Create suppliers
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
      notes: 'مورد بلاك آوت وتول',
    },
  });

  console.log('✅ Suppliers seeded');

  // Create inventory items
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
  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('📱 Admin login: 01558282760 / 123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
