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

  console.log('🎉 Database reset & 8 official users seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
