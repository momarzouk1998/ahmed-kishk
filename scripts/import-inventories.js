const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 5) {
      const category = parts[0].trim();
      const name = parts[1].trim();
      const qty = parseFloat(parts[2]) || 0;
      const cost = parseFloat(parts[3]) || 0;
      const sell = parseFloat(parts[4]) || 0;

      if (name) {
        rows.push({
          category: category || 'عام',
          name,
          qty,
          cost,
          sell,
        });
      }
    }
  }

  return rows;
}

async function importBranchInventory(csvPath, branchName, codePrefix) {
  const items = parseCSV(csvPath);
  console.log(`\n📦 Importing ${items.length} items for branch: ${branchName} (${csvPath})...`);

  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const indexStr = String(i + 1).padStart(3, '0');
    const code = `${codePrefix}-${indexStr}`;
    const itemId = `INV-${codePrefix}-${indexStr}`;

    // Determine unit
    let unit = 'متر';
    if (item.category.includes('اكسسوار') || item.name.includes('طقم') || item.name.includes('كاب') || item.name.includes('شريط')) {
      unit = item.name.includes('طقم') ? 'طقم' : 'قطعة';
    }

    try {
      const result = await prisma.inventoryItem.upsert({
        where: { code },
        create: {
          id: itemId,
          code,
          name: item.name,
          category: item.category,
          unit,
          totalQuantity: item.qty,
          reservedQuantity: 0,
          costPrice: item.cost,
          sellPrice: item.sell,
          branch: branchName,
          minAlert: 20,
          supplier: 'مورد عام',
        },
        update: {
          name: item.name,
          category: item.category,
          unit,
          totalQuantity: item.qty,
          costPrice: item.cost,
          sellPrice: item.sell,
          branch: branchName,
        },
      });
      importedCount++;
    } catch (err) {
      console.error(`❌ Error importing item ${item.name} (${code}):`, err.message);
    }
  }

  console.log(`✅ ${branchName}: Processed ${importedCount} inventory items successfully.`);
}

async function main() {
  console.log('🚀 Starting Inventory CSV Import...');

  const rootDir = process.cwd();

  const mainCsv = path.join(rootDir, 'مخازن احمد كشك - مخزن الرئيسى.csv');
  const orabyCsv = path.join(rootDir, 'مخازن احمد كشك - مخزن عرابى.csv');
  const thalCsv = path.join(rootDir, 'مخازن احمد كشك - مخزن الثلاثينى.csv');

  await importBranchInventory(mainCsv, 'الفرع الرئيسي', 'MAIN');
  await importBranchInventory(orabyCsv, 'فرع عرابي', 'ORABY');
  await importBranchInventory(thalCsv, 'فرع الثلاثيني', 'THAL');

  const totalInDb = await prisma.inventoryItem.count();
  console.log(`\n🎉 Total Inventory Items in Database: ${totalInDb}`);
}

main()
  .catch((e) => {
    console.error('❌ Global Import Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
