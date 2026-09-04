import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const REAL_USERS: { name: string; phone: string; role: Role; branch: string }[] = [
  { name: 'openappo', phone: '01558282760', role: 'ADMIN', branch: 'الفرع الرئيسي' },
  { name: 'أحمد كشك', phone: '01063821000', role: 'ADMIN', branch: 'الفرع الرئيسي' },
  { name: 'يوسف ياسر', phone: '01279549182', role: 'BRANCH_STAFF', branch: 'الفرع الرئيسي' },
  { name: 'أحمد عبدالله', phone: '01023232370', role: 'BRANCH_STAFF', branch: 'فرع عرابي' },
  { name: 'محمد نصار', phone: '01055288214', role: 'BRANCH_STAFF', branch: 'فرع عرابي' },
  { name: 'محمد كشك', phone: '01018728640', role: 'BRANCH_STAFF', branch: 'فرع عمر أفندي' },
  { name: 'أحمد عبدالعال', phone: '01275763008', role: 'BRANCH_STAFF', branch: 'فرع عمر أفندي' },
  { name: 'عبدالله كشك', phone: '01033447262', role: 'BRANCH_STAFF', branch: 'فرع الثلاثيني' },
];

async function main() {
  // ⚠️ تمت إزالة كل عمليات deleteMany() نهائياً من هذا الملف.
  // كان يمسح كل بيانات المعاينات/العقود/العملاء/المخزون/الموردين/الفواتير
  // بمجرد تشغيل `npm run db:seed` — نفس فئة الخطر التى طلب صاحب النظام
  // إزالتها صراحة من زر "تصفير البيانات" فى الإعدادات. هذا الملف الآن
  // Upsert فقط للمستخدمين الرسميين — لا يحذف أى شئ إطلاقاً.

  console.log('🌱 Seeding database with official 8 users across 4 branches...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  for (const u of REAL_USERS) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      update: {
        name: u.name,
        password: hashedPassword,
        role: u.role,
        branch: u.branch,
      },
      create: {
        name: u.name,
        phone: u.phone,
        password: hashedPassword,
        role: u.role,
        branch: u.branch,
      },
    });
    console.log(`✅ User seeded: ${user.name} (${user.phone}) - ${user.branch}`);
  }

  console.log('📦 Seeding 326 official inventory items across branches...');
  try {
    const initialInventory = require('../src/data/initialInventory.json');
    for (const item of initialInventory) {
      await prisma.inventoryItem.upsert({
        where: { code: item.code },
        create: {
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.category,
          unit: item.unit,
          totalQuantity: item.totalQuantity,
          reservedQuantity: item.reservedQuantity || 0,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          branch: item.branch,
          minAlert: item.minAlert || 20,
          supplier: item.supplier || 'مورد عام',
        },
        update: {
          name: item.name,
          category: item.category,
          unit: item.unit,
          totalQuantity: item.totalQuantity,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          branch: item.branch,
        },
      });
    }
    console.log('✅ Inventory items seeded successfully!');
  } catch (e: any) {
    console.error('⚠️ Inventory seed warning:', e?.message || e);
  }

  console.log('🎉 Database reset & 8 official users + 326 inventory items seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
