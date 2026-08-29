import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const quotations = await prisma.quotationOrder.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, quotations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, inspectionId, customerName, phone, address, branch, status, totalAmount, depositPaid, remainingAmount, date, deliveryDate, estimatorName, rooms } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Quotation ID is required' }, { status: 400 });
    }

    const quotation = await prisma.quotationOrder.upsert({
      where: { id },
      create: {
        id,
        inspectionId: inspectionId || id,
        customerName: customerName || '',
        phone: phone || '',
        address: address || '',
        branch: branch || 'الفرع الرئيسي',
        status: status || 'بانتظار التسعير',
        totalAmount: Number(totalAmount) || 0,
        depositPaid: Number(depositPaid) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        date: date || new Date().toISOString().split('T')[0],
        deliveryDate: deliveryDate || null,
        estimatorName: estimatorName || 'أحمد كشك',
        rooms: rooms || [],
      },
      update: {
        customerName: customerName || undefined,
        phone: phone || undefined,
        address: address || undefined,
        branch: branch || undefined,
        status: status || undefined,
        totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
        depositPaid: depositPaid !== undefined ? Number(depositPaid) : undefined,
        remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
        deliveryDate: deliveryDate !== undefined ? deliveryDate : undefined,
        estimatorName: estimatorName || undefined,
        rooms: rooms !== undefined ? rooms : undefined,
      },
    });

    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
