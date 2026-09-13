import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { assertPagePermission } from '@/lib/permissionsServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, shifts: [], error: 'غير مصرح' }, { status: 401 });
    }
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

    // Auto-enrich shifts with real-time sales made during the shift timeframe
    try {
      const [allInvoices, allQuotations] = await Promise.all([
        (prisma as any).salesInvoice.findMany().catch(() => []),
        (prisma as any).quotationOrder.findMany().catch(() => []),
      ]);

      shifts = shifts.map((s: any) => {
        const shiftStart = new Date(s.startTime).getTime();
        const shiftEnd = s.endTime ? new Date(s.endTime).getTime() : Date.now();

        const matchBranch = (bStr?: string) => {
          if (!bStr) return false;
          const sB = String(s.branch || '').trim().toLowerCase();
          const iB = String(bStr || '').trim().toLowerCase();
          return iB.includes(sB) || sB.includes(iB) || (sB.includes('عمر') && iB.includes('عمر'));
        };

        let calculatedCash = 0;
        let calculatedInstapay = 0;
        let calculatedVodafone = 0;
        let calculatedVisa = 0;
        let calculatedTotal = 0;

        allInvoices.forEach((inv: any) => {
          if (!matchBranch(inv.branch)) return;
          const invTime = inv.createdAt ? new Date(inv.createdAt).getTime() : (inv.date ? new Date(inv.date).getTime() : 0);
          if (invTime >= shiftStart - 60000 && invTime <= shiftEnd + 60000) {
            let split = inv.splitPayments;
            if (!split && inv.notes && inv.notes.includes('[SPLIT:')) {
              try {
                const match = inv.notes.match(/\[SPLIT:([^\]]+)\]/);
                if (match && match[1]) split = JSON.parse(match[1]);
              } catch {}
            }
            if (split) {
              calculatedCash += Number(split.cash || 0);
              calculatedInstapay += Number(split.instapay || 0);
              calculatedVodafone += Number(split.vodafone || 0);
              calculatedVisa += Number(split.visa || 0);
              calculatedTotal += Number(inv.totalAmount || inv.paidAmount || 0);
            } else {
              const m = (inv.paymentType || inv.paymentMethod || '').trim();
              const paid = Number(inv.paidAmount || 0);
              if (m.includes('فودافون')) calculatedVodafone += paid;
              else if (m.includes('إنستا') || m.includes('انستا')) calculatedInstapay += paid;
              else if (m.includes('فيزا') || m.includes('كارت')) calculatedVisa += paid;
              else calculatedCash += paid;
              calculatedTotal += Number(inv.totalAmount || paid);
            }
          }
        });

        allQuotations.forEach((q: any) => {
          if (!matchBranch(q.branch)) return;
          const qTime = q.createdAt ? new Date(q.createdAt).getTime() : (q.date ? new Date(q.date).getTime() : 0);
          if (qTime >= shiftStart - 60000 && qTime <= shiftEnd + 60000) {
            const deposit = Number(q.depositPaid || 0);
            let split = q.splitPayments;
            if (split) {
              calculatedCash += Number(split.cash || 0);
              calculatedInstapay += Number(split.instapay || 0);
              calculatedVodafone += Number(split.vodafone || 0);
              calculatedVisa += Number(split.visa || 0);
            } else {
              const m = (q.paymentMethod || '').trim();
              if (m.includes('فودافون')) calculatedVodafone += deposit;
              else if (m.includes('إنستا') || m.includes('انستا')) calculatedInstapay += deposit;
              else if (m.includes('فيزا') || m.includes('كارت')) calculatedVisa += deposit;
              else calculatedCash += deposit;
            }
            calculatedTotal += Number(q.totalAmount || deposit);
          }
        });

        const effectiveCash = (s.cashSales && s.cashSales > 0) ? s.cashSales : calculatedCash;
        const effectiveTotal = (s.totalSales && s.totalSales > 0) ? s.totalSales : (calculatedTotal > 0 ? calculatedTotal : effectiveCash);
        const effectiveInstapay = (s.instapaySales && s.instapaySales > 0) ? s.instapaySales : calculatedInstapay;
        const effectiveVodafone = (s.vodafoneSales && s.vodafoneSales > 0) ? s.vodafoneSales : calculatedVodafone;
        const effectiveVisa = (s.visaSales && s.visaSales > 0) ? s.visaSales : calculatedVisa;

        const expected = Number(s.openingDrawerBalance || 0) + effectiveCash - (Number(s.expensesPaid || 0) + Number(s.advancesPaid || 0));
        const actualCash = s.actualClosingCash !== null && s.actualClosingCash !== undefined ? s.actualClosingCash : (s.status === 'CLOSED' ? expected : null);
        const discrepancy = actualCash !== null ? (actualCash - expected) : null;

        return {
          ...s,
          cashSales: effectiveCash,
          totalSales: effectiveTotal,
          instapaySales: effectiveInstapay,
          vodafoneSales: effectiveVodafone,
          visaSales: effectiveVisa,
          expectedCashInDrawer: expected,
          actualClosingCash: actualCash,
          cashDiscrepancy: discrepancy,
        };
      });
    } catch (e) {
      console.error('Error enriching shifts:', e);
    }

    return NextResponse.json({ success: true, shifts });
  } catch (error: any) {
    console.error('Failed to get shifts:', error);
    return NextResponse.json({ success: false, shifts: [], error: 'حدث خطأ فى الخادم' }, { status: 500 });
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
      id,
      branch: requestedBranch,
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

    // موظف مقيّد لازم يفتح شيفت لفرعه هو بس، بغض النظر عمّا أُرسل من العميل
    const branch = effectiveCreateBranch(scope, requestedBranch);

    const shiftId = id || ('SHF-' + Date.now().toString().slice(-6));
    const nowIso = new Date().toISOString();

    // لو ده تعديل لشيفت موجود بالفعل، امنع موظف مقيّد من تعديل شيفت فرع تاني
    if (id) {
      try {
        const existingForOwnershipCheck = await (prisma as any).shift.findUnique({ where: { id } });
        if (existingForOwnershipCheck && !scope.isAdmin && existingForOwnershipCheck.branch !== scope.branch) {
          return NextResponse.json({ success: false, error: 'غير مصرح بتعديل شيفت فرع آخر' }, { status: 403 });
        }
      } catch {}
    }

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
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { shiftId, actualClosingCash, discrepancyReason, handoverDestination, handoverReceiverName, closingNotes, openingDrawerBalance } = body;

    if (!shiftId) {
      return NextResponse.json({ success: false, error: 'معرف الوردية مطلوب' }, { status: 400 });
    }

    let existing: any = null;
    try {
      existing = await (prisma as any).shift.findUnique({ where: { id: shiftId } });
    } catch (e) {}

    if (existing && !scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل شيفت فرع آخر' }, { status: 403 });
    }

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
      return NextResponse.json({ success: false, error: 'معرف الوردية مطلوب' }, { status: 400 });
    }

    const existing = await (prisma as any).shift.findUnique({ where: { id } }).catch(() => null);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'الوردية غير موجودة' }, { status: 404 });
    }
    if (!scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بحذف شيفت فرع آخر' }, { status: 403 });
    }
    const perm = await assertPagePermission(request, 'p_shifts', 'delete');
    if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
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
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
