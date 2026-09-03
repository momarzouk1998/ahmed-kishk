import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payments = await prisma.supplierPayment.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, date, supplierId, supplierName, amount, method, treasury, notes } = body;

    if (!supplierId || !amount) {
      return NextResponse.json({ success: false, error: 'المورد والمبلغ مطلوبان' }, { status: 400 });
    }

    const paymentId = id || `SPAY-${Date.now()}`;
    const payment = await prisma.supplierPayment.upsert({
      where: { id: paymentId },
      create: {
        id: paymentId,
        date: date || new Date().toISOString().split('T')[0],
        supplierId,
        supplierName: supplierName || '',
        amount: Number(amount) || 0,
        method: method || 'نقدي',
        treasury: treasury || 'الخزينة الرئيسية',
        notes: notes || '',
      },
      update: {
        amount: Number(amount) || 0,
        method: method || undefined,
        treasury: treasury || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
