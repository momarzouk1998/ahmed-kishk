import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const purchases = await prisma.purchaseInvoice.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, purchases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, invoiceNumber, supplierName, branch, totalAmount, paidAmount, remainingAmount, date, items, notes } = body;

    const invNum = invoiceNumber || `PUR-${Date.now()}`;
    const invoice = await prisma.purchaseInvoice.upsert({
      where: { invoiceNumber: invNum },
      create: {
        id: id || invNum,
        invoiceNumber: invNum,
        supplierName: supplierName || 'مورد عام',
        branch: branch || 'الفرع الرئيسي',
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        date: date || new Date().toISOString().split('T')[0],
        items: items || [],
        notes: notes || '',
      },
      update: {
        supplierName: supplierName || undefined,
        totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
        remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
        items: items !== undefined ? items : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
