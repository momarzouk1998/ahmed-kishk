import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayDateStr } from '@/lib/dateUtils';
import { getBranchScope } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleClear(request);
}

export async function POST(request: Request) {
  return handleClear(request);
}

async function handleClear(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope || !scope.isAdmin) {
      return NextResponse.json({ success: false, error: 'غير مصرح — خاص بالمدير العام' }, { status: 403 });
    }

    const today = getTodayDateStr();

    let customEmployeeIds: string[] = [];
    let customEmployeeNames: string[] = [];

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (Array.isArray(body?.employeeIds)) {
          customEmployeeIds = body.employeeIds.filter(Boolean);
        }
        if (Array.isArray(body?.employeeNames)) {
          customEmployeeNames = body.employeeNames.filter(Boolean);
        }
      } catch {}
    }

    // أسماء الموظفين الافتراضيين للتصفير إذا لم يُرسل اختيار مخصص
    const defaultTargetNames = [
      'محمود حبيب',
      'محمود',
      'يوسف',
      'سليمان',
      'اشرف',
      'أشرف',
      'كوكو',
      'صبحى',
      'صبحي',
      'سمير',
    ];

    // جلب كل سجلات الحضور السابقة لتاريخ اليوم
    const allPastRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          lt: today,
        },
      },
    });

    // فلترة السجلات التي تخص الموظفين المحددين
    const recordsToDelete = allPastRecords.filter(record => {
      // 1. إذا تم تحديد معرفات الموظفين صراحة
      if (customEmployeeIds.length > 0 && record.employeeId && customEmployeeIds.includes(record.employeeId)) {
        return true;
      }

      // 2. إذا تم تحديد أسماء الموظفين
      const recName = (record.employeeName || '').trim().toLowerCase();
      if (customEmployeeNames.length > 0) {
        return customEmployeeNames.some(cName => {
          const target = cName.trim().toLowerCase();
          return recName === target || recName.includes(target) || target.includes(recName);
        });
      }

      // 3. Fallback للأسماء الافتراضية إذا لم يُحدد شيء
      if (customEmployeeIds.length === 0 && customEmployeeNames.length === 0) {
        return defaultTargetNames.some(keyword => {
          const target = keyword.toLowerCase();
          return recName === target || recName.includes(target) || target.includes(recName);
        });
      }

      return false;
    });

    const idsToDelete = recordsToDelete.map(r => r.id);

    // تنفيذ الحذف لسجلات الحضور السابقة فقط
    let deletedCount = 0;
    if (idsToDelete.length > 0) {
      const res = await prisma.attendanceRecord.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });
      deletedCount = res.count;
    }

    // فحص السجلات المحتفظ بها لليوم الحالي (شفت اليوم إن وجد)
    const allTodayRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: today,
        },
      },
    });

    const keptTodayRecords = allTodayRecords.filter(record => {
      if (customEmployeeIds.length > 0 && record.employeeId && customEmployeeIds.includes(record.employeeId)) {
        return true;
      }
      const recName = (record.employeeName || '').trim().toLowerCase();
      if (customEmployeeNames.length > 0) {
        return customEmployeeNames.some(cName => {
          const target = cName.trim().toLowerCase();
          return recName === target || recName.includes(target) || target.includes(recName);
        });
      }
      if (customEmployeeIds.length === 0 && customEmployeeNames.length === 0) {
        return defaultTargetNames.some(keyword => {
          const target = keyword.toLowerCase();
          return recName === target || recName.includes(target) || target.includes(recName);
        });
      }
      return false;
    });

    return NextResponse.json({
      success: true,
      message: `تم تصفير الحضور السابق للموظفين المحددين بنجاح مع الاحتفاظ بشفت اليوم (${today})`,
      todayDate: today,
      deletedCount,
      keptTodayCount: keptTodayRecords.length,
      targetedCount: recordsToDelete.length,
    });
  } catch (error: any) {
    console.error('Error clearing past attendance:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
