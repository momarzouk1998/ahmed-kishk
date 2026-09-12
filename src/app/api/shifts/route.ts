import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get('branch');

    let shifts: any[] = [];
    try {
      let whereClause: any = branchWhere(scope);
      if (branchParam && branchParam !== 'all' && branchParam !== 'الكل') {
        whereClause = { ...whereClause, branch: branchParam };
      }
      shifts = await (prisma as any).shift.findMany({
        where: whereClause,
        orderBy: { startTime: 'desc' },
      });
    } catch (e) {
      console.error('Error querying Shift model, trying systemStore fallback:', e);
    }

    if (shifts.length === 0) {
      try {
        const rec = await (prisma as any).systemStore.findUnique({
          where: { key: 'ahmed_kishk_shifts_v1' },
        });
        if (rec && Array.isArray(rec.data)) {
          shifts = rec.data;
          if (branchParam && branchParam !== 'all' && branchParam !== 'الكل') {
            shifts = shifts.filter((s: any) => s.branch === branchParam);
          }
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, shifts });
  } catch (error: any) {
    console.error('Failed to get shifts:', error);
    return NextResponse.json({ success: false, shifts: [], error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      branch,
      shiftType,
      employeeId,
      employeeName,
      openingDrawerBalance,
      cashSales,
      instapaySales,
      vodafoneSales,
      visaSales,
      totalSales,
      expensesPaid,
      advancesPaid,
      expectedCashInDrawer,
      actualClosingCash,
      cashDiscrepancy,
      discrepancyReason,
      handoverDestination,
      handoverReceiverName,
      closingNotes,
      status,
      startTime,
      endTime,
    } = body;

    const shiftId = id || ('SHF-' + Date.now().toString().slice(-6));
    const nowIso = new Date().toISOString();

    // Auto-close any previous OPEN shift for this branch
    try {
      await (prisma as any).shift.updateMany({
        where: { branch, status: 'OPEN' },
        data: { status: 'CLOSED', endTime: nowIso },
      });
    } catch (e) {}

    let shiftRecord: any = null;
    try {
      shiftRecord = await (prisma as any).shift.upsert({
        where: { id: shiftId },
        create: {
          id: shiftId,
          branch: branch || 'الفرع الرئيسي',
          shiftType: shiftType || 'صباحي',
          employeeId: String(employeeId || ''),
          employeeName: String(employeeName || ''),
          startTime: startTime || nowIso,
          endTime: endTime || null,
          status: status || 'OPEN',
          openingDrawerBalance: Number(openingDrawerBalance) || 0,
          cashSales: Number(cashSales) || 0,
          instapaySales: Number(instapaySales) || 0,
          vodafoneSales: Number(vodafoneSales) || 0,
          visaSales: Number(visaSales) || 0,
          totalSales: Number(totalSales) || 0,
          expensesPaid: Number(expensesPaid) || 0,
          advancesPaid: Number(advancesPaid) || 0,
          expectedCashInDrawer: Number(expectedCashInDrawer) || Number(openingDrawerBalance) || 0,
          actualClosingCash: actualClosingCash !== undefined ? Number(actualClosingCash) : null,
          cashDiscrepancy: cashDiscrepancy !== undefined ? Number(cashDiscrepancy) : null,
          discrepancyReason: discrepancyReason || null,
          handoverDestination: handoverDestination || null,
          handoverReceiverName: handoverReceiverName || null,
          closingNotes: closingNotes || null,
        },
        update: {
          branch,
          shiftType,
          employeeId: String(employeeId || ''),
          employeeName: String(employeeName || ''),
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          status: status || undefined,
          openingDrawerBalance: Number(openingDrawerBalance) || 0,
          cashSales: Number(cashSales) || 0,
          instapaySales: Number(instapaySales) || 0,
          vodafoneSales: Number(vodafoneSales) || 0,
          visaSales: Number(visaSales) || 0,
          totalSales: Number(totalSales) || 0,
          expensesPaid: Number(expensesPaid) || 0,
          advancesPaid: Number(advancesPaid) || 0,
          expectedCashInDrawer: Number(expectedCashInDrawer) || 0,
          actualClosingCash: actualClosingCash !== undefined ? Number(actualClosingCash) : null,
          cashDiscrepancy: cashDiscrepancy !== undefined ? Number(cashDiscrepancy) : null,
          discrepancyReason: discrepancyReason || null,
          handoverDestination: handoverDestination || null,
          handoverReceiverName: handoverReceiverName || null,
          closingNotes: closingNotes || null,
        },
      });
    } catch (e) {
      console.error('Error saving shift in DB, using fallback object:', e);
      shiftRecord = { ...body, id: shiftId, startTime: startTime || nowIso };
    }

    // Sync all shifts to SystemStore as fallback
    try {
      const all = await (prisma as any).shift.findMany({ orderBy: { startTime: 'desc' } });
      await (prisma as any).systemStore.upsert({
        where: { key: 'ahmed_kishk_shifts_v1' },
        create: { key: 'ahmed_kishk_shifts_v1', data: all },
        update: { data: all },
      });
    } catch (e) {}

    return NextResponse.json({ success: true, shift: shiftRecord });
  } catch (error: any) {
    console.error('Failed to create/update shift:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { shiftId, actualClosingCash, discrepancyReason, handoverDestination, handoverReceiverName, closingNotes, openingDrawerBalance } = body;

    if (!shiftId) {
      return NextResponse.json({ success: false, error: 'معرف الوردية مطلوب' }, { status: 400 });
    }

    let existing: any = null;
    try {
      existing = await (prisma as any).shift.findUnique({ where: { id: shiftId } });
    } catch (e) {}

    const nowIso = new Date().toISOString();
    const opening = openingDrawerBalance !== undefined ? Number(openingDrawerBalance) : (Number(existing?.openingDrawerBalance) || 0);
    const cashSales = Number(existing?.cashSales) || 0;
    const expenses = (Number(existing?.expensesPaid) || 0) + (Number(existing?.advancesPaid) || 0);
    const expected = opening + cashSales - expenses;
    const actual = actualClosingCash !== undefined ? Number(actualClosingCash) : (existing?.actualClosingCash ?? expected);
    const discrepancy = actual - expected;

    let updated: any = null;
    try {
      updated = await (prisma as any).shift.update({
        where: { id: shiftId },
        data: {
          status: 'CLOSED',
          endTime: existing?.endTime || nowIso,
          openingDrawerBalance: opening,
          actualClosingCash: actual,
          expectedCashInDrawer: expected,
          cashDiscrepancy: discrepancy,
          discrepancyReason: discrepancyReason !== undefined ? discrepancyReason : existing?.discrepancyReason,
          handoverDestination: handoverDestination !== undefined ? handoverDestination : existing?.handoverDestination,
          handoverReceiverName: handoverReceiverName !== undefined ? handoverReceiverName : existing?.handoverReceiverName,
          closingNotes: closingNotes !== undefined ? closingNotes : existing?.closingNotes,
        },
      });
    } catch (e) {
      console.error('Error closing shift in DB:', e);
    }

    // Sync all to SystemStore
    try {
      const all = await (prisma as any).shift.findMany({ orderBy: { startTime: 'desc' } });
      await (prisma as any).systemStore.upsert({
        where: { key: 'ahmed_kishk_shifts_v1' },
        create: { key: 'ahmed_kishk_shifts_v1', data: all },
        update: { data: all },
      });
    } catch (e) {}

    return NextResponse.json({ success: true, shift: updated });
  } catch (error: any) {
    console.error('Failed to close shift:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الوردية مطلوب' }, { status: 400 });
    }

    try {
      await (prisma as any).shift.delete({ where: { id } });
    } catch (e) {
      console.error('Error deleting shift from DB:', e);
    }

    // Sync all to SystemStore
    try {
      const all = await (prisma as any).shift.findMany({ orderBy: { startTime: 'desc' } });
      await (prisma as any).systemStore.upsert({
        where: { key: 'ahmed_kishk_shifts_v1' },
        create: { key: 'ahmed_kishk_shifts_v1', data: all },
        update: { data: all },
      });
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
