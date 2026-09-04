import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere } from '@/lib/branchScope';

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
          issueDate: c.issueDate || new Date().toISOString().split('T')[0],
          dueDate: c.dueDate || '',
          status: c.status || 'قيد الانتظار',
          notes: c.notes || '',
        },
        update: {
          status: c.status || undefined,
          amount: c.amount !== undefined ? Number(c.amount) : undefined,
          notes: c.notes !== undefined ? c.notes : undefined,
        },
      });
      results.push(check);
    }

    return NextResponse.json({ success: true, check: results[0], checks: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
