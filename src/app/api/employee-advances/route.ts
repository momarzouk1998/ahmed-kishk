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
    const advances = await prisma.employeeAdvance.findMany({
      where: branchWhere(scope),
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, advances });
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
    const { id, date, employeeId, employeeName, branch, type, amount, reason, treasuryDeducted, settledInPayrollId, recordedBy } = body;

    if (!employeeId || !amount) {
      return NextResponse.json({ success: false, error: 'الموظف والمبلغ مطلوبان' }, { status: 400 });
    }

    const existingById = id ? await prisma.employeeAdvance.findUnique({ where: { id } }) : null;
    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل سجل فرع آخر' }, { status: 403 });
    }

    const advanceId = id || `adv-${Date.now()}`;
    const advance = await prisma.employeeAdvance.upsert({
      where: { id: advanceId },
      create: {
        id: advanceId,
        date: date || new Date().toISOString().split('T')[0],
        employeeId,
        employeeName: employeeName || '',
        branch: effectiveCreateBranch(scope, branch),
        type: type || 'سلفة',
        amount: Number(amount) || 0,
        reason: reason || undefined,
        treasuryDeducted: treasuryDeducted !== undefined ? Boolean(treasuryDeducted) : true,
        settledInPayrollId: settledInPayrollId || undefined,
        recordedBy: recordedBy || undefined,
      },
      update: {
        type: type || undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        reason: reason !== undefined ? reason : undefined,
        settledInPayrollId: settledInPayrollId !== undefined ? settledInPayrollId : undefined,
      },
    });

    return NextResponse.json({ success: true, advance });
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

    const existing = await prisma.employeeAdvance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'السجل غير موجود' }, { status: 404 });
    }
    if (!scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بحذف سجل فرع آخر' }, { status: 403 });
    }
    const perm = await assertPagePermission(request, 'p_employees', 'delete');
    if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

    await prisma.employeeAdvance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
