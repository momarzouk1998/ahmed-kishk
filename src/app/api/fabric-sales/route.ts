import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const sales = await prisma.salesInvoice.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });
    const normalizedSales = sales.map(s => ({
      ...s,
      paymentMethod: s.paymentType || (s as any).paymentMethod || 'نقدي',
    }));
    return NextResponse.json({ success: true, sales: normalizedSales });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const body = await request.json();
    const { id, invoiceNumber, customerName, phone, branch, totalAmount, paidAmount, remainingAmount, date, items, notes } = body;
    const pMethod = body.paymentMethod || body.paymentType || 'نقدي';

    const invNum = invoiceNumber || `INV-${Date.now()}`;
    const invoice = await prisma.salesInvoice.upsert({
      where: { invoiceNumber: invNum },
      create: {
        id: id || invNum,
        invoiceNumber: invNum,
        customerName: customerName || 'عميل نقدي',
        phone: phone || '',
        branch: effectiveCreateBranch(scope, branch),
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        paymentType: pMethod,
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
        paymentType: pMethod,
        items: items !== undefined ? items : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    const normalizedInvoice = {
      ...invoice,
      paymentMethod: invoice.paymentType || pMethod,
    };

    return NextResponse.json({ success: true, invoice: normalizedInvoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
