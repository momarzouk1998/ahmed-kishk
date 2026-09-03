import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const purchases = await prisma.purchaseInvoice.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, purchases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const body = await request.json();
    const {
      id, invoiceNumber, supplierName, supplierPhone, branch,
      subtotal, discountAmount, totalAmount, paidAmount, remainingAmount,
      paymentMethod, status, date, items, notes,
    } = body;

    const invNum = invoiceNumber || `PUR-${Date.now()}`;
    const invoice = await prisma.purchaseInvoice.upsert({
      where: { invoiceNumber: invNum },
      create: {
        id: id || invNum,
        invoiceNumber: invNum,
        supplierName: supplierName || 'مورد عام',
        supplierPhone: supplierPhone || '',
        branch: effectiveCreateBranch(scope, branch),
        subtotal: Number(subtotal) || 0,
        discountAmount: Number(discountAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        paymentMethod: paymentMethod || 'نقدي (كاش)',
        status: status || 'آجل / غير مسدد',
        date: date || new Date().toISOString().split('T')[0],
        items: items || [],
        notes: notes || '',
      },
      update: {
        supplierName: supplierName || undefined,
        supplierPhone: supplierPhone !== undefined ? supplierPhone : undefined,
        subtotal: subtotal !== undefined ? Number(subtotal) : undefined,
        discountAmount: discountAmount !== undefined ? Number(discountAmount) : undefined,
        totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
        remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
        paymentMethod: paymentMethod || undefined,
        status: status || undefined,
        items: items !== undefined ? items : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, invoice });
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
    await prisma.purchaseInvoice.deleteMany({
      where: { OR: [{ id }, { invoiceNumber: id }] },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
