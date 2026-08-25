import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: {
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = items.map(i => ({
      ...i,
      availableMeters: Math.max(0, i.quantityMeters - (i.reservedMeters || 0)),
    }));

    return NextResponse.json({ items: formatted });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, code, quantityMeters, reservedMeters, costPerMeter, pricePerMeter, branch, supplierName } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'اسم الصنف والكود مطلوبان' }, { status: 400 });
    }

    let supplierId = null;
    if (supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: { name: supplierName.trim() },
      });
      if (supplier) supplierId = supplier.id;
    }

    const item = await prisma.inventoryItem.upsert({
      where: { code: code.trim() },
      update: {
        name: name.trim(),
        category: category || 'سواريه',
        quantityMeters: Number(quantityMeters) || 0,
        reservedMeters: Number(reservedMeters) || 0,
        costPerMeter: Number(costPerMeter) || 0,
        pricePerMeter: Number(pricePerMeter) || 0,
        branch: branch || 'الفرع الرئيسي — القاهرة',
        supplierId,
      },
      create: {
        name: name.trim(),
        category: category || 'سواريه',
        code: code.trim(),
        quantityMeters: Number(quantityMeters) || 0,
        reservedMeters: Number(reservedMeters) || 0,
        costPerMeter: Number(costPerMeter) || 0,
        pricePerMeter: Number(pricePerMeter) || 0,
        branch: branch || 'الفرع الرئيسي — القاهرة',
        supplierId,
      },
      include: {
        supplier: true,
      },
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error saving inventory item:', error);
    return NextResponse.json({ error: `حدث خطأ أثناء حفظ الصنف: ${error?.message}` }, { status: 500 });
  }
}
