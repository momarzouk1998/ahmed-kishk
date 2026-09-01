import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, code, name, category, unit, totalQuantity, reservedQuantity, costPrice, sellPrice, branch, minAlert, supplier } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'كود الصنف والاسم مطلوبان' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.upsert({
      where: { code: code.trim() },
      create: {
        id: id || `INV-${Date.now()}`,
        code: code.trim(),
        name: name.trim(),
        category: category || 'ستائر',
        unit: unit || 'متر',
        totalQuantity: Number(totalQuantity) || 0,
        reservedQuantity: Number(reservedQuantity) || 0,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        branch: branch || 'الفرع الرئيسي',
        minAlert: Number(minAlert) || 20,
        supplier: supplier || 'شركة النيل',
      },
      update: {
        name: name.trim(),
        category: category || undefined,
        unit: unit || undefined,
        totalQuantity: totalQuantity !== undefined ? Number(totalQuantity) : undefined,
        reservedQuantity: reservedQuantity !== undefined ? Number(reservedQuantity) : undefined,
        costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
        sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
        branch: branch || undefined,
        minAlert: minAlert !== undefined ? Number(minAlert) : undefined,
        supplier: supplier || undefined,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب للحذف' }, { status: 400 });
    }
    await prisma.inventoryItem.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
