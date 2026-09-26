import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere } from '@/lib/branchScope';
import { getTodayDateStr } from '@/lib/dateUtils';
import { syncPurchaseInvoicesFromSupplierPayments } from '@/lib/supplierPaymentsSync';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    // #GUARD: SupplierCheck مالوش عمود branch مباشر — الفلترة عن طريق فروع
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

    const checks = await prisma.supplierCheck.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, checks });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    // يدعم إما شيك واحد أو مصفوفة شيكات (دفعة من فاتورة مشتريات مثلاً)
    const rawList = Array.isArray(body.checks) ? body.checks : (Array.isArray(body) ? body : [body]);

    const results = [];
    for (const c of rawList) {
      if (!c || !c.checkNumber) continue;
      const checkId = c.id || `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const check = await prisma.supplierCheck.upsert({
        where: { id: checkId },
        create: {
          id: checkId,
          checkNumber: String(c.checkNumber).trim(),
          bankName: c.bankName || 'غير محدد',
          supplierId: c.supplierId || '',
          supplierName: c.supplierName || '',
          amount: Number(c.amount) || 0,
          issueDate: c.issueDate || getTodayDateStr(),
          dueDate: c.dueDate || '',
          status: c.status || 'قيد الانتظار',
          notes: c.notes || '',
          branch: c.branch || undefined,
        },
        update: {
          checkNumber: c.checkNumber !== undefined ? String(c.checkNumber).trim() : undefined,
          bankName: c.bankName || undefined,
          dueDate: c.dueDate || undefined,
          status: c.status || undefined,
          amount: c.amount !== undefined ? Number(c.amount) : undefined,
          notes: c.notes !== undefined ? c.notes : undefined,
          branch: c.branch !== undefined ? c.branch : undefined,
        },
      });
      results.push(check);
    }

    const supplierIds = Array.from(new Set(results.map(c => c.supplierId).filter(Boolean)));
    for (const sid of supplierIds) {
      await syncPurchaseInvoicesFromSupplierPayments(sid);
    }

    return NextResponse.json({ success: true, check: results[0], checks: results });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

// حذف شيك مورد — للمدير العام فقط. لو الشيك كان "تم الصرف" وكان مربوط بفرع،
// الحذف بيرجّع أثره من رصيد الخزينة تلقائيًا لأن /api/branch-balance بيحسب
// من الصفوف الموجودة فعليًا فى الجدول كل مرة، مش من رصيد محفوظ.
export async function DELETE(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    if (!scope.isAdmin) {
      return NextResponse.json({ success: false, error: 'حذف شيك مورد يحتاج صلاحية مدير' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب للحذف' }, { status: 400 });
    }

    const existing = await prisma.supplierCheck.findUnique({ where: { id } });
    await prisma.supplierCheck.delete({ where: { id } }).catch(() => null);
    if (existing?.supplierId) {
      await syncPurchaseInvoicesFromSupplierPayments(existing.supplierId);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
