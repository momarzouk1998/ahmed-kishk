import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

// الرصيد الحالي المتاح لكل طريقة دفع فى فرع معيّن — كل الإيرادات اللي دخلت بيها
// (فواتير بيع، عرابين تسعير، سندات تحصيل مباشرة) منها كل المصروفات والسلف
// النقدية اللي اتصرفت بيها، من أول ما الفرع بدأ لحد دلوقتي (مش فترة معينة زي
// صفحة التقارير — ده "كام معايا فعليًا فى كل جيب دلوقتي" مش "كام دخل فى فترة").
// مطلوب عشان ميزة الدفع المتعدد فى المصروفات — الأدمن يشوف رصيد كل طريقة قبل
// ما يحدد يخصم منها قد إيه.
function matchesBranch(recordBranch: string | undefined | null, targetBranch: string): boolean {
  if (!recordBranch) return false;
  const a = recordBranch.trim().toLowerCase();
  const b = targetBranch.trim().toLowerCase();
  if (a.includes(b) || b.includes(a)) return true;
  if (a.includes('عمر') && b.includes('عمر')) return true;
  return false;
}

function bucketFor(method: string | undefined | null): 'cash' | 'instapay' | 'vodafone' | 'visa' {
  const m = (method || '').trim();
  if (m.includes('فودافون')) return 'vodafone';
  if (m.includes('إنستا') || m.includes('انستا')) return 'instapay';
  if (m.includes('فيزا') || m.includes('كارت')) return 'visa';
  return 'cash';
}

// شيكات بنكية وآجل/دفعات مش فلوس خرجت من الخزينة فعليًا وقت الفاتورة — عكس
// نقدي/إنستاباي/فودافون/فيزا اللي بتتخصم من الرصيد فورًا.
function isImmediateTreasuryMethod(method: string | undefined | null): boolean {
  const m = (method || '').trim();
  if (!m) return false;
  if (m.includes('شيكات') || m.includes('آجل') || m.includes('دفعات')) return false;
  return true;
}

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    // رصيد الخزينة الكامل بكل طرق الدفع معلومة حساسة — للأدمن فقط.
    if (!scope.isAdmin) {
      return NextResponse.json({ success: false, error: 'رصيد الخزينة متاح للأدمن فقط' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branch = (searchParams.get('branch') || '').trim();
    if (!branch) {
      return NextResponse.json({ success: false, error: 'الفرع مطلوب' }, { status: 400 });
    }

    const [invoices, quotations, collections, expenses, advances, purchases, transfers] = await Promise.all([
      prisma.salesInvoice.findMany({ where: {}, select: { branch: true, paidAmount: true, paymentType: true, notes: true } }),
      prisma.quotationOrder.findMany({ where: {}, select: { id: true, branch: true, depositPaid: true, paymentMethod: true, splitPayments: true } }),
      prisma.customerCollection.findMany({ where: {}, select: { treasury: true, amount: true, method: true, quotationId: true } }),
      prisma.expense.findMany({ where: {}, select: { branch: true, amount: true, paymentMethod: true } }),
      prisma.employeeAdvance.findMany({ where: {}, select: { branch: true, amount: true, treasuryDeducted: true } }),
      prisma.purchaseInvoice.findMany({ where: {}, select: { branch: true, paidAmount: true, paymentMethod: true, splitPayments: true } }),
      prisma.branchTransfer.findMany({ where: { kind: 'تسوية نقدية' }, select: { fromBranch: true, toBranch: true, splitPayments: true } }),
    ]);

    const balance = { cash: 0, instapay: 0, vodafone: 0, visa: 0 };

    invoices.forEach(inv => {
      if (!matchesBranch(inv.branch, branch)) return;
      let split: any = null;
      if (inv.notes && inv.notes.includes('[SPLIT:')) {
        try {
          const match = inv.notes.match(/\[SPLIT:([^\]]+)\]/);
          if (match && match[1]) split = JSON.parse(match[1]);
        } catch {}
      }
      if (split && typeof split === 'object') {
        balance.cash += Number(split.cash || 0);
        balance.instapay += Number(split.instapay || 0);
        balance.vodafone += Number(split.vodafone || 0);
        balance.visa += Number(split.visa || 0);
      } else {
        balance[bucketFor(inv.paymentType)] += Number(inv.paidAmount || 0);
      }
    });

    // أوردرات ليها سند تحصيل مربوط مباشرة (quotationId) — العربون بتاعها معدود
    // بالفعل فى حلقة collections تحت، فبنستبعدها هنا عشان الرصيد ما يتضاعفش.
    const linkedQuotationIds = new Set(collections.filter(c => c.quotationId).map(c => c.quotationId));
    quotations.forEach(q => {
      if (!matchesBranch(q.branch, branch)) return;
      if (linkedQuotationIds.has(q.id)) return;
      const split = q.splitPayments as any;
      if (split && typeof split === 'object') {
        balance.cash += Number(split.cash || 0);
        balance.instapay += Number(split.instapay || 0);
        balance.vodafone += Number(split.vodafone || 0);
        balance.visa += Number(split.visa || 0);
      } else {
        balance[bucketFor(q.paymentMethod)] += Number(q.depositPaid || 0);
      }
    });

    collections.forEach(col => {
      if (!matchesBranch(col.treasury, branch)) return;
      balance[bucketFor(col.method)] += Number(col.amount || 0);
    });

    expenses.forEach(exp => {
      if (!matchesBranch(exp.branch, branch)) return;
      balance[bucketFor(exp.paymentMethod)] -= Number(exp.amount || 0);
    });

    advances.forEach(adv => {
      if (adv.treasuryDeducted === false) return;
      if (!matchesBranch(adv.branch, branch)) return;
      // السلف دايمًا كاش من الدرج — مفيش لها طريقة دفع مسجلة أصلاً.
      balance.cash -= Number(adv.amount || 0);
    });

    purchases.forEach(p => {
      if (!matchesBranch(p.branch, branch)) return;
      const paid = Number(p.paidAmount || 0);
      if (paid <= 0) return;
      const split = p.splitPayments as any;
      if (split && typeof split === 'object') {
        balance.cash -= Number(split.cash || 0);
        balance.instapay -= Number(split.instapay || 0);
        balance.vodafone -= Number(split.vodafone || 0);
        balance.visa -= Number(split.visa || 0);
      } else if (isImmediateTreasuryMethod(p.paymentMethod)) {
        balance[bucketFor(p.paymentMethod)] -= paid;
      }
      // شيكات بنكية/آجل: المبلغ المدفوع فوري مش موجود أصلاً غالبًا، ولو موجود
      // (دفعة مقدمة) بيتسجل بطريقة دفع فعلية مش "شيكات"، فمش هيتفوّت هنا.
    });

    // تسويات نقدية بين الفروع — الفرع الدافع (fromBranch) بتتخصم منه الفلوس
    // فعليًا، والفرع المستلم (toBranch) بتتضاف له، لكل طريقة دفع على حدة.
    transfers.forEach(t => {
      const split = t.splitPayments as any;
      if (!split || typeof split !== 'object') return;
      if (matchesBranch(t.fromBranch, branch)) {
        balance.cash -= Number(split.cash || 0);
        balance.instapay -= Number(split.instapay || 0);
        balance.vodafone -= Number(split.vodafone || 0);
        balance.visa -= Number(split.visa || 0);
      }
      if (matchesBranch(t.toBranch, branch)) {
        balance.cash += Number(split.cash || 0);
        balance.instapay += Number(split.instapay || 0);
        balance.vodafone += Number(split.vodafone || 0);
        balance.visa += Number(split.visa || 0);
      }
    });

    return NextResponse.json({ success: true, branch, balance });
  } catch (error: any) {
    console.error('Failed to compute branch balance:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
