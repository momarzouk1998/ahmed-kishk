import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import initialInventory from '@/data/initialInventory.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let inserted = 0;

    // 1. مسح كافة الأصناف القديمة في فرع عرابي لتجنب أي أصناف مكررة أو قديمة
    await prisma.inventoryItem.deleteMany({
      where: { branch: 'فرع عرابي' },
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

    const totalInDb = await prisma.inventoryItem.count();
    const mainCount = await prisma.inventoryItem.count({ where: { branch: 'الفرع الرئيسي' } });
    const orabyCount = await prisma.inventoryItem.count({ where: { branch: 'فرع عرابي' } });
    const thalCount = await prisma.inventoryItem.count({ where: { branch: 'فرع الثلاثيني' } });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث واستبدال أصناف مخزن عرابي بنجاح ومزامنة المخزون بالكامل',
      totalInDb,
      breakdown: {
        'الفرع الرئيسي': mainCount,
        'فرع عرابي': orabyCount,
        'فرع الثلاثيني': thalCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error' }, { status: 500 });
  }
}
