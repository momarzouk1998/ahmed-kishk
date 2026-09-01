const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const REAL_USERS = [
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
  console.log('🧹 Purging all old test transactions...');
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

  // Remove dummy test users if any exist
  const validPhones = REAL_USERS.map(u => u.phone);
  try {
    await prisma.user.deleteMany({
      where: {
        phone: { notIn: validPhones }
      }
    });
  } catch (err) {
    console.error('Error deleting dummy users:', err);
  }

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
