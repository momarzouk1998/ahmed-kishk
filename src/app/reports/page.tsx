'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { formatDateOnly } from '@/lib/dateUtils';
import PdfPrintButton from '@/components/PdfPrintButton';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  phone?: string;
  branch: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  splitPayments?: {
    cash?: number;
    instapay?: number;
    vodafone?: number;
    visa?: number;
  };
  status: string;
  items?: any[];
  notes?: string;
}

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  costPrice: number;
  sellPrice: number;
  branch: string;
  minAlert: number;
  supplier?: string;
}

interface CustomerLedger {
  id: string;
  name: string;
  phone: string;
  branch?: string;
  balance: number;              // موجب = عليه، سالب = ليه
  totalSpent: number;
  ordersCount: number;
}

interface SupplierRow {
  id: string;
  name: string;
  phone?: string;
  balance: number; // موجب = مستحق للمورد علينا
  notes?: string;
}

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  branch: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  items?: any[];
}

type ReportTab = 'sales' | 'profits' | 'inventory' | 'curtains' | 'ledgers';
type Period = 'today' | 'thisWeek' | 'thisMonth' | 'all';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportTab>('sales');
  const [period, setPeriod] = useState<Period>('today');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setSelectedBranch(currentUser.branch);
  }, [isAdmin, currentUser]);

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerLedger[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Load all data ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [salesRes, purRes, invRes, custRes, supRes, insRes, priRes] = await Promise.all([
          fetch('/api/fabric-sales', { cache: 'no-store' }).catch(() => null),
          fetch('/api/purchases', { cache: 'no-store' }).catch(() => null),
          fetch('/api/inventory', { cache: 'no-store' }).catch(() => null),
          fetch('/api/customers', { cache: 'no-store' }).catch(() => null),
          fetch('/api/suppliers', { cache: 'no-store' }).catch(() => null),
          fetch('/api/inspections', { cache: 'no-store' }).catch(() => null),
          fetch('/api/pricing', { cache: 'no-store' }).catch(() => null),
        ]);

        if (salesRes?.ok) {
          const j = await salesRes.json();
          if (Array.isArray(j?.sales)) setInvoices(j.sales);
        }
        if (purRes?.ok) {
          const j = await purRes.json();
          if (Array.isArray(j?.purchases)) setPurchases(j.purchases);
        }
        if (invRes?.ok) {
          const j = await invRes.json();
          const arr = Array.isArray(j?.items) ? j.items : (Array.isArray(j?.inventory) ? j.inventory : []);
          setInventory(arr);
        }
        if (custRes?.ok) {
          const j = await custRes.json();
          if (Array.isArray(j?.customers)) setCustomers(j.customers);
          if (Array.isArray(j?.collections)) setCollections(j.collections);
        }
        if (supRes?.ok) {
          const j = await supRes.json();
          if (Array.isArray(j?.suppliers)) setSuppliers(j.suppliers);
        }
        if (insRes?.ok) {
          const j = await insRes.json();
          if (Array.isArray(j?.inspections)) setInspections(j.inspections);
        }
        if (priRes?.ok) {
          const j = await priRes.json();
          if (Array.isArray(j?.quotations)) setQuotations(j.quotations);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Date/Branch filtering helper ────────────────────────────
  const inPeriod = (dateStr: string | undefined): boolean => {
    if (!dateStr) return period === 'all';
    const d = dateStr.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (period === 'today') return d === today;
    if (period === 'thisWeek') {
      const wkAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return d >= wkAgo;
    }
    if (period === 'thisMonth') return d.substring(0, 7) === today.substring(0, 7);
    return true;
  };
  const inBranch = (b: string | undefined) => selectedBranch === 'ALL' || b === selectedBranch;

  const fInvoices = useMemo(
    () => invoices.filter(i => inBranch(i.branch) && inPeriod(i.date)),
    [invoices, selectedBranch, period]
  );
  const fPurchases = useMemo(
    () => purchases.filter(p => inBranch(p.branch) && inPeriod(p.date)),
    [purchases, selectedBranch, period]
  );

  const fCollections = useMemo(
    () => collections.filter(c => {
      const matchPeriod = inPeriod(c.date);
      if (!matchPeriod) return false;
      if (selectedBranch === 'ALL') return true;
      const treasury = c.treasury || '';
      if (treasury.includes(selectedBranch)) return true;
      if (selectedBranch === 'فرع عمر أفندي' && (treasury.includes('عمر أفندي') || treasury.includes('عمر افندي'))) return true;
      if (selectedBranch === 'فرع عرابي' && treasury.includes('عرابي')) return true;
      if (selectedBranch === 'فرع الثلاثيني' && treasury.includes('الثلاثيني')) return true;
      if (selectedBranch === 'الفرع الرئيسي' && (treasury.includes('الرئيسية') || treasury.includes('سعد زغلول'))) return true;
      const cust = customers.find(cust => cust.phone === c.phone || cust.name === c.customerName);
      if (cust && cust.branch && inBranch(cust.branch)) return true;
      return false;
    }),
    [collections, selectedBranch, period, customers]
  );

  // ─── Sales KPIs & cash-drawer breakdown (Including Collections) ──────────────
  const salesKpis = useMemo(() => {
    let cash = 0, instapay = 0, vodafone = 0, visa = 0, deferred = 0, other = 0;
    let grand = 0, remaining = 0;

    fInvoices.forEach(inv => {
      grand += Number(inv.totalAmount || 0);
      remaining += Number(inv.remainingAmount || 0);
      const paid = Number(inv.paidAmount || 0);

      if (inv.splitPayments) {
        cash += Number(inv.splitPayments.cash || 0);
        instapay += Number(inv.splitPayments.instapay || 0);
        vodafone += Number(inv.splitPayments.vodafone || 0);
        visa += Number(inv.splitPayments.visa || 0);
        return;
      }

      const m = (inv.paymentMethod || '').trim();
      if (m === 'نقدي' || m === 'كاش' || m === 'نقدي (كاش)') cash += paid;
      else if (m.includes('إنستا') || m.toLowerCase().includes('insta')) instapay += paid;
      else if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) vodafone += paid;
      else if (m.includes('فيزا') || m.includes('كارت') || m.toLowerCase().includes('visa') || m.toLowerCase().includes('card')) visa += paid;
      else if (m.includes('آجل') || m.includes('دفعات') || m === 'بالآجل / دفعات') deferred += paid;
      else other += paid;
    });

    let totalDirectCollections = 0;
    fCollections.forEach(col => {
      const amt = Number(col.amount || 0);
      totalDirectCollections += amt;
      const m = (col.method || '').trim();
      if (m.includes('إنستا') || m.toLowerCase().includes('insta')) instapay += amt;
      else if (m.includes('فودافون') || m.toLowerCase().includes('vodafone')) vodafone += amt;
      else if (m.includes('فيزا') || m.toLowerCase().includes('visa') || m.includes('كارت')) visa += amt;
      else if (m === 'نقدي' || m === 'كاش') cash += amt;
      else other += amt;
    });

    const totalCollected = cash + instapay + vodafone + visa + other;
    return { cash, instapay, vodafone, visa, deferred, other, grand, remaining, totalCollected, totalDirectCollections };
  }, [fInvoices, fCollections]);

  // ─── Profits (real cost from inventory) ──────────────────────
  const profitStats = useMemo(() => {
    const itemCostMap = new Map<string, number>();
    inventory.forEach(it => itemCostMap.set(it.code, Number(it.costPrice) || 0));

    let revenue = 0, cost = 0;
    fInvoices.forEach(inv => {
      revenue += Number(inv.totalAmount || 0);
      (inv.items || []).forEach((it: any) => {
        const c = itemCostMap.get(it.code) || 0;
        cost += (Number(it.meters) || 0) * c;
      });
    });
    const profit = revenue - cost;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, marginPct };
  }, [fInvoices, inventory]);

  // ─── Top-selling items (real) ────────────────────────────────
  const topItems = useMemo(() => {
    const agg = new Map<string, { name: string; code: string; meters: number; total: number }>();
    fInvoices.forEach(inv => {
      (inv.items || []).forEach((it: any) => {
        const key = it.code || it.name || 'unknown';
        const row = agg.get(key) || { name: it.name || 'صنف', code: it.code || '—', meters: 0, total: 0 };
        row.meters += Number(it.meters) || 0;
        row.total += Number(it.totalPrice) || (Number(it.meters) || 0) * (Number(it.pricePerMeter) || 0);
        agg.set(key, row);
      });
    });
    return Array.from(agg.values()).sort((a, b) => b.total - a.total).slice(0, 12);
  }, [fInvoices]);

  // ─── Curtains pipeline stats (real) ──────────────────────────
  const curtainStats = useMemo(() => {
    const fIns = inspections.filter((i: any) => inBranch(i.branch) && inPeriod(i.createdAt || i.scheduledAt));
    const fQot = quotations.filter((q: any) => inBranch(q.branch) && inPeriod(q.date || q.createdAt));

    const insByStatus: Record<string, number> = {};
    fIns.forEach((i: any) => { const k = i.status || 'غير محدد'; insByStatus[k] = (insByStatus[k] || 0) + 1; });

    const qotByStatus: Record<string, number> = {};
    let quotTotal = 0, quotDeposit = 0, quotRemaining = 0;
    fQot.forEach((q: any) => {
      const k = q.status || 'غير محدد'; qotByStatus[k] = (qotByStatus[k] || 0) + 1;
      quotTotal += Number(q.totalAmount || 0);
      quotDeposit += Number(q.depositPaid || 0);
      quotRemaining += Number(q.remainingAmount || 0);
    });

    const techCount: Record<string, number> = {};
    fIns.forEach((i: any) => { const t = i.technician || '—'; techCount[t] = (techCount[t] || 0) + 1; });

    return {
      totalInspections: fIns.length, totalQuotations: fQot.length,
      insByStatus, qotByStatus, quotTotal, quotDeposit, quotRemaining, techCount,
    };
  }, [inspections, quotations, selectedBranch, period]);

  // ─── Ledgers (customers + suppliers) ─────────────────────────
  const ledgerStats = useMemo(() => {
    const custDebts = customers
      .filter(c => Math.abs(Number(c.balance) || 0) > 0.01)
      .filter(c => selectedBranch === 'ALL' || (c as any).branch === selectedBranch)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    const custTotalDebt = custDebts.reduce((s, c) => s + Math.max(0, Number(c.balance) || 0), 0);
    const custTotalCredit = custDebts.reduce((s, c) => s + Math.max(0, -(Number(c.balance) || 0)), 0);

    const supDebts = suppliers
      .filter(s => Math.abs(Number(s.balance) || 0) > 0.01)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    const supTotalDebt = supDebts.reduce((s, x) => s + Math.max(0, Number(x.balance) || 0), 0);

    return { custDebts, custTotalDebt, custTotalCredit, supDebts, supTotalDebt };
  }, [customers, suppliers, selectedBranch]);

  // ─── Inventory alerts ────────────────────────────────────────
  const invAlerts = useMemo(() => {
    const bFilt = (i: InventoryItem) => selectedBranch === 'ALL' || i.branch === selectedBranch;
    const list = inventory.filter(bFilt);
    const belowMin = list.filter(i => (i.totalQuantity || 0) <= (i.minAlert || 0));
    const totalCost = list.reduce((s, i) => s + (i.totalQuantity || 0) * (i.costPrice || 0), 0);
    const totalValue = list.reduce((s, i) => s + (i.totalQuantity || 0) * (i.sellPrice || 0), 0);
    return { list, belowMin, totalCost, totalValue };
  }, [inventory, selectedBranch]);

  const periodLabel = period === 'today' ? 'اليومى' : period === 'thisWeek' ? 'الأسبوع' : period === 'thisMonth' ? 'الشهر' : 'الكل';
  const branchLabel = selectedBranch === 'ALL' ? 'جميع الفروع' : selectedBranch;

  return (
    <PageShell title="التقارير والإحصائيات الشاملة">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          #print-area { font-size: 10pt; }
          #print-area table { font-size: 9pt; }
          #print-area .card { break-inside: avoid; }
          #print-area h3, #print-area h2 { break-after: avoid; }
        }
      `}</style>

      <div className="flex flex-col gap-4 max-w-[1400px] mx-auto">
        {/* Compact Toolbar (no-print controls) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-soft">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-xl">analytics</span>
            <div>
              <h1 className="font-black text-sm text-slate-900">التقارير والإحصائيات</h1>
              <p className="text-[11px] text-slate-500">جرد يومى، أرباح، مخزون، ديون — بيانات حقيقية من قاعدة البيانات</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PdfPrintButton
              targetSelector="#print-area"
              documentTitle={`تقرير-${reportType}-${periodLabel}-${branchLabel}`}
              label="طباعة PDF (A4)"
              paperSize="A4"
            />
            <BranchSelect
              value={selectedBranch}
              onChange={setSelectedBranch}
              isAdmin={isAdmin}
              allValue="ALL"
              allLabel="🌐 كل الفروع"
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['today', 'thisWeek', 'thisMonth', 'all'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${period === p ? 'bg-amber-500 text-white' : 'text-slate-700'}`}>
                  {p === 'today' ? 'اليوم' : p === 'thisWeek' ? 'أسبوع' : p === 'thisMonth' ? 'شهر' : 'الكل'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="no-print flex border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'sales', label: 'المبيعات والدرج', icon: 'payments' },
            { id: 'profits', label: 'الأرباح والتكلفة', icon: 'trending_up' },
            { id: 'inventory', label: 'المخزون', icon: 'inventory_2' },
            { id: 'curtains', label: 'الستائر والفنيين', icon: 'square_foot' },
            { id: 'ledgers', label: 'ديون العملاء والموردين', icon: 'account_balance_wallet' },
          ].map(t => (
            <button key={t.id} onClick={() => setReportType(t.id as ReportTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                reportType === t.id ? 'border-amber-500 text-amber-900 bg-amber-50/60' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}>
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Printable Content Area */}
        <div id="print-area" className="flex flex-col gap-4">
          {/* Print Header */}
          <div className="hidden print:flex print:flex-col print:pb-3 print:mb-3 print:border-b-2 print:border-slate-900">
            <h1 className="text-lg font-black">مؤسسة أحمد كشك — تقرير {reportType === 'sales' ? 'المبيعات والدرج' : reportType === 'profits' ? 'الأرباح والتكلفة' : reportType === 'inventory' ? 'المخزون' : reportType === 'curtains' ? 'الستائر والفنيين' : 'ديون العملاء والموردين'}</h1>
            <div className="text-xs text-slate-700 flex justify-between mt-1">
              <span>الفترة: {periodLabel} • الفرع: {branchLabel}</span>
              <span>تاريخ الطباعة: {formatDateOnly(new Date().toISOString())}</span>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">جارٍ تحميل التقارير...</div>
          ) : (
            <>
              {reportType === 'sales' && <SalesReport kpis={salesKpis} invoices={fInvoices} collections={fCollections} branchLabel={branchLabel} periodLabel={periodLabel} />}
              {reportType === 'profits' && <ProfitsReport stats={profitStats} topItems={topItems} branchLabel={branchLabel} periodLabel={periodLabel} />}
              {reportType === 'inventory' && <InventoryReport alerts={invAlerts} branchLabel={branchLabel} />}
              {reportType === 'curtains' && <CurtainsReport stats={curtainStats} branchLabel={branchLabel} periodLabel={periodLabel} />}
              {reportType === 'ledgers' && <LedgersReport stats={ledgerStats} branchLabel={branchLabel} />}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ═══════════════ Report Sub-Components ══════════════════════════

function KpiStrip({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {items.map((it, i) => (
        <div key={i} className={`card p-2.5 rounded-xl border ${it.color || 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] font-bold text-slate-600 leading-tight">{it.label}</div>
          <div className="font-mono font-black text-sm text-slate-900 mt-1">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function SalesReport({ kpis, invoices, collections, branchLabel, periodLabel }: any) {
  return (
    <>
      <KpiStrip items={[
        { label: 'إجمالى المبيعات', value: `${kpis.grand.toLocaleString()} ج`, color: 'bg-amber-100 border-amber-400' },
        { label: '💵 كاش بالدرج / الخزائن', value: `${kpis.cash.toLocaleString()} ج`, color: 'bg-emerald-50 border-emerald-300' },
        { label: '⚡ إنستاباى', value: `${kpis.instapay.toLocaleString()} ج`, color: 'bg-purple-50 border-purple-300' },
        { label: '📱 فودافون كاش', value: `${kpis.vodafone.toLocaleString()} ج`, color: 'bg-rose-50 border-rose-300' },
        { label: '💳 فيزا/كارت', value: `${kpis.visa.toLocaleString()} ج`, color: 'bg-blue-50 border-blue-300' },
        { label: '⏳ آجل/متبقى', value: `${kpis.remaining.toLocaleString()} ج`, color: 'bg-amber-50 border-amber-300' },
      ]} />

      {(kpis.deferred > 0 || kpis.other > 0 || (kpis.totalDirectCollections || 0) > 0) && (
        <div className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-wrap gap-4">
          {(kpis.totalDirectCollections || 0) > 0 && (
            <span className="text-purple-900 bg-purple-100 px-2 py-0.5 rounded font-black">
              💰 سندات تحصيل عملاء مباشرة: <span className="font-mono">{kpis.totalDirectCollections.toLocaleString()} ج</span>
            </span>
          )}
          {kpis.deferred > 0 && <span>مسجل كآجل: <span className="font-mono text-amber-700">{kpis.deferred.toLocaleString()} ج</span></span>}
          {kpis.other > 0 && <span>طرق دفع أخرى: <span className="font-mono text-slate-700">{kpis.other.toLocaleString()} ج</span></span>}
        </div>
      )}

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
          <h3 className="font-black text-xs text-slate-900">تفاصيل فواتير المبيعات ({invoices.length}) — {branchLabel} • {periodLabel}</h3>
          <span className="text-[11px] font-mono font-bold text-emerald-700">مقبوضات الفواتير: {(kpis.totalCollected - (kpis.totalDirectCollections || 0)).toLocaleString()} ج</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <tr>
                <th className="p-2">الرقم</th>
                <th className="p-2">التاريخ</th>
                <th className="p-2">العميل</th>
                <th className="p-2">الفرع</th>
                <th className="p-2 text-center">طريقة الدفع</th>
                <th className="p-2 text-left font-mono">الإجمالى</th>
                <th className="p-2 text-left font-mono">المدفوع</th>
                <th className="p-2 text-left font-mono">المتبقى</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-slate-400 font-bold">لا توجد فواتير مبيعات فى الفترة المحددة</td></tr>
              ) : invoices.map((inv: SalesInvoice) => (
                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="p-2 font-mono text-slate-600">{inv.date ? formatDateOnly(inv.date) : '—'}</td>
                  <td className="p-2 font-bold text-slate-900">{inv.customerName}</td>
                  <td className="p-2 text-slate-600">{inv.branch}</td>
                  <td className="p-2 text-center text-[10px]">
                    {inv.splitPayments ? (
                      <span className="bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded font-bold">متعدد</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded font-bold">{inv.paymentMethod || '—'}</span>
                    )}
                  </td>
                  <td className="p-2 text-left font-mono font-black">{(Number(inv.totalAmount) || 0).toLocaleString()}</td>
                  <td className="p-2 text-left font-mono font-bold text-emerald-700">{(Number(inv.paidAmount) || 0).toLocaleString()}</td>
                  <td className="p-2 text-left font-mono font-bold text-rose-700">{(Number(inv.remainingAmount) || 0) > 0 ? (Number(inv.remainingAmount)).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
            {invoices.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                <tr>
                  <td colSpan={5} className="p-2 text-slate-900">الإجمالى</td>
                  <td className="p-2 text-left font-mono">{kpis.grand.toLocaleString()}</td>
                  <td className="p-2 text-left font-mono text-emerald-700">{(kpis.grand - kpis.remaining).toLocaleString()}</td>
                  <td className="p-2 text-left font-mono text-rose-700">{kpis.remaining.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 💰 Direct Customer Collections Table */}
      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
          <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-500 text-sm">payments</span>
            <span>سندات التحصيل والمقبوضات المباشرة ({collections?.length || 0}) — {branchLabel} • {periodLabel}</span>
          </h3>
          <span className="text-[11px] font-mono font-black text-emerald-700">
            إجمالي سندات التحصيل: {(kpis.totalDirectCollections || 0).toLocaleString()} ج.م
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <tr>
                <th className="p-2">رقم السند</th>
                <th className="p-2">التاريخ</th>
                <th className="p-2">العميل</th>
                <th className="p-2 text-center">طريقة الدفع</th>
                <th className="p-2">الخزينة المستلمة</th>
                <th className="p-2 text-left font-mono">المبلغ المحصل</th>
                <th className="p-2">البيان / ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {!collections || collections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                    لا توجد سندات تحصيل مباشرة فى الفترة المحددة
                  </td>
                </tr>
              ) : collections.map((col: any) => {
                const methodBadge = col.method === 'إنستاباي' ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : col.method === 'فيزا' ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : col.method === 'فودافون كاش' ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300';
                return (
                  <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 font-mono font-bold text-slate-900">{col.id}</td>
                    <td className="p-2 font-mono text-slate-600">{col.date ? formatDateOnly(col.date) : '—'}</td>
                    <td className="p-2 font-bold text-slate-900">{col.customerName}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${methodBadge}`}>
                        {col.method || 'نقدي'}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-slate-700">{col.treasury || 'الخزينة الرئيسية'}</td>
                    <td className="p-2 text-left font-mono font-black text-emerald-700">
                      {(Number(col.amount) || 0).toLocaleString()} ج
                    </td>
                    <td className="p-2 text-slate-500 text-[10.5px]">{col.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            {collections && collections.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                <tr>
                  <td colSpan={5} className="p-2 text-slate-900">إجمالي سندات التحصيل</td>
                  <td className="p-2 text-left font-mono text-emerald-700">
                    {(kpis.totalDirectCollections || 0).toLocaleString()} ج
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}

function ProfitsReport({ stats, topItems, branchLabel, periodLabel }: any) {
  return (
    <>
      <KpiStrip items={[
        { label: 'إجمالى الإيرادات', value: `${stats.revenue.toLocaleString()} ج`, color: 'bg-amber-100 border-amber-400' },
        { label: 'تكلفة المبيعات', value: `${stats.cost.toLocaleString()} ج`, color: 'bg-rose-50 border-rose-300' },
        { label: 'صافى الربح', value: `${stats.profit.toLocaleString()} ج`, color: 'bg-emerald-50 border-emerald-300' },
        { label: 'هامش الربح %', value: `${stats.marginPct.toFixed(1)}%`, color: 'bg-amber-50 border-amber-300' },
      ]} />

      {stats.cost === 0 && stats.revenue > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-[11px] font-bold text-amber-900">
          ⚠️ لا توجد بيانات تكلفة للأصناف المباعة فى المخزون — أضف سعر التكلفة (costPrice) لكل صنف لعرض الربح الحقيقى.
        </div>
      )}

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <h3 className="font-black text-xs text-slate-900 mb-2 pb-2 border-b border-slate-100">
          الأصناف الأكثر مبيعاً ({topItems.length}) — {branchLabel} • {periodLabel}
        </h3>
        {topItems.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-bold">لا توجد مبيعات لهذه الفترة</div>
        ) : (
          <table className="w-full text-right text-[11px]">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">الصنف</th>
                <th className="p-2 font-mono">الكود</th>
                <th className="p-2 text-left font-mono">أمتار مباعة</th>
                <th className="p-2 text-left font-mono">إجمالى الإيراد</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((it: any, i: number) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2 font-mono font-bold">{i + 1}</td>
                  <td className="p-2 font-bold text-slate-900">{it.name}</td>
                  <td className="p-2 font-mono text-slate-500">{it.code}</td>
                  <td className="p-2 text-left font-mono">{it.meters.toLocaleString()}</td>
                  <td className="p-2 text-left font-mono font-black text-emerald-700">{it.total.toLocaleString()} ج</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function InventoryReport({ alerts, branchLabel }: any) {
  return (
    <>
      <KpiStrip items={[
        { label: 'عدد الأصناف', value: `${alerts.list.length}`, color: 'bg-slate-100 border-slate-300' },
        { label: 'قيمة تكلفة المخزون', value: `${alerts.totalCost.toLocaleString()} ج`, color: 'bg-amber-50 border-amber-300' },
        { label: 'قيمة بيع المخزون', value: `${alerts.totalValue.toLocaleString()} ج`, color: 'bg-emerald-50 border-emerald-300' },
        { label: 'أصناف تحت حد التنبيه', value: `${alerts.belowMin.length}`, color: alerts.belowMin.length > 0 ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200' },
      ]} />

      {alerts.belowMin.length > 0 && (
        <div className="card bg-white rounded-2xl border border-rose-300 p-3">
          <h3 className="font-black text-xs text-rose-900 mb-2 pb-2 border-b border-rose-100">
            🚨 أصناف تحت حد التنبيه — {branchLabel}
          </h3>
          <table className="w-full text-right text-[11px]">
            <thead className="bg-rose-50 text-rose-800 border-b border-rose-200">
              <tr>
                <th className="p-2">الكود</th>
                <th className="p-2">الصنف</th>
                <th className="p-2">التصنيف</th>
                <th className="p-2 text-center">الحالى</th>
                <th className="p-2 text-center">حد التنبيه</th>
                <th className="p-2">المورد</th>
              </tr>
            </thead>
            <tbody>
              {alerts.belowMin.map((i: InventoryItem) => (
                <tr key={i.id} className="border-b border-rose-100">
                  <td className="p-2 font-mono">{i.code}</td>
                  <td className="p-2 font-bold">{i.name}</td>
                  <td className="p-2">{i.category}</td>
                  <td className="p-2 text-center font-mono font-black text-rose-700">{i.totalQuantity} {i.unit}</td>
                  <td className="p-2 text-center font-mono text-slate-600">{i.minAlert}</td>
                  <td className="p-2 text-slate-600">{i.supplier || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <h3 className="font-black text-xs text-slate-900 mb-2 pb-2 border-b border-slate-100">
          كامل المخزون — {branchLabel} ({alerts.list.length} صنف)
        </h3>
        {alerts.list.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-bold">لا يوجد أصناف مسجلة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-2">الكود</th>
                  <th className="p-2">الصنف</th>
                  <th className="p-2">التصنيف</th>
                  <th className="p-2 text-center">الكمية</th>
                  <th className="p-2 text-left font-mono">تكلفة</th>
                  <th className="p-2 text-left font-mono">بيع</th>
                  <th className="p-2 text-left font-mono">قيمة</th>
                </tr>
              </thead>
              <tbody>
                {alerts.list.map((i: InventoryItem) => (
                  <tr key={i.id} className="border-b border-slate-100">
                    <td className="p-2 font-mono text-slate-500">{i.code}</td>
                    <td className="p-2 font-bold">{i.name}</td>
                    <td className="p-2 text-slate-600">{i.category}</td>
                    <td className="p-2 text-center font-mono font-bold">{i.totalQuantity} {i.unit}</td>
                    <td className="p-2 text-left font-mono">{i.costPrice}</td>
                    <td className="p-2 text-left font-mono">{i.sellPrice}</td>
                    <td className="p-2 text-left font-mono font-black text-emerald-700">{((i.totalQuantity || 0) * (i.sellPrice || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function CurtainsReport({ stats, branchLabel, periodLabel }: any) {
  return (
    <>
      <KpiStrip items={[
        { label: 'إجمالى المعاينات', value: `${stats.totalInspections}`, color: 'bg-slate-100 border-slate-300' },
        { label: 'إجمالى العقود', value: `${stats.totalQuotations}`, color: 'bg-blue-50 border-blue-300' },
        { label: 'قيمة العقود', value: `${stats.quotTotal.toLocaleString()} ج`, color: 'bg-emerald-50 border-emerald-300' },
        { label: 'العرابين المحصلة', value: `${stats.quotDeposit.toLocaleString()} ج`, color: 'bg-amber-50 border-amber-300' },
        { label: 'المتبقى على العقود', value: `${stats.quotRemaining.toLocaleString()} ج`, color: 'bg-rose-50 border-rose-300' },
      ]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="card bg-white rounded-2xl border border-slate-200 p-3">
          <h3 className="font-black text-xs text-slate-900 mb-2 pb-2 border-b border-slate-100">توزيع حالات المعاينات</h3>
          <div className="space-y-1">
            {Object.entries(stats.insByStatus).length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4 font-bold">لا توجد معاينات</div>
            ) : Object.entries(stats.insByStatus).map(([k, v]: any) => (
              <div key={k} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs">
                <span className="font-bold">{k}</span>
                <span className="font-mono font-black text-slate-900">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-white rounded-2xl border border-slate-200 p-3">
          <h3 className="font-black text-xs text-slate-900 mb-2 pb-2 border-b border-slate-100">توزيع حالات العقود</h3>
          <div className="space-y-1">
            {Object.entries(stats.qotByStatus).length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4 font-bold">لا توجد عقود</div>
            ) : Object.entries(stats.qotByStatus).map(([k, v]: any) => (
              <div key={k} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs">
                <span className="font-bold">{k}</span>
                <span className="font-mono font-black text-slate-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <h3 className="font-black text-xs text-slate-900 mb-2 pb-2 border-b border-slate-100">
          أداء الفنيين — {branchLabel} • {periodLabel}
        </h3>
        {Object.entries(stats.techCount).length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-4 font-bold">لا توجد بيانات</div>
        ) : (
          <table className="w-full text-right text-[11px]">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <tr>
                <th className="p-2">الفنى</th>
                <th className="p-2 text-center">عدد المعاينات</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.techCount).sort(([, a]: any, [, b]: any) => b - a).map(([tech, count]: any) => (
                <tr key={tech} className="border-b border-slate-100">
                  <td className="p-2 font-bold">{tech}</td>
                  <td className="p-2 text-center font-mono font-black">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function LedgersReport({ stats, branchLabel }: any) {
  return (
    <>
      <KpiStrip items={[
        { label: 'ديون العملاء (لنا)', value: `${stats.custTotalDebt.toLocaleString()} ج`, color: 'bg-rose-50 border-rose-300' },
        { label: 'رصيد للعملاء (علينا)', value: `${stats.custTotalCredit.toLocaleString()} ج`, color: 'bg-emerald-50 border-emerald-300' },
        { label: 'مستحقات الموردين', value: `${stats.supTotalDebt.toLocaleString()} ج`, color: 'bg-amber-50 border-amber-300' },
        { label: 'إجمالى المديونيات', value: `${(stats.custTotalDebt + stats.supTotalDebt).toLocaleString()} ج`, color: 'bg-amber-100 border-amber-400' },
      ]} />

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <h3 className="font-black text-xs text-slate-900 mb-2 pb-2 border-b border-slate-100">
          كشف ديون العملاء ({stats.custDebts.length}) — {branchLabel}
        </h3>
        {stats.custDebts.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-bold">لا توجد ديون عملاء مسجلة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-2">العميل</th>
                  <th className="p-2 font-mono">الهاتف</th>
                  <th className="p-2 text-center">طلبات</th>
                  <th className="p-2 text-left font-mono">إجمالى الشراء</th>
                  <th className="p-2 text-left font-mono">الرصيد</th>
                  <th className="p-2 text-center">النوع</th>
                </tr>
              </thead>
              <tbody>
                {stats.custDebts.map((c: any) => {
                  const bal = Number(c.balance) || 0;
                  const isDebt = bal > 0;
                  return (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="p-2 font-bold text-slate-900">{c.name}</td>
                      <td className="p-2 font-mono text-slate-600" dir="ltr">{c.phone}</td>
                      <td className="p-2 text-center">{c.ordersCount || 0}</td>
                      <td className="p-2 text-left font-mono">{(Number(c.totalSpent) || 0).toLocaleString()}</td>
                      <td className={`p-2 text-left font-mono font-black ${isDebt ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {Math.abs(bal).toLocaleString()} ج
                      </td>
                      <td className="p-2 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isDebt ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                          {isDebt ? 'مديون' : 'له رصيد'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                <tr>
                  <td colSpan={4} className="p-2">الإجمالى</td>
                  <td className="p-2 text-left font-mono text-rose-700">{stats.custTotalDebt.toLocaleString()} ج</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <h3 className="font-black text-xs text-slate-900 mb-2 pb-2 border-b border-slate-100">
          مستحقات الموردين ({stats.supDebts.length})
        </h3>
        {stats.supDebts.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-bold">لا توجد مستحقات موردين</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-2">المورد</th>
                  <th className="p-2 font-mono">الهاتف</th>
                  <th className="p-2 text-left font-mono">الرصيد المستحق</th>
                  <th className="p-2">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {stats.supDebts.map((s: SupplierRow) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="p-2 font-bold text-slate-900">{s.name}</td>
                    <td className="p-2 font-mono text-slate-600" dir="ltr">{s.phone || '—'}</td>
                    <td className="p-2 text-left font-mono font-black text-amber-800">{(Number(s.balance) || 0).toLocaleString()} ج</td>
                    <td className="p-2 text-slate-600 text-[10px]">{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                <tr>
                  <td colSpan={2} className="p-2">الإجمالى</td>
                  <td className="p-2 text-left font-mono text-amber-800">{stats.supTotalDebt.toLocaleString()} ج</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
