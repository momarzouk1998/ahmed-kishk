import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere } from '@/lib/branchScope';
import { getTodayDateStr } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    // #GUARD: SupplierPayment مالوش عمود branch مباشر — الفلترة عن طريق فروع
    // الموردين المسموح لموظف الفرع يشوفهم فقط (join يدوي بـ supplierId).
    let where = {};
    if (!scope.isAdmin) {
      const scopedSuppliers = await prisma.supplier.findMany({
        where: branchWhere(scope),
        select: { id: true },
      });
      const supplierIds = scopedSuppliers.map(s => s.id);
      where = { supplierId: { in: supplierIds } };
    }

    const payments = await prisma.supplierPayment.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { id, date, supplierId, supplierName, amount, method, treasury, notes } = body;

    if (!supplierId || !amount) {
      return NextResponse.json({ success: false, error: 'المورد والمبلغ مطلوبان' }, { status: 400 });
    }

    const paymentId = id || `SPAY-${Date.now()}`;
    // نلتقط المبلغ القديم (لو السند ده تعديل لسند موجود) قبل الـ upsert، عشان
    // نحسب الفارق (delta) بدل ما نفترض إن كل POST سند جديد بالكامل.
    const existingPayment = await prisma.supplierPayment.findUnique({ where: { id: paymentId } }).catch(() => null);
    const oldAmount = existingPayment ? Number(existingPayment.amount) || 0 : 0;
    const newAmount = Number(amount) || 0;
    const deltaAmount = newAmount - oldAmount;

    const payment = await prisma.supplierPayment.upsert({
      where: { id: paymentId },
      create: {
        id: paymentId,
        date: date || getTodayDateStr(),
        supplierId,
        supplierName: supplierName || '',
        amount: newAmount,
        method: method || 'نقدي',
        treasury: treasury || 'خزينة الفرع الرئيسي (سعد زغلول)',
        notes: notes || '',
      },
      update: {
        amount: newAmount,
        method: method || undefined,
        treasury: treasury || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    // ⚠️ تحديث ذرّي (atomic increment/decrement) لرصيد المورد — بدل ما العميل
    // يحسب الرصيد الجديد فى الـ JS من نسخة محلية ممكن تكون قديمة (stale) ويبعتها
    // كقيمة مطلقة، مما كان بيسبب فقدان دفعة كاملة لو حصل سدادين متزامنين لنفس
    // المورد. السداد بيزوّد paidAmount وينزّل balance (المستحق) بنفس القيمة.
    if (deltaAmount !== 0 && supplierId) {
      try {
        await prisma.supplier.update({
          where: { id: supplierId },
          data: {
            paidAmount: { increment: deltaAmount },
            balance: { decrement: deltaAmount },
          },
        });
      } catch (e) {
        console.error('Failed to atomically update supplier balance from payment:', e);
      }
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
