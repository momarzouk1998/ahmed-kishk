import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import initialInventory from '@/data/initialInventory.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let inserted = 0;
    let updated = 0;

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
      message: 'تم تحديث ومزامنة كافة أصناف المخزون بقاعدة البيانات بنجاح',
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
