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
    const records = await prisma.attendanceRecord.findMany({
      where: branchWhere(scope),
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

// POST { employeeId, date, ... } — تسجيل حضور موظف ليوم معيّن. لو فيه سجل بالفعل
// لنفس الموظف/اليوم بيتحدّث (upsert منطقي، مفيش unique constraint على العمودين
// لتفادى مخاطرة data-loss فى db push — التحقق بيحصل هنا فى الكود).
export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const body = await request.json();
    const { id, date, employeeId, employeeName, branch, status, checkInTime, checkOutTime, delayMinutes, notes, recordedBy } = body;

    if (!employeeId || !date || !status) {
      return NextResponse.json({ success: false, error: 'الموظف والتاريخ والحالة مطلوبين' }, { status: 400 });
    }

    const existing = id
      ? await prisma.attendanceRecord.findUnique({ where: { id } })
      : await prisma.attendanceRecord.findFirst({ where: { employeeId, date } });

    if (existing && !scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل حضور فرع آخر' }, { status: 403 });
    }

    const data = {
      date,
      employeeId,
      employeeName: employeeName || '',
      branch: effectiveCreateBranch(scope, branch),
      status,
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
      delayMinutes: delayMinutes !== undefined ? Number(delayMinutes) : undefined,
      notes: notes || undefined,
      recordedBy: recordedBy || undefined,
    };

    const record = existing
      ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data })
      : await prisma.attendanceRecord.create({ data: { id: `att-${Date.now()}-${employeeId}`, ...data } });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
