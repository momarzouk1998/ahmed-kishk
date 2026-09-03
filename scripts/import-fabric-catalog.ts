/**
 * استيراد قائمة أسعار الأقمشة الخاصة بفرعى عمر أفندي والثلاثيني.
 *
 * ⚠️ هذا السكريبت آمن تماماً للتكرار: يستخدم upsert فقط بمفتاح `code` فريد،
 * ولا يحتوى على أى عملية deleteMany أو truncate. تشغيله أكثر من مرة لن يكرر
 * الأصناف ولن يمسح أى بيانات أخرى فى النظام.
 *
 * التشغيل: npm run import:fabric-catalog
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CatalogRow {
  category: string;
  name: string;
  costPrice: number;
  sellPrice: number;
}

// 108 صنف من ملف "الاسعار الخاصه بفرع عمرافندى و فرع الثلاثينى".
// الأصناف الثلاثة بدون سعر تكلفة فى الملف الأصلى (كونكورد، سعودى 180سم، سعودى 150سم)
// سُجّلت هنا بـ costPrice = 0 مؤقتاً (بناءً على تأكيد صاحب النظام) — يمكن تعديلها
// لاحقاً من صفحة المخزون بمجرد توفر السعر الحقيقى.
const CATALOG: CatalogRow[] = [
  { category: 'كتان ساده', name: 'فريسكا', costPrice: 55, sellPrice: 70 },
  { category: 'كتان ساده', name: 'سى واى', costPrice: 55, sellPrice: 80 },
  { category: 'كتان ساده', name: 'مقلم جيكار', costPrice: 70, sellPrice: 130 },
  { category: 'كتان ساده', name: 'كتان خام', costPrice: 60, sellPrice: 80 },
  { category: 'كتان ساده', name: 'كرنكل قطن', costPrice: 60, sellPrice: 80 },
  { category: 'كتان ساده', name: 'فرنساوى', costPrice: 58, sellPrice: 80 },
  { category: 'كتان ساده', name: 'كتان لينن', costPrice: 90, sellPrice: 130 },
  { category: 'كتان ساده', name: 'مقلم مضفر', costPrice: 110, sellPrice: 140 },
  { category: 'كتان ساده', name: 'كتان مشبح', costPrice: 110, sellPrice: 130 },
  { category: 'كتان ساده', name: 'كتان اسبانى', costPrice: 70, sellPrice: 80 },
  { category: 'كتان ساده', name: 'كوريشه', costPrice: 55, sellPrice: 100 },
  { category: 'كتان ساده', name: 'كتان كرش', costPrice: 80, sellPrice: 110 },
  { category: 'كتان ساده', name: 'كتان بيور', costPrice: 120, sellPrice: 150 },
  { category: 'كتان ساده', name: 'كتان اسلاب', costPrice: 145, sellPrice: 180 },
  { category: 'كتان ساده', name: 'جلاكسى ساده', costPrice: 105, sellPrice: 135 },
  { category: 'كتان ساده', name: 'كتان دوبى', costPrice: 135, sellPrice: 180 },
  { category: 'كتان ساده', name: 'بوبلين ساده', costPrice: 115, sellPrice: 150 },
  { category: 'كتان ساده', name: 'كتان باريس ساده', costPrice: 58, sellPrice: 130 },

  { category: 'كتان مشجر', name: 'اسبانى مشجر', costPrice: 80, sellPrice: 100 },
  { category: 'كتان مشجر', name: 'فرنساوى فوم', costPrice: 80, sellPrice: 100 },
  { category: 'كتان مشجر', name: 'اسلاب مشجر', costPrice: 80, sellPrice: 100 },
  { category: 'كتان مشجر', name: 'فرنساوى مشجر', costPrice: 80, sellPrice: 100 },
  { category: 'كتان مشجر', name: 'مقلم اكسفورد', costPrice: 80, sellPrice: 120 },
  { category: 'كتان مشجر', name: 'كتان كورد', costPrice: 165, sellPrice: 200 },
  { category: 'كتان مشجر', name: 'كتان مشعر', costPrice: 165, sellPrice: 200 },
  { category: 'كتان مشجر', name: 'كتان مقلم مطرز', costPrice: 230, sellPrice: 300 },

  { category: 'ركامه قطن', name: 'ركامه كورد مطرز', costPrice: 240, sellPrice: 280 },
  { category: 'ركامه قطن', name: 'ركامه 2 لون', costPrice: 280, sellPrice: 330 },
  { category: 'ركامه قطن', name: 'ركامه فوم', costPrice: 135, sellPrice: 220 },
  { category: 'ركامه قطن', name: 'ركامه ورده طايره', costPrice: 240, sellPrice: 270 },
  { category: 'ركامه قطن', name: 'ركامه الوان', costPrice: 149, sellPrice: 180 },
  { category: 'ركامه قطن', name: 'ركامه ابيض', costPrice: 135, sellPrice: 180 },
  { category: 'ركامه قطن', name: 'ركامه جبير', costPrice: 220, sellPrice: 350 },
  { category: 'ركامه قطن', name: 'شبك زاره', costPrice: 160, sellPrice: 200 },

  { category: 'كريب ساده', name: 'روزالين', costPrice: 88, sellPrice: 130 },
  { category: 'كريب ساده', name: 'اسكوبا', costPrice: 52, sellPrice: 100 },
  { category: 'كريب ساده', name: 'انجيكا', costPrice: 132, sellPrice: 180 },
  { category: 'كريب ساده', name: 'رويال', costPrice: 78, sellPrice: 120 },
  { category: 'كريب ساده', name: 'كريب حرير', costPrice: 70, sellPrice: 120 },
  { category: 'كريب ساده', name: 'كونكورد', costPrice: 0, sellPrice: 140 }, // سعر التكلفة غير متوفر بالملف
  { category: 'كريب ساده', name: 'سعودى 180سم', costPrice: 0, sellPrice: 180 }, // سعر التكلفة غير متوفر بالملف
  { category: 'كريب ساده', name: 'سعودى 150سم', costPrice: 0, sellPrice: 150 }, // سعر التكلفة غير متوفر بالملف

  { category: 'كريب مشجر', name: 'كريز مشجر', costPrice: 70, sellPrice: 100 },
  { category: 'كريب مشجر', name: 'روز كريب', costPrice: 78, sellPrice: 100 },
  { category: 'كريب مشجر', name: 'جلاكسي مشجر', costPrice: 80, sellPrice: 100 },
  { category: 'كريب مشجر', name: 'جبردين مقلم', costPrice: 75, sellPrice: 150 },
  { category: 'كريب مشجر', name: 'روزالين مقلم', costPrice: 90, sellPrice: 175 },
  { category: 'كريب مشجر', name: 'رويال مشجر', costPrice: 75, sellPrice: 100 },
  { category: 'كريب مشجر', name: 'sph مشجر', costPrice: 78, sellPrice: 100 },

  { category: 'حرير', name: 'جيكار 180سم', costPrice: 150, sellPrice: 200 },
  { category: 'حرير', name: 'ارمانى ساده', costPrice: 66, sellPrice: 120 },
  { category: 'حرير', name: 'ارمانى مشجر', costPrice: 80, sellPrice: 100 },
  { category: 'حرير', name: 'حرير سعودى', costPrice: 120, sellPrice: 180 },
  { category: 'حرير', name: 'تيك توك ساده', costPrice: 120, sellPrice: 180 },
  { category: 'حرير', name: 'فكرو جيكار', costPrice: 130, sellPrice: 250 },

  { category: 'اورجانزا', name: 'اورجانزا ساده', costPrice: 80, sellPrice: 120 },
  { category: 'اورجانزا', name: 'اورجانزا كرنكل', costPrice: 66, sellPrice: 110 },
  { category: 'اورجانزا', name: 'روزتا بطانه', costPrice: 40, sellPrice: 50 },
  { category: 'اورجانزا', name: 'شمر ساده', costPrice: 80, sellPrice: 150 },
  { category: 'اورجانزا', name: 'دوف دايب', costPrice: 80, sellPrice: 150 },

  { category: 'شيفون', name: 'شيفون ساده', costPrice: 59, sellPrice: 80 },
  { category: 'شيفون', name: 'شيفون 3D', costPrice: 120, sellPrice: 150 },
  { category: 'شيفون', name: 'شيفون مطرز', costPrice: 280, sellPrice: 380 },

  { category: 'تل', name: 'تل ايطالى', costPrice: 27, sellPrice: 35 },
  { category: 'تل', name: 'تل استرتش', costPrice: 35, sellPrice: 80 },
  { category: 'تل', name: 'دانتل بلمتر', costPrice: 100, sellPrice: 200 },
  { category: 'تل', name: 'دانتل بلقطعه', costPrice: 330, sellPrice: 550 },
  { category: 'تل', name: 'دانتيل ايطالى', costPrice: 240, sellPrice: 350 },

  { category: 'ستان', name: 'ستان صالونه مارلين', costPrice: 100, sellPrice: 150 },
  { category: 'ستان', name: 'ستان تركى', costPrice: 78, sellPrice: 100 },
  { category: 'ستان', name: 'ستان فينا', costPrice: 130, sellPrice: 200 },
  { category: 'ستان', name: 'ستان ميكادو', costPrice: 110, sellPrice: 180 },
  { category: 'ستان', name: 'سطلانه', costPrice: 110, sellPrice: 200 },
  { category: 'ستان', name: 'ستان بليسه ساده', costPrice: 125, sellPrice: 150 },
  { category: 'ستان', name: 'ستان بليسه مشجر', costPrice: 125, sellPrice: 150 },

  { category: 'فيزون', name: 'فيزون ساده مستورد', costPrice: 140, sellPrice: 180 },
  { category: 'فيزون', name: 'فيزون ITY', costPrice: 90, sellPrice: 140 },
  { category: 'فيزون', name: 'فيزون مايوه مشجر', costPrice: 140, sellPrice: 200 },
  { category: 'فيزون', name: 'ديربى', costPrice: 80, sellPrice: 130 },

  { category: 'سوارية', name: 'هاند ميد قشر و لولى', costPrice: 520, sellPrice: 800 },
  { category: 'سوارية', name: 'هاند ميد حجر', costPrice: 1100, sellPrice: 1300 },
  { category: 'سوارية', name: 'هاند ميد بوكيه حجر', costPrice: 1100, sellPrice: 1500 },
  { category: 'سوارية', name: 'هاند ميد فرع خرز و لولى', costPrice: 1100, sellPrice: 1400 },
  { category: 'سوارية', name: 'هاند ميد سمبوكسه', costPrice: 950, sellPrice: 1200 },
  { category: 'سوارية', name: 'دانتل 2 لون', costPrice: 900, sellPrice: 1250 },
  { category: 'سوارية', name: 'هاند ميد بلجيكى', costPrice: 520, sellPrice: 800 },
  { category: 'سوارية', name: 'كسر قشر نجف', costPrice: 340, sellPrice: 600 },
  { category: 'سوارية', name: 'شبك استرتس', costPrice: 350, sellPrice: 650 },
  { category: 'سوارية', name: 'قشر سمك بليسيه', costPrice: 135, sellPrice: 200 },
  { category: 'سوارية', name: 'bigقشر سمك', costPrice: 220, sellPrice: 380 },
  { category: 'سوارية', name: 'فتافيت ساده', costPrice: 100, sellPrice: 150 },
  { category: 'سوارية', name: 'فتافيت استرس', costPrice: 145, sellPrice: 250 },
  { category: 'سوارية', name: 'VX', costPrice: 190, sellPrice: 360 },
  { category: 'سوارية', name: 'بسكوته', costPrice: 120, sellPrice: 360 },
  { category: 'سوارية', name: 'فيزون استرس', costPrice: 550, sellPrice: 650 },
  { category: 'سوارية', name: 'هاند ميد RS', costPrice: 550, sellPrice: 800 },
  { category: 'سوارية', name: 'هاند ميد حجر فتله حرير', costPrice: 1500, sellPrice: 1850 },
  { category: 'سوارية', name: 'دانتيل مطرز', costPrice: 900, sellPrice: 1350 },
  { category: 'سوارية', name: 'دانتيل لولى', costPrice: 600, sellPrice: 900 },
  { category: 'سوارية', name: 'هاند ميد ورده طايره', costPrice: 750, sellPrice: 1400 },
  { category: 'سوارية', name: 'جوبير اسبانى', costPrice: 600, sellPrice: 800 },
  { category: 'سوارية', name: 'هاند ميد الفرعونيه', costPrice: 1100, sellPrice: 1400 },
  { category: 'سوارية', name: 'هاند ميد باريس', costPrice: 900, sellPrice: 1250 },
  { category: 'سوارية', name: 'شعر مقلم', costPrice: 70, sellPrice: 100 },
  { category: 'سوارية', name: 'كافيار', costPrice: 200, sellPrice: 400 },
  { category: 'سوارية', name: 'ديسكو', costPrice: 96, sellPrice: 200 },

  { category: 'فذكوز', name: 'فذكوز ساده', costPrice: 78, sellPrice: 120 },
  { category: 'فذكوز', name: 'فذكوز مشجر', costPrice: 85, sellPrice: 110 },
];

const BRANCHES: { branch: string; codePrefix: string }[] = [
  { branch: 'فرع عمر أفندي', codePrefix: 'OMR' },
  { branch: 'فرع الثلاثيني', codePrefix: 'THL' },
];

async function main() {
  if (CATALOG.length !== 108) {
    throw new Error(`عدد الأصناف المتوقع 108، لكن الموجود فعلياً ${CATALOG.length} — تحقق من القائمة قبل الاستيراد.`);
  }

  let created = 0;
  let updated = 0;

  for (const { branch, codePrefix } of BRANCHES) {
    for (let i = 0; i < CATALOG.length; i++) {
      const row = CATALOG[i];
      const code = `${codePrefix}-${String(i + 1).padStart(3, '0')}`;

      const existing = await prisma.inventoryItem.findUnique({ where: { code } });

      await prisma.inventoryItem.upsert({
        where: { code },
        create: {
          code,
          name: row.name,
          category: row.category,
          unit: 'متر',
          totalQuantity: 0,
          reservedQuantity: 0,
          costPrice: row.costPrice,
          sellPrice: row.sellPrice,
          branch,
          minAlert: 20,
          supplier: 'مورد عام',
        },
        update: {
          name: row.name,
          category: row.category,
          costPrice: row.costPrice,
          sellPrice: row.sellPrice,
          branch,
        },
      });

      if (existing) updated++; else created++;
    }
    console.log(`✅ تم استيراد ${CATALOG.length} صنف لـ "${branch}" (أكواد ${codePrefix}-001 .. ${codePrefix}-${String(CATALOG.length).padStart(3, '0')})`);
  }

  console.log(`\n🎉 اكتمل الاستيراد: ${created} صنف جديد، ${updated} صنف مُحدَّث. الإجمالى: ${created + updated} صف.`);
}

main()
  .catch((e) => {
    console.error('❌ خطأ فى استيراد قائمة الأقمشة:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
