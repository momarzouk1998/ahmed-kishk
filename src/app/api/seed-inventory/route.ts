import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import initialInventory from '@/data/initialInventory.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let inserted = 0;

    // 1. مسح وإعادة ضبط أصناف الفرع التجاري وفرع عرابي لضمان عدم وجود تكرار
    await prisma.inventoryItem.deleteMany({
      where: {
        OR: [
          { branch: 'الفرع التجاري' },
          { branch: { contains: 'تجاري' } },
          { branch: { contains: 'تجارى' } },
        ],
      },
    });

    // 2. إدراج وتحديث كافة الأصناف الرسمية الجديدة من initialInventory.json
    for (const item of (initialInventory as any[])) {
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
          minAlert: item.minAlert || 20,
        },
      });
      inserted++;
    }

    // 3. مزامنة التصنيفات لجميع الفروع تلقائياً
    const distinctMap = new Map<string, { name: string; branch: string }>();
    (initialInventory as any[]).forEach(item => {
      if (item.category && item.branch) {
        const key = item.category.trim() + '__' + item.branch.trim();
        distinctMap.set(key, { name: item.category.trim(), branch: item.branch.trim() });
      }
    });

    const seedCats = Array.from(distinctMap.values());
    for (const cat of seedCats) {
      try {
        await (prisma as any).branchCategory.upsert({
          where: {
            name_branch: {
              name: cat.name,
              branch: cat.branch,
            },
          },
          create: {
            name: cat.name,
            branch: cat.branch,
          },
          update: {
            name: cat.name,
          },
        });
      } catch (e) {}
    }

    const totalInDb = await prisma.inventoryItem.count();
    const mainCount = await prisma.inventoryItem.count({ where: { branch: 'الفرع الرئيسي' } });
    const orabyCount = await prisma.inventoryItem.count({ where: { branch: 'فرع عرابي' } });
    const thalCount = await prisma.inventoryItem.count({ where: { branch: 'فرع الثلاثيني' } });
    const comCount = await prisma.inventoryItem.count({ where: { branch: 'الفرع التجاري' } });
    const totalCats = await (prisma as any).branchCategory.count();

    return NextResponse.json({
      success: true,
      message: 'تم تحديث واستبدال أصناف المخزن التجاري ومزامنة المخزون والتصنيفات بالكامل بنجاح',
      totalInDb,
      totalCategories: totalCats,
      breakdown: {
        'الفرع الرئيسي': mainCount,
        'فرع عرابي': orabyCount,
        'فرع الثلاثيني': thalCount,
        'الفرع التجاري': comCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error' }, { status: 500 });
  }
}
