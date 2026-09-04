const fs = require('fs');
const path = require('path');

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

function processBranch(csvPath, branchName, codePrefix) {
  const items = parseCSV(csvPath);
  return items.map((item, idx) => {
    const indexStr = String(idx + 1).padStart(3, '0');
    const code = `${codePrefix}-${indexStr}`;
    const id = `INV-${codePrefix}-${indexStr}`;

    let unit = 'متر';
    if (item.category.includes('اكسسوار') || item.name.includes('طقم') || item.name.includes('كاب') || item.name.includes('شريط')) {
      unit = item.name.includes('طقم') ? 'طقم' : 'قطعة';
    }

    return {
      id,
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
    };
  });
}

const rootDir = process.cwd();
const mainItems = processBranch(path.join(rootDir, 'مخازن احمد كشك - مخزن الرئيسى.csv'), 'الفرع الرئيسي', 'MAIN');
const orabyItems = processBranch(path.join(rootDir, 'مخازن احمد كشك - مخزن عرابى.csv'), 'فرع عرابي', 'ORABY');
const thalItems = processBranch(path.join(rootDir, 'مخازن احمد كشك - مخزن الثلاثينى.csv'), 'فرع الثلاثيني', 'THAL');

const allItems = [...mainItems, ...orabyItems, ...thalItems];

const dataDir = path.join(rootDir, 'src', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const targetJsonPath = path.join(dataDir, 'initialInventory.json');
fs.writeFileSync(targetJsonPath, JSON.stringify(allItems, null, 2), 'utf8');

console.log(`✅ Successfully generated ${allItems.length} inventory items in ${targetJsonPath}!`);
console.log(`  - الفرع الرئيسي: ${mainItems.length} صنف`);
console.log(`  - فرع عرابي: ${orabyItems.length} صنف`);
console.log(`  - فرع الثلاثيني: ${thalItems.length} صنف`);
