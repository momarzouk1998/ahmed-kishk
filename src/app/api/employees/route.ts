import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const employees = await prisma.employee.findMany({
      where: branchWhere(scope),
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, employees });
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
    const { id, name, branch, dailyWage, monthlySalary, payType, workStartTime, workEndTime, phone, role, isActive } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الموظف مطلوب' }, { status: 400 });
    }

    const existingById = id ? await prisma.employee.findUnique({ where: { id } }) : null;
    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل موظف فرع آخر' }, { status: 403 });
    }

    const employee = await prisma.employee.upsert({
      where: { id: id || `emp-${Date.now()}` },
      create: {
        id: id || `emp-${Date.now()}`,
        name: String(name).trim(),
        branch: effectiveCreateBranch(scope, branch),
        dailyWage: Number(dailyWage) || 0,
        monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : undefined,
        payType: payType || 'أسبوعي',
        workStartTime: workStartTime || '11:00 AM',
        workEndTime: workEndTime || '11:30 PM',
        phone: phone || undefined,
        role: role || undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      update: {
        name: String(name).trim(),
        branch: !scope.isAdmin ? scope.branch : (branch || undefined),
        dailyWage: dailyWage !== undefined ? Number(dailyWage) : undefined,
        monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : undefined,
        payType: payType || undefined,
        workStartTime: workStartTime || undefined,
        workEndTime: workEndTime || undefined,
        phone: phone !== undefined ? phone : undefined,
        role: role !== undefined ? role : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, employee });
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

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 });
    }
    if (!scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بحذف موظف فرع آخر' }, { status: 403 });
    }

    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
