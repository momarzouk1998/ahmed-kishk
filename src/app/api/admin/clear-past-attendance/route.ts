import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayDateStr } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleClear();
}

export async function POST(request: Request) {
  return handleClear();
}

async function handleClear() {
  try {
    const today = getTodayDateStr();

    // أسماء الموظفين المستهدفين للتصفير (مع كل أشكال الهمزات والياء/الألف اللينة)
    const targetNameKeywords = [
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

    // فلترة السجلات التي تخص الموظفين السبعة المستهدفين
    const recordsToDelete = allPastRecords.filter(record => {
      const recName = (record.employeeName || '').trim();
      return targetNameKeywords.some(keyword =>
        recName === keyword ||
        recName.includes(keyword) ||
        keyword.includes(recName)
      );
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
      const recName = (record.employeeName || '').trim();
      return targetNameKeywords.some(keyword =>
        recName === keyword ||
        recName.includes(keyword) ||
        keyword.includes(recName)
      );
    });

    return NextResponse.json({
      success: true,
      message: `تم تصفير حضور الموظفين المستهدفين بنجاح مع الاحتفاظ بشفت اليوم (${today})`,
      todayDate: today,
      targetEmployees: targetNameKeywords,
      deletedCount,
      deletedRecordsSummary: recordsToDelete.map(r => ({
        id: r.id,
        date: r.date,
        employeeName: r.employeeName,
        branch: r.branch,
        status: r.status,
      })),
      keptTodayCount: keptTodayRecords.length,
      keptTodayRecords: keptTodayRecords.map(r => ({
        id: r.id,
        date: r.date,
        employeeName: r.employeeName,
        branch: r.branch,
        status: r.status,
      })),
    });
  } catch (error: any) {
    console.error('Error clearing past attendance:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
