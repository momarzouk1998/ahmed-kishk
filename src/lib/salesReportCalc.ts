// ⚠️ حساب تقرير المبيعات (الملخص + خزائن الفروع) — منقول حرفيًا من reports/page.tsx
// عشان نفس الكود بالظبط يشتغل على الموبايل وعلى السيرفر (/api/reports/sales-kpis)،
// فمستحيل الرقمين يختلفوا. أي تعديل فى منطق التقرير يتعمل هنا بس.
// الفرق الوحيد عن الأصل: "الساعة" و"الوقت الحالي" بيتبعتوا من بره (hoursOf/nowMs)
// عشان السيرفر يحسب بتوقيت القاهرة زي موبايل الموظف بالظبط، و"النهارده/امبارح"
// بيتحسبوا مرة واحدة بدل مع كل فاتورة (نفس القيمة، أسرع بكتير).
import { getTodayDateStr, getYesterdayDateStr } from '@/lib/dateUtils';
import { normalizeBranchName } from '@/lib/branches';

export type SalesReportPeriod = 'yesterday' | 'today' | 'thisWeek' | 'thisMonth' | 'custom' | 'all';

export interface SalesKpisInput {
  invoices: any[];
  quotations: any[];
  collections: any[];
  customers: any[];
  shifts: any[];
  expenses: any[];
  advances: any[];
  purchases: any[];
  branchTransfers: any[];
  period: SalesReportPeriod;
  customStartDate: string;
  customEndDate: string;
  selectedBranch: string;
  /** ساعة اليوم (0-23) لوقت معيّن بتوقيت المستخدم — الافتراضي توقيت الجهاز. */
  hoursOf?: (ms: number) => number;
  nowMs?: number;
}

let cairoHourFormatter: Intl.DateTimeFormat | null = null;
export function cairoHoursOf(ms: number): number {
  if (!cairoHourFormatter) {
    cairoHourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hourCycle: 'h23' });
  }
  return Number(cairoHourFormatter.format(new Date(ms))) % 24;
}

export function computeSalesKpis(input: SalesKpisInput) {
  const { invoices, quotations, collections, customers, shifts, expenses, advances, purchases, branchTransfers, period, customStartDate, customEndDate, selectedBranch } = input;
  const hoursOf = input.hoursOf || ((ms: number) => new Date(ms).getHours());
  const nowMs = input.nowMs ?? Date.now();
  const today = getTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();

  const inPeriod = (dateStr: string | undefined): boolean => {
    if (!dateStr) return period === 'all';
    const d = getTodayDateStr(dateStr) || String(dateStr).split('T')[0];
    if (period === 'yesterday') return d === yesterdayStr;
    if (period === 'today') return d === today;
    if (period === 'thisWeek') {
      const todayDate = new Date(today);
      const itemDate = new Date(d);
      const diffDays = (todayDate.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (period === 'thisMonth') return d.substring(0, 7) === today.substring(0, 7);
    if (period === 'custom') {
      if (customStartDate && d < customStartDate) return false;
      if (customEndDate && d > customEndDate) return false;
      return true;
    }
    return true;
  };
  const inBranch = (b: string | undefined): boolean => {
    if (!selectedBranch || selectedBranch === 'ALL' || selectedBranch === 'الكل') return true;
    return normalizeBranchName(b) === normalizeBranchName(selectedBranch);
  };

  const invoiceDate = (i: any): string | undefined => i?.date;
  const collectionDate = (c: any): string | undefined => c?.date;
  const quotationDate = (q: any): string | undefined => q?.date || q?.depositDate || q?.createdAt;
  const inspectionDate = (i: any): string | undefined => i?.createdAt || i?.scheduledAt;
  const purchaseDate = (p: any): string | undefined => p?.date;
  const transferDate = (t: any): string | undefined => t?.date || t?.createdAt;
  const shiftDate = (s: any): string | undefined => s?.startTime || s?.createdAt || s?.endTime;
  // عملية بتاريخ قديم (date أقدم من يوم التسجيل) تتحسب فى وردية يوم تاريخها (الساعة 12 ظهرًا) مش وقت التسجيل.
const recTimeMs = (r: any): number => {
  const day = r?.date ? getTodayDateStr(String(r.date)) : '';
  const created = r?.createdAt ? getTodayDateStr(new Date(r.createdAt)) : '';
  if (day && created && day < created) return new Date(`${day}T09:00:00Z`).getTime();
  return r?.createdAt ? new Date(r.createdAt).getTime() : (r?.date ? new Date(r.date).getTime() : 0);
};
const expenseDate = (e: any): string | undefined => e?.date || e?.createdAt;
  const advanceDate = (a: any): string | undefined => a?.date || a?.createdAt;
  // شيكات بنكية وآجل/دفعات مش فلوس خرجت من الخزينة فعليًا وقت فاتورة الشراء.
  const isImmediateTreasuryMethod = (m: any): boolean => {
    const s = String(m || '').trim();
    if (!s) return false;
    return !s.includes('شيكات') && !s.includes('آجل') && !s.includes('دفعات');
  };
  const bucketForMethod = (m: any): 'cash' | 'instapay' | 'vodafone' | 'visa' => {
    const s = String(m || '').trim();
    if (s.includes('فودافون')) return 'vodafone';
    if (s.includes('إنستا') || s.includes('انستا')) return 'instapay';
    if (s.includes('فيزا') || s.includes('كارت')) return 'visa';
    return 'cash';
  };

  const fInvoices = invoices.filter(i => inBranch(i.branch) && inPeriod(invoiceDate(i)));
  const fQuotations = quotations.filter(q => inBranch(q.branch) && inPeriod(quotationDate(q)));
  const fCollections = collections.filter(c => {
      const matchPeriod = inPeriod(collectionDate(c));
      if (!matchPeriod) return false;
      if (selectedBranch === 'ALL' || selectedBranch === 'الكل') return true;
      const treasury = c.treasury || '';
      if (normalizeBranchName(treasury) === normalizeBranchName(selectedBranch)) return true;
      if (treasury.includes(selectedBranch)) return true;
      if (selectedBranch.includes('عمر') && (treasury.includes('عمر أفندي') || treasury.includes('عمر افندي') || treasury.includes('عمر'))) return true;
      if (selectedBranch.includes('عرابي') && treasury.includes('عرابي')) return true;
      if (selectedBranch.includes('الثلاثيني') && treasury.includes('الثلاثيني')) return true;
      if (selectedBranch.includes('الرئيسي') && (treasury.includes('الرئيسية') || treasury.includes('سعد زغلول'))) return true;
      const cust = customers.find(cust => cust.phone === c.phone || cust.name === c.customerName);
      if (cust && cust.branch && inBranch(cust.branch)) return true;
      return false;
    });

  let cash = 0, instapay = 0, vodafone = 0, visa = 0, deferred = 0, other = 0;
    let fabricSalesGrand = 0, fabricSalesRemaining = 0, fabricSalesPaid = 0;
    let curtainSalesGrand = 0, curtainSalesRemaining = 0, curtainSalesDeposits = 0;

    const normPhone = (p: string | null | undefined) => (p || '').replace(/\D/g, '').slice(-10);
    const normName = (n: string | null | undefined) => (n || '').trim().toLowerCase();

    // 1. Fabric Sales Invoices
    fInvoices.forEach(inv => {
      fabricSalesGrand += Number(inv.totalAmount || 0);
      fabricSalesRemaining += Number(inv.remainingAmount || 0);
      const paid = Number(inv.paidAmount || 0);
      fabricSalesPaid += paid;

      let split = inv.splitPayments;
      if (!split && inv.notes && inv.notes.includes('[SPLIT:')) {
        try {
          const match = inv.notes.match(/\[SPLIT:([^\]]+)\]/);
          if (match && match[1]) split = JSON.parse(match[1]);
        } catch {}
      }

      if (split) {
        cash += Number(split.cash || 0);
        instapay += Number(split.instapay || 0);
        vodafone += Number(split.vodafone || 0);
        visa += Number(split.visa || 0);
        return;
      }

      const m = ((inv.paymentMethod || (inv as any).paymentType || '') as string).trim();
      if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) vodafone += paid;
      else if (m.includes('إنستا') || m.includes('انستا') || m.toLowerCase().includes('insta')) instapay += paid;
      else if (m.includes('فيزا') || m.includes('كارت') || m.toLowerCase().includes('visa') || m.toLowerCase().includes('card')) visa += paid;
      else if (m.includes('آجل') || m.includes('دفعات') || m === 'بالآجل / دفعات') deferred += paid;
      else if (m === 'نقدي' || m === 'كاش' || m === 'نقدي (كاش)' || m.includes('نقدي') || m.includes('كاش') || !m) cash += paid;
      else other += paid;
    });

    // 2. Direct Customer Collections (Real payment receipts)
    let totalDirectCollections = 0;
    const collectionsPoolByCust = new Map<string, number>();

    fCollections.forEach(col => {
      const amt = Number(col.amount || 0);
      totalDirectCollections += amt;
      const m = (col.method || '').trim();
      if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) vodafone += amt;
      else if (m.includes('إنستا') || m.includes('انستا') || m.toLowerCase().includes('insta')) instapay += amt;
      else if (m.includes('فيزا') || m.toLowerCase().includes('visa') || m.includes('كارت')) visa += amt;
      else if (m === 'نقدي' || m === 'كاش' || m === 'نقدي (كاش)' || m.includes('نقدي') || m.includes('كاش') || !m) cash += amt;
      else other += amt;

      const key = normPhone(col.phone) || normName(col.customerName);
      if (key) {
        collectionsPoolByCust.set(key, (collectionsPoolByCust.get(key) || 0) + amt);
      }
    });

    // 3. Curtain Contracts (Quotations & Pipeline Deposits)
    fQuotations.forEach(q => {
      curtainSalesGrand += Number(q.totalAmount || 0);
      curtainSalesRemaining += Number(q.remainingAmount || 0);
      const deposit = Number(q.depositPaid || 0);
      curtainSalesDeposits += deposit;

      // Deduplicate: If deposit is already covered in collections receipt, don't double count
      const key = normPhone(q.phone) || normName(q.customerName);
      const pool = key ? (collectionsPoolByCust.get(key) || 0) : 0;
      const unrecordedDeposit = Math.max(0, deposit - pool);

      if (key && pool > 0) {
        collectionsPoolByCust.set(key, Math.max(0, pool - deposit));
      }

      if (unrecordedDeposit > 0) {
        let split = q.splitPayments || q.depositSplit;
        if (!split && q.notes && q.notes.includes('[DEPOSIT_SPLIT:')) {
          try {
            const match = q.notes.match(/\[DEPOSIT_SPLIT:([^\]]+)\]/);
            if (match && match[1]) split = JSON.parse(match[1]);
          } catch {}
        }

        if (split) {
          cash += Number(split.cash || 0);
          instapay += Number(split.instapay || 0);
          vodafone += Number(split.vodafone || 0);
          visa += Number(split.visa || 0);
        } else {
          const m = (q.paymentMethod || q.depositMethod || (q as any).paymentType || '').trim();
          if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) vodafone += unrecordedDeposit;
          else if (m.includes('إنستا') || m.includes('انستا') || m.toLowerCase().includes('insta')) instapay += unrecordedDeposit;
          else if (m.includes('فيزا') || m.includes('كارت') || m.toLowerCase().includes('visa') || m.toLowerCase().includes('card')) visa += unrecordedDeposit;
          else if (m === 'نقدي' || m === 'كاش' || m === 'نقدي (كاش)' || m.includes('نقدي') || m.includes('كاش') || !m) cash += unrecordedDeposit;
          else other += unrecordedDeposit;
        }
      }
    });

    const grand = fabricSalesGrand + curtainSalesGrand;
    const remaining = fabricSalesRemaining + curtainSalesRemaining;
    const totalCollected = cash + instapay + vodafone + visa + other;

    // ─── 4 Branch Treasury Balances ───
    // ─── Branch Treasury Balances (Omar Effendi separated into 2 distinct cards: Morning ☀️ & Evening 🌙) ───
    const branchesData = [
      { name: 'الفرع الرئيسي (73 سعد زغلول)', treasury: 'خزينة الفرع الرئيسي (سعد زغلول)', key: 'الرئيسي', color: 'border-amber-300 bg-amber-50/60', text: 'text-amber-900', isShift: false, shiftType: null },
      { name: 'فرع عرابي (18 ش عدلي)', treasury: 'خزينة فرع عرابي', key: 'عرابي', color: 'border-sky-300 bg-sky-50/60', text: 'text-sky-900', isShift: false, shiftType: null },
      { name: 'فرع عمر أفندي (وردية الصباح ☀️)', treasury: 'خزينة عمر أفندي — صباحي (رصيد الصبح)', key: 'عمر أفندي', color: 'border-amber-400 bg-amber-50/80', text: 'text-amber-950', isShift: true, shiftType: 'صباحي' },
      { name: 'فرع عمر أفندي (وردية المساء 🌙)', treasury: 'خزينة عمر أفندي — مسائي (رصيد بالليل)', key: 'عمر أفندي', color: 'border-indigo-400 bg-indigo-50/80', text: 'text-indigo-950', isShift: true, shiftType: 'مسائي' },
      { name: 'فرع الثلاثيني', treasury: 'خزينة فرع الثلاثيني', key: 'الثلاثيني', color: 'border-purple-300 bg-purple-50/60', text: 'text-purple-900', isShift: false, shiftType: null },
      { name: 'الفرع التجاري (ش التجاري)', treasury: 'خزينة الفرع التجاري', key: 'التجاري', color: 'border-emerald-300 bg-emerald-50/60', text: 'text-emerald-900', isShift: false, shiftType: null },
    ];

    const branchTreasuries = branchesData.map(b => {
      let bCash = 0, bInstapay = 0, bVodafone = 0, bVisa = 0;
      let bCount = 0;

      const matchB = (val: string) => {
        const s = String(val || '').trim();
        if (b.key === 'الرئيسي') return s.includes('رئيسي') || s.includes('سعد زغلول') || s.includes('القاهرة');
        if (b.key === 'عرابي') return s.includes('عرابي') || s.includes('عدلي');
        if (b.key === 'عمر أفندي') return s.includes('عمر أفندي') || s.includes('عمر افندي') || s.includes('عمر');
        if (b.key === 'الثلاثيني') return s.includes('الثلاثيني');
        if (b.key === 'التجاري') return s.includes('تجاري') || s.includes('تجارى') || s.includes('أونلاين') || s.includes('اونلاين');
        return false;
      };

      if (b.isShift && b.key === 'عمر أفندي') {
        const omarShifts = shifts.filter(s => {
          const isOmar = s.branch && (s.branch.includes('عمر أفندي') || s.branch.includes('عمر افندي') || s.branch.includes('عمر'));
          if (!isOmar) return false;
          return inPeriod(shiftDate(s)) && s.shiftType === b.shiftType;
        });

        // Determine timeframe boundaries for this specific shift
        const targetShift = omarShifts[0];
        const shiftStartMs = targetShift?.startTime ? new Date(targetShift.startTime).getTime() : 0;
        const shiftEndMs = targetShift?.endTime ? new Date(targetShift.endTime).getTime() : nowMs;

        let bCash = 0, bInstapay = 0, bVodafone = 0, bVisa = 0, bCount = 0;

        // 1. Invoices for Omar Effendi strictly inside this shift's timeframe
        invoices.filter(i => matchB(i.branch) && inPeriod(invoiceDate(i))).forEach(inv => {
          const invTime = recTimeMs(inv);
          
          let belongs = false;
          if (targetShift) {
            if (b.shiftType === 'مسائي') {
              belongs = invTime >= shiftStartMs - 60000;
            } else {
              belongs = targetShift.endTime ? (invTime <= shiftEndMs + 60000) : (invTime < shiftStartMs);
            }
          } else {
            const h = invTime ? hoursOf(invTime) : 12;
            belongs = b.shiftType === 'صباحي' ? h < 17 : h >= 17;
          }

          if (belongs) {
            bCount++;
            let split = inv.splitPayments;
            if (!split && inv.notes && inv.notes.includes('[SPLIT:')) {
              try {
                const match = inv.notes.match(/\[SPLIT:([^\]]+)\]/);
                if (match && match[1]) split = JSON.parse(match[1]);
              } catch {}
            }
            if (split) {
              bCash += Number(split.cash || 0);
              bInstapay += Number(split.instapay || 0);
              bVodafone += Number(split.vodafone || 0);
              bVisa += Number(split.visa || 0);
            } else {
              const m = ((inv.paymentMethod || (inv as any).paymentType || '') as string).trim();
              const paid = Number(inv.paidAmount || 0);
              if (m.includes('فودافون')) bVodafone += paid;
              else if (m.includes('إنستا') || m.includes('انستا')) bInstapay += paid;
              else if (m.includes('فيزا') || m.includes('كارت')) bVisa += paid;
              else bCash += paid;
            }
          }
        });

        // 2. Direct collections in this shift
        collections.filter(c => matchB(c.treasury || '') && inPeriod(collectionDate(c))).forEach(col => {
          const colTime = recTimeMs(col);
          let belongs = false;
          if (targetShift) {
            belongs = b.shiftType === 'مسائي' ? (colTime >= shiftStartMs - 60000) : (targetShift.endTime ? colTime <= shiftEndMs + 60000 : true);
          } else {
            const h = colTime ? hoursOf(colTime) : 12;
            belongs = b.shiftType === 'صباحي' ? h < 17 : h >= 17;
          }
          if (belongs) {
            bCount++;
            const amt = Number(col.amount || 0);
            const m = (col.method || '').trim();
            if (m.includes('فودافون')) bVodafone += amt;
            else if (m.includes('إنستا') || m.includes('انستا')) bInstapay += amt;
            else if (m.includes('فيزا') || m.includes('كارت')) bVisa += amt;
            else bCash += amt;
          }
        });

        // 3. Quotation deposits in this shift
        // ⚠️ #FIX: كل عربون بيتسجل من مودال "تسجيل دفعة" فى شاشة التسعير بقى سند
        // تحصيل حقيقي مربوط بالأوردر (quotationId) — وده معدود بالفعل فى القسم 2
        // فوق (Direct collections). لو عديناه تاني هنا كمان، الفلوس هتتضاعف فى
        // تقرير الوردية. فبنستبعد أي أوردر ليه سند تحصيل مربوط بيه مباشرة —
        // ويفضل السلوك القديم شغال بس للعرابين القديمة اللي مالهاش سند مربوط.
        const linkedQuotationIds = new Set(collections.filter((c: any) => c.quotationId).map((c: any) => c.quotationId));
        quotations.filter(q => matchB(q.branch) && inPeriod(quotationDate(q)) && !linkedQuotationIds.has(q.id)).forEach(q => {
          const qTime = recTimeMs(q);
          let belongs = false;
          if (targetShift) {
            belongs = b.shiftType === 'مسائي' ? (qTime >= shiftStartMs - 60000) : (targetShift.endTime ? qTime <= shiftEndMs + 60000 : true);
          } else {
            const h = qTime ? hoursOf(qTime) : 12;
            belongs = b.shiftType === 'صباحي' ? h < 17 : h >= 17;
          }
          if (belongs) {
            const deposit = Number(q.depositPaid || 0);
            if (deposit > 0) {
              bCount++;
              let split = q.splitPayments;
              if (split) {
                bCash += Number(split.cash || 0);
                bInstapay += Number(split.instapay || 0);
                bVodafone += Number(split.vodafone || 0);
                bVisa += Number(split.visa || 0);
              } else {
                const m = (q.paymentMethod || '').trim();
                if (m.includes('فودافون')) bVodafone += deposit;
                else if (m.includes('إنستا') || m.includes('انستا')) bInstapay += deposit;
                else if (m.includes('فيزا') || m.includes('كارت')) bVisa += deposit;
                else bCash += deposit;
              }
            }
          }
        });

        // 4. مصروفات فرع عمر أفندي فى نفس الوردية — بتتخصم حسب طريقة دفعها زي باقي الفروع
        let bExpensesTotal = 0;
        expenses.filter((e: any) => matchB(e.branch) && inPeriod(expenseDate(e))).forEach((exp: any) => {
          const expTime = recTimeMs(exp);
          let belongs = false;
          if (targetShift) {
            belongs = b.shiftType === 'مسائي' ? (expTime >= shiftStartMs - 60000) : (targetShift.endTime ? expTime <= shiftEndMs + 60000 : true);
          } else {
            const h = expTime ? hoursOf(expTime) : 12;
            belongs = b.shiftType === 'صباحي' ? h < 17 : h >= 17;
          }
          if (belongs) {
            const amt = Number(exp.amount) || 0;
            bExpensesTotal += amt;
            const m = (exp.paymentMethod || '').trim();
            if (m.includes('فودافون')) bVodafone -= amt;
            else if (m.includes('إنستا') || m.includes('انستا')) bInstapay -= amt;
            else if (m.includes('فيزا') || m.includes('كارت')) bVisa -= amt;
            else bCash -= amt;
          }
        });

        // 5. سلف/مكافآت الموظفين النقدية فى نفس الوردية — بتتخصم كاش من الدرج
        let bAdvancesTotal = 0;
        advances.filter((a: any) => matchB(a.branch) && a.treasuryDeducted !== false && inPeriod(advanceDate(a))).forEach((adv: any) => {
          const advTime = recTimeMs(adv);
          let belongs = false;
          if (targetShift) {
            belongs = b.shiftType === 'مسائي' ? (advTime >= shiftStartMs - 60000) : (targetShift.endTime ? advTime <= shiftEndMs + 60000 : true);
          } else {
            const h = advTime ? hoursOf(advTime) : 12;
            belongs = b.shiftType === 'صباحي' ? h < 17 : h >= 17;
          }
          if (belongs) {
            const amt = Number(adv.amount) || 0;
            bAdvancesTotal += amt;
            bCash -= amt;
          }
        });

        // 6. فواتير الشراء المدفوعة فورًا (نقدي/إنستاباي/فودافون/فيزا) فى نفس
        // الوردية — بتتخصم من الدرج زي أي مصروف تمامًا. الشيكات والآجل مستبعدة
        // لأنها مش فلوس خرجت فعليًا وقت الفاتورة.
        let bPurchasesTotal = 0;
        purchases.filter((p: any) => matchB(p.branch) && inPeriod(purchaseDate(p))).forEach((p: any) => {
          const paid = Number(p.paidAmount) || 0;
          if (paid <= 0) return;
          if (p.fundSource === 'treasury') return; // الخصم من الخزنة مباشرة مش من درج الوردية
          const pTime = recTimeMs(p);
          let belongs = false;
          if (targetShift) {
            belongs = b.shiftType === 'مسائي' ? (pTime >= shiftStartMs - 60000) : (targetShift.endTime ? pTime <= shiftEndMs + 60000 : true);
          } else {
            const h = pTime ? hoursOf(pTime) : 12;
            belongs = b.shiftType === 'صباحي' ? h < 17 : h >= 17;
          }
          if (!belongs) return;
          const split = p.splitPayments;
          if (split && typeof split === 'object') {
            bCash -= Number(split.cash || 0);
            bInstapay -= Number(split.instapay || 0);
            bVodafone -= Number(split.vodafone || 0);
            bVisa -= Number(split.visa || 0);
            bPurchasesTotal += paid;
          } else if (isImmediateTreasuryMethod(p.paymentMethod)) {
            const bucket = bucketForMethod(p.paymentMethod);
            if (bucket === 'cash') bCash -= paid;
            else if (bucket === 'instapay') bInstapay -= paid;
            else if (bucket === 'vodafone') bVodafone -= paid;
            else bVisa -= paid;
            bPurchasesTotal += paid;
          }
        });

        // 7. تسويات نقدية بين الفروع فى نفس الوردية — بتتخصم من الفرع الدافع
        // وتتضاف للفرع المستلم فعليًا، لكل طريقة دفع على حدة.
        branchTransfers.filter((t: any) => t.kind === 'تسوية نقدية' && (matchB(t.fromBranch) || matchB(t.toBranch))).forEach((t: any) => {
          const split = t.splitPayments;
          if (!split || typeof split !== 'object') return;
          const tTime = recTimeMs(t);
          let belongs = false;
          if (targetShift) {
            belongs = b.shiftType === 'مسائي' ? (tTime >= shiftStartMs - 60000) : (targetShift.endTime ? tTime <= shiftEndMs + 60000 : true);
          } else {
            const h = tTime ? hoursOf(tTime) : 12;
            belongs = b.shiftType === 'صباحي' ? h < 17 : h >= 17;
          }
          if (!belongs) return;
          const sign = matchB(t.fromBranch) ? -1 : 1;
          bCash += sign * (Number(split.cash) || 0);
          bInstapay += sign * (Number(split.instapay) || 0);
          bVodafone += sign * (Number(split.vodafone) || 0);
          bVisa += sign * (Number(split.visa) || 0);
        });

        const shiftRecordCash = omarShifts.reduce((acc, s) => acc + Number(s.actualClosingCash ?? s.expectedCashInDrawer ?? s.cashSales ?? 0), 0);
        const finalCash = bCash > 0 ? bCash : shiftRecordCash;
        const total = finalCash + bInstapay + bVodafone + bVisa;
        const employeeName = Array.from(new Set(omarShifts.map(s => s.employeeName).filter(Boolean))).join(', ') || (b.shiftType === 'صباحي' ? 'محمد كشك' : 'بليا');
        const activeShift = omarShifts.find(s => s.status === 'OPEN');
        const shiftStatus = activeShift ? 'قيد التشغيل 🟢' : (omarShifts.length > 0 ? 'مغلقة 🔒' : 'جاهزة لبدء العمل');

        return {
          ...b,
          cash: finalCash,
          instapay: bInstapay,
          vodafone: bVodafone,
          visa: bVisa,
          total,
          expensesTotal: bExpensesTotal,
          advancesTotal: bAdvancesTotal,
          purchasesTotal: bPurchasesTotal,
          count: bCount || omarShifts.length,
          employeeName,
          shiftSales: total,
          shiftStatus,
          hasShifts: omarShifts.length > 0,
        };
      }

      // 1. From Invoices in this period (for standard branches)
      invoices.filter(i => matchB(i.branch) && inPeriod(invoiceDate(i))).forEach(inv => {
        bCount++;
        let split = inv.splitPayments;
        if (!split && inv.notes && inv.notes.includes('[SPLIT:')) {
          try {
            const match = inv.notes.match(/\[SPLIT:([^\]]+)\]/);
            if (match && match[1]) split = JSON.parse(match[1]);
          } catch {}
        }
        if (split) {
          bCash += Number(split.cash || 0);
          bInstapay += Number(split.instapay || 0);
          bVodafone += Number(split.vodafone || 0);
          bVisa += Number(split.visa || 0);
        } else {
          const m = ((inv.paymentMethod || (inv as any).paymentType || '') as string).trim();
          const paid = Number(inv.paidAmount || 0);
          if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) bVodafone += paid;
          else if (m.includes('إنستا') || m.includes('انستا') || m.toLowerCase().includes('insta')) bInstapay += paid;
          else if (m.includes('فيزا') || m.includes('كارت') || m.toLowerCase().includes('visa') || m.toLowerCase().includes('card')) bVisa += paid;
          else bCash += paid;
        }
      });

      // 2. From direct collections in this period
      const bCollectionsPool = new Map<string, number>();
      collections.filter(c => matchB(c.treasury || '') && inPeriod(collectionDate(c))).forEach(col => {
        bCount++;
        const amt = Number(col.amount || 0);
        const m = (col.method || '').trim();
        if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) bVodafone += amt;
        else if (m.includes('إنستا') || m.includes('انستا') || m.toLowerCase().includes('insta')) bInstapay += amt;
        else if (m.includes('فيزا') || m.includes('كارت') || m.toLowerCase().includes('visa') || m.toLowerCase().includes('card')) bVisa += amt;
        else bCash += amt;

        const key = normPhone(col.phone) || normName(col.customerName);
        if (key) {
          bCollectionsPool.set(key, (bCollectionsPool.get(key) || 0) + amt);
        }
      });

      // 3. From Quotation Deposits in this period (deduplicated)
      quotations.filter(q => matchB(q.branch) && inPeriod(quotationDate(q))).forEach(q => {
        const deposit = Number(q.depositPaid || 0);
        const key = normPhone(q.phone) || normName(q.customerName);
        const pool = key ? (bCollectionsPool.get(key) || 0) : 0;
        const unrecorded = Math.max(0, deposit - pool);

        if (key && pool > 0) {
          bCollectionsPool.set(key, Math.max(0, pool - deposit));
        }

        if (unrecorded > 0) {
          bCount++;
          let split = q.splitPayments || q.depositSplit;
          if (!split && q.notes && q.notes.includes('[DEPOSIT_SPLIT:')) {
            try {
              const match = q.notes.match(/\[DEPOSIT_SPLIT:([^\]]+)\]/);
              if (match && match[1]) split = JSON.parse(match[1]);
            } catch {}
          }
          if (split) {
            bCash += Number(split.cash || 0);
            bInstapay += Number(split.instapay || 0);
            bVodafone += Number(split.vodafone || 0);
            bVisa += Number(split.visa || 0);
          } else {
            const m = (q.paymentMethod || q.depositMethod || (q as any).paymentType || '').trim();
            if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) bVodafone += unrecorded;
            else if (m.includes('إنستا') || m.includes('انستا') || m.toLowerCase().includes('insta')) bInstapay += unrecorded;
            else if (m.includes('فيزا') || m.includes('كارت') || m.toLowerCase().includes('visa') || m.toLowerCase().includes('card')) bVisa += unrecorded;
            else bCash += unrecorded;
          }
        }
      });

      // 4. مصروفات الفرع فى نفس الفترة — بتتخصم من رصيد الخزينة حسب طريقة دفعها
      // (نقدي بيقلل الكاش بالدرج، إنستاباي بيقلل رصيد إنستاباي...الخ).
      let bExpensesTotal = 0;
      expenses.filter((e: any) => matchB(e.branch) && inPeriod(expenseDate(e))).forEach((exp: any) => {
        const amt = Number(exp.amount) || 0;
        bExpensesTotal += amt;
        const m = (exp.paymentMethod || '').trim();
        if (m.includes('فودافون')) bVodafone -= amt;
        else if (m.includes('إنستا') || m.includes('انستا')) bInstapay -= amt;
        else if (m.includes('فيزا') || m.includes('كارت')) bVisa -= amt;
        else bCash -= amt;
      });

      // 5. سلف/مكافآت الموظفين النقدية فى نفس الفترة — بتتخصم كاش من الدرج
      // (زي أي مبلغ بيتاخد من الخزينة، مفيش طريقة دفع تانية للسلفة).
      let bAdvancesTotal = 0;
      advances.filter((a: any) => matchB(a.branch) && a.treasuryDeducted !== false && inPeriod(advanceDate(a))).forEach((adv: any) => {
        const amt = Number(adv.amount) || 0;
        bAdvancesTotal += amt;
        bCash -= amt;
      });

      // 6. فواتير الشراء المدفوعة فورًا فى نفس الفترة — بتتخصم من رصيد الخزينة
      // حسب طريقة دفعها (الشيكات والآجل مستبعدة، مفيش فلوس خرجت فعليًا وقتها).
      let bPurchasesTotal = 0;
      purchases.filter((p: any) => matchB(p.branch) && inPeriod(purchaseDate(p))).forEach((p: any) => {
        const paid = Number(p.paidAmount) || 0;
        if (paid <= 0) return;
        const split = p.splitPayments;
        if (split && typeof split === 'object') {
          bCash -= Number(split.cash || 0);
          bInstapay -= Number(split.instapay || 0);
          bVodafone -= Number(split.vodafone || 0);
          bVisa -= Number(split.visa || 0);
          bPurchasesTotal += paid;
        } else if (isImmediateTreasuryMethod(p.paymentMethod)) {
          const bucket = bucketForMethod(p.paymentMethod);
          if (bucket === 'cash') bCash -= paid;
          else if (bucket === 'instapay') bInstapay -= paid;
          else if (bucket === 'vodafone') bVodafone -= paid;
          else bVisa -= paid;
          bPurchasesTotal += paid;
        }
      });

      // 7. تسويات نقدية بين الفروع فى نفس الفترة — بتتخصم من الفرع الدافع
      // وتتضاف للفرع المستلم فعليًا، لكل طريقة دفع على حدة.
      branchTransfers.filter((t: any) => t.kind === 'تسوية نقدية' && (matchB(t.fromBranch) || matchB(t.toBranch)) && inPeriod(transferDate(t))).forEach((t: any) => {
        const split = t.splitPayments;
        if (!split || typeof split !== 'object') return;
        const sign = matchB(t.fromBranch) ? -1 : 1;
        bCash += sign * (Number(split.cash) || 0);
        bInstapay += sign * (Number(split.instapay) || 0);
        bVodafone += sign * (Number(split.vodafone) || 0);
        bVisa += sign * (Number(split.visa) || 0);
      });

      const total = bCash + bInstapay + bVodafone + bVisa;
      return {
        ...b,
        cash: bCash,
        instapay: bInstapay,
        vodafone: bVodafone,
        expensesTotal: bExpensesTotal,
        advancesTotal: bAdvancesTotal,
        purchasesTotal: bPurchasesTotal,
        visa: bVisa,
        total,
        count: bCount,
      };
    });

    return {
      cash,
      instapay,
      vodafone,
      visa,
      deferred,
      other,
      grand,
      remaining,
      totalCollected,
      totalDirectCollections,
      fabricSalesGrand,
      fabricSalesPaid,
      fabricSalesRemaining,
      curtainSalesGrand,
      curtainSalesDeposits,
      curtainSalesRemaining,
      branchTreasuries,
    };
}

/** دمج عروض الأسعار (/api/pricing) مع أوردرات خط الإنتاج (/api/pipeline-orders) — منقول حرفيًا من reports/page.tsx. */
export function mergeQuotationsWithOrders(quotations: any[] | null | undefined, orders: any[] | null | undefined): any[] {
  const qMap = new Map<string, any>();
  if (Array.isArray(quotations)) {
    quotations.forEach((q: any) => {
      if (q && (q.id || q.inspectionId)) qMap.set(q.id || q.inspectionId, q);
    });
  }
  if (Array.isArray(orders)) {
    orders.forEach((o: any) => {
      const key = o.orderId || o.id || o.inspectionId;
      const existing = qMap.get(key) || qMap.get(o.id) || qMap.get(o.orderId);
      if (existing) {
        qMap.set(key, { ...existing, ...o, depositPaid: Math.max(Number(existing.depositPaid) || 0, Number(o.depositPaid) || 0) });
      } else if (key) {
        qMap.set(key, o);
      }
    });
  }
  return Array.from(qMap.values());
}

/** أقدم تاريخ فواتير محتاجه الفترة دي ('' = كل الفواتير). */
export function salesFromForPeriod(period: SalesReportPeriod, customStartDate: string): string {
  const today = getTodayDateStr();
  if (period === 'today') return today;
  if (period === 'yesterday') return getYesterdayDateStr();
  if (period === 'thisMonth') return `${today.substring(0, 7)}-01`;
  if (period === 'thisWeek') {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 8);
    return getTodayDateStr(d);
  }
  if (period === 'custom') return /^\d{4}-\d{2}-\d{2}$/.test(customStartDate || '') ? customStartDate : '';
  return '';
}
