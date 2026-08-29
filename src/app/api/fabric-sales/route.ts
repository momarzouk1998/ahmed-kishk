import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sales = await prisma.salesInvoice.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, sales });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, invoiceNumber, customerName, phone, branch, totalAmount, paidAmount, remainingAmount, paymentType, date, items, notes } = body;

    const invNum = invoiceNumber || `INV-${Date.now()}`;
    const invoice = await prisma.salesInvoice.upsert({
      where: { invoiceNumber: invNum },
      create: {
        id: id || invNum,
        invoiceNumber: invNum,
        customerName: customerName || 'عميل نقدي',
        phone: phone || '',
        branch: branch || 'الفرع الرئيسي',
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        paymentType: paymentType || 'نقدي',
        date: date || new Date().toISOString().split('T')[0],
        items: items || [],
        notes: notes || '',
      },
      update: {
        customerName: customerName || undefined,
        phone: phone || undefined,
        totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
        remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
        paymentType: paymentType || undefined,
        items: items !== undefined ? items : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
