import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.inventoryItem.count();
  const omr = await prisma.inventoryItem.count({ where: { branch: 'فرع عمر أفندي' } });
  const thl = await prisma.inventoryItem.count({ where: { branch: 'فرع الثلاثيني' } });
  const sample = await prisma.inventoryItem.findMany({
    where: { code: { in: ['OMR-001', 'OMR-070', 'THL-108'] } },
    select: { code: true, name: true, category: true, costPrice: true, sellPrice: true, branch: true, totalQuantity: true, unit: true },
  });
  console.log(JSON.stringify({ total, omr, thl, sample }, null, 2));
}

main().finally(() => prisma.$disconnect());
