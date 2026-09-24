import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { assertPagePermission } from '@/lib/permissionsServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const settlements = await prisma.payrollSettlement.findMany({
      where: branchWhere(scope),
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, settlements });
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
    const {
      id, settlementDate, weekStartDate, weekEndDate, branch, employeeId, employeeName,
      dailyWage, daysAttended, baseSalaryEarned, totalBonuses, totalDeductions, totalAdvances,
      netPayout, isPaid, paidAt, paidFromTreasury, notes, payType,
    } = body;

    if (!employeeId || netPayout === undefined) {
      return NextResponse.json({ success: false, error: 'الموظف وصافى الراتب مطلوبان' }, { status: 400 });
    }

    const existingById = id ? await prisma.payrollSettlement.findUnique({ where: { id } }) : null;
    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل تقفيل فرع آخر' }, { status: 403 });
    }

    const settlementId = id || `PAY-${employeeId}-${Date.now()}`;
    const settlement = await prisma.payrollSettlement.upsert({
      where: { id: settlementId },
      create: {
        id: settlementId,
        settlementDate: settlementDate || '',
        weekStartDate: weekStartDate || '',
        weekEndDate: weekEndDate || '',
        branch: effectiveCreateBranch(scope, branch),
        employeeId,
        employeeName: employeeName || '',
        dailyWage: Number(dailyWage) || 0,
        daysAttended: Number(daysAttended) || 0,
        baseSalaryEarned: Number(baseSalaryEarned) || 0,
        totalBonuses: Number(totalBonuses) || 0,
        totalDeductions: Number(totalDeductions) || 0,
        totalAdvances: Number(totalAdvances) || 0,
        netPayout: Number(netPayout) || 0,
        isPaid: isPaid !== undefined ? Boolean(isPaid) : true,
        paidAt: paidAt || new Date().toISOString(),
        paidFromTreasury: paidFromTreasury || undefined,
        notes: notes || undefined,
        payType: payType || undefined,
      },
      update: {
        netPayout: netPayout !== undefined ? Number(netPayout) : undefined,
        isPaid: isPaid !== undefined ? Boolean(isPaid) : undefined,
        paidAt: paidAt !== undefined ? paidAt : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, settlement });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب للحذف' }, { status: 400 });
    }

    const existing = await prisma.payrollSettlement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'سجل التقفيل غير موجود' }, { status: 404 });
    }
    if (!scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بحذف تقفيل فرع آخر' }, { status: 403 });
    }
    const perm = await assertPagePermission(request, 'p_employees', 'delete');
    if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

    await prisma.payrollSettlement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

