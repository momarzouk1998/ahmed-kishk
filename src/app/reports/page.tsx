'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { formatDateOnly, getTodayDateStr, getYesterdayDateStr } from '@/lib/dateUtils';
import PdfPrintButton from '@/components/PdfPrintButton';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { normalizeBranchName } from '@/lib/branches';
import Pagination from '@/components/Pagination';

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
type Period = 'yesterday' | 'today' | 'thisWeek' | 'thisMonth' | 'all';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportTab>('sales');
  const [period, setPeriod] = useState<Period>('today');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setSelectedBranch(currentUser.branch);
    if (!isAdmin && reportType === 'profits') setReportType('sales');
  }, [isAdmin, currentUser, reportType]);

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerLedger[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Load all data ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [salesRes, purRes, invRes, custRes, supRes, insRes, priRes, ordRes, shiftRes] = await Promise.all([
          fetch('/api/fabric-sales', { cache: 'no-store' }).catch(() => null),
          fetch('/api/purchases', { cache: 'no-store' }).catch(() => null),
          fetch('/api/inventory', { cache: 'no-store' }).catch(() => null),
          fetch('/api/customers', { cache: 'no-store' }).catch(() => null),
          fetch('/api/suppliers', { cache: 'no-store' }).catch(() => null),
          fetch('/api/inspections', { cache: 'no-store' }).catch(() => null),
          fetch('/api/pricing', { cache: 'no-store' }).catch(() => null),
          fetch('/api/pipeline-orders', { cache: 'no-store' }).catch(() => null),
          fetch('/api/shifts', { cache: 'no-store' }).catch(() => null),
        ]);

        if (salesRes?.ok) {
          const j = await salesRes.json();
          if (Array.isArray(j?.sales)) setInvoices(j.sales);
        }
        if (shiftRes?.ok) {
          const j = await shiftRes.json();
          if (Array.isArray(j?.shifts)) setShifts(j.shifts);
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
        
        const qMap = new Map<string, any>();
        if (priRes?.ok) {
          const j = await priRes.json();
          if (Array.isArray(j?.quotations)) {
            j.quotations.forEach((q: any) => {
              if (q && (q.id || q.inspectionId)) qMap.set(q.id || q.inspectionId, q);
            });
          }
        }
        if (ordRes?.ok) {
          const j = await ordRes.json();
          if (Array.isArray(j?.orders)) {
            j.orders.forEach((o: any) => {
              const key = o.orderId || o.id || o.inspectionId;
              const existing = qMap.get(key) || qMap.get(o.id) || qMap.get(o.orderId);
              if (existing) {
                qMap.set(key, { ...existing, ...o, depositPaid: Math.max(Number(existing.depositPaid) || 0, Number(o.depositPaid) || 0) });
              } else if (key) {
                qMap.set(key, o);
              }
            });
          }
        }
        setQuotations(Array.from(qMap.values()));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Date/Branch filtering helper (Cairo local time 12:00 AM boundary) ────────────────────────────
  const inPeriod = (dateStr: string | undefined): boolean => {
    if (!dateStr) return period === 'all';
    const d = getTodayDateStr(dateStr) || String(dateStr).split('T')[0];
    const today = getTodayDateStr();
    if (period === 'yesterday') return d === getYesterdayDateStr();
    if (period === 'today') return d === today;
    if (period === 'thisWeek') {
      const todayDate = new Date(today);
      const itemDate = new Date(d);
      const diffDays = (todayDate.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (period === 'thisMonth') return d.substring(0, 7) === today.substring(0, 7);
    return true;
  };
  const inBranch = (b: string | undefined): boolean => {
    if (!selectedBranch || selectedBranch === 'ALL' || selectedBranch === 'الكل') return true;
    return normalizeBranchName(b) === normalizeBranchName(selectedBranch);
  };

  const fInvoices = useMemo(
    () => invoices.filter(i => inBranch(i.branch) && inPeriod(i.date)),
    [invoices, selectedBranch, period]
  );
  const fQuotations = useMemo(
    () => quotations.filter(q => inBranch(q.branch) && inPeriod(q.date || q.depositDate || q.createdAt)),
    [quotations, selectedBranch, period]
  );
  const fPurchases = useMemo(
    () => purchases.filter(p => inBranch(p.branch) && inPeriod(p.date)),
    [purchases, selectedBranch, period]
  );

  const fCollections = useMemo(
    () => collections.filter(c => {
      const matchPeriod = inPeriod(c.date);
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
    }),
    [collections, selectedBranch, period, customers]
  );

  // ─── Sales KPIs & cash-drawer breakdown (Including Fabric Invoices, Curtain Deposits & Direct Collections) ───
  const salesKpis = useMemo(() => {
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
        return false;
      };

      if (b.isShift && b.key === 'عمر أفندي') {
        const omarShifts = shifts.filter(s => {
          const isOmar = s.branch && (s.branch.includes('عمر أفندي') || s.branch.includes('عمر افندي') || s.branch.includes('عمر'));
          if (!isOmar) return false;
          return inPeriod(s.startTime || s.createdAt || s.endTime) && s.shiftType === b.shiftType;
        });

        const shiftCash = omarShifts.reduce((acc, s) => acc + Number(s.actualClosingCash ?? s.expectedCashInDrawer ?? s.cashSales ?? 0), 0);
        const shiftSales = omarShifts.reduce((acc, s) => acc + Number(s.totalSales ?? s.cashSales ?? 0), 0);
        const shiftInstapay = omarShifts.reduce((acc, s) => acc + Number(s.instapaySales || 0), 0);
        const shiftVodafone = omarShifts.reduce((acc, s) => acc + Number(s.vodafoneSales || 0), 0);
        const shiftVisa = omarShifts.reduce((acc, s) => acc + Number(s.visaSales || 0), 0);
        const employeeName = Array.from(new Set(omarShifts.map(s => s.employeeName).filter(Boolean))).join(', ') || (b.shiftType === 'صباحي' ? 'محمد كشك' : 'بليا');
        const activeShift = omarShifts.find(s => s.status === 'OPEN');
        const shiftStatus = activeShift ? 'قيد التشغيل 🟢' : (omarShifts.length > 0 ? 'مغلقة 🔒' : 'جاهزة لبدء العمل');

        // Check if there are invoice/collection transactions matching this shift time
        invoices.filter(i => matchB(i.branch) && inPeriod(i.date)).forEach(inv => {
          const hours = inv.date?.includes('T') ? new Date(inv.date).getHours() : 12;
          const isMorningTx = hours < 16;
          if ((b.shiftType === 'صباحي' && isMorningTx) || (b.shiftType === 'مسائي' && !isMorningTx)) {
            bCount++;
          }
        });

        const finalCash = shiftCash;
        const total = finalCash + shiftInstapay + shiftVodafone + shiftVisa;

        return {
          ...b,
          cash: finalCash,
          instapay: shiftInstapay,
          vodafone: shiftVodafone,
          visa: shiftVisa,
          total,
          count: bCount || omarShifts.length,
          employeeName,
          shiftSales,
          shiftStatus,
          hasShifts: omarShifts.length > 0,
        };
      }

      // 1. From Invoices in this period (for standard branches)
      invoices.filter(i => matchB(i.branch) && inPeriod(i.date)).forEach(inv => {
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
      collections.filter(c => matchB(c.treasury || '') && inPeriod(c.date)).forEach(col => {
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
      quotations.filter(q => matchB(q.branch) && inPeriod(q.depositDate || q.updatedAt || q.date || q.createdAt)).forEach(q => {
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

      const total = bCash + bInstapay + bVodafone + bVisa;
      return {
        ...b,
        cash: bCash,
        instapay: bInstapay,
        vodafone: bVodafone,
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
  }, [fInvoices, fQuotations, fCollections, invoices, collections, quotations, shifts, period]);

  // ─── Profits (real cost from inventory) ──────────────────────
  const profitStats = useMemo(() => {
    const itemCostMap = new Map<string, number>();
    inventory.forEach(it => {
      const cost = Number(it.costPrice) || 0;
      if (it.code) itemCostMap.set(it.code.trim().toLowerCase(), cost);
      if (it.name) itemCostMap.set(it.name.trim().toLowerCase(), cost);
    });

    let revenue = 0, cost = 0;
    const profitItemRows: any[] = [];

    fInvoices.forEach(inv => {
      revenue += Number(inv.totalAmount || 0);
      (inv.items || []).forEach((it: any) => {
        const key = (it.code || it.name || '').trim().toLowerCase();
        let c = itemCostMap.get(key);
        if (c === undefined && it.name) c = itemCostMap.get(it.name.trim().toLowerCase());
        if (c === undefined && it.code) c = itemCostMap.get(it.code.trim().toLowerCase());
        const unitCost = Number(c) || 0;
        const lineMeters = Number(it.meters) || 0;
        const lineRevenue = Number(it.totalPrice) || (lineMeters * (Number(it.pricePerMeter) || 0));
        const lineCost = lineMeters * unitCost;
        cost += lineCost;

        profitItemRows.push({
          invNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          date: inv.date,
          name: it.name || 'صنف',
          code: it.code || '—',
          meters: lineMeters,
          pricePerMeter: Number(it.pricePerMeter) || 0,
          unitCost,
          revenue: lineRevenue,
          cost: lineCost,
          profit: lineRevenue - lineCost,
          marginPct: lineRevenue > 0 ? ((lineRevenue - lineCost) / lineRevenue) * 100 : 0,
        });
      });
    });

    const profit = revenue - cost;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, marginPct, profitItemRows };
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
      .filter(c => inBranch((c as any).branch || (c as any).city))
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
    const bFilt = (i: InventoryItem) => inBranch(i.branch);
    const list = inventory.filter(bFilt);
    const belowMin = list.filter(i => (i.totalQuantity || 0) <= (i.minAlert || 0));
    const totalCost = list.reduce((s, i) => s + (i.totalQuantity || 0) * (i.costPrice || 0), 0);
    const totalValue = list.reduce((s, i) => s + (i.totalQuantity || 0) * (i.sellPrice || 0), 0);
    return { list, belowMin, totalCost, totalValue };
  }, [inventory, selectedBranch]);

  const periodLabel = period === 'yesterday' ? 'أمس' : period === 'today' ? 'اليومى' : period === 'thisWeek' ? 'الأسبوع' : period === 'thisMonth' ? 'الشهر' : 'الكل';
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
              {(['yesterday', 'today', 'thisWeek', 'thisMonth', 'all'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${period === p ? 'bg-amber-500 text-white' : 'text-slate-700'}`}>
                  {p === 'yesterday' ? 'أمس' : p === 'today' ? 'اليوم' : p === 'thisWeek' ? 'أسبوع' : p === 'thisMonth' ? 'شهر' : 'الكل'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="no-print flex border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'sales', label: 'المبيعات والدرج', icon: 'payments' },
            ...(isAdmin ? [{ id: 'profits', label: 'الأرباح والتكلفة', icon: 'trending_up' }] : []),
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
              {reportType === 'sales' && (
                <SalesReport
                  kpis={salesKpis}
                  invoices={fInvoices}
                  quotations={fQuotations}
                  collections={fCollections}
                  branchLabel={branchLabel}
                  periodLabel={periodLabel}
                  isAdmin={isAdmin}
                  userBranch={currentUser?.branch}
                  selectedBranch={selectedBranch}
                />
              )}
              {reportType === 'profits' && isAdmin && (
                <ProfitsReport stats={profitStats} topItems={topItems} branchLabel={branchLabel} periodLabel={periodLabel} />
              )}
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

function SalesReport({ kpis, invoices, quotations, collections, branchLabel, periodLabel, isAdmin, userBranch, selectedBranch }: any) {
  // Invoices table pagination & search
  const [invSearch, setInvSearch] = useState('');
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(25);

  const filteredInvoices = useMemo(() => {
    if (!invSearch.trim()) return invoices || [];
    const q = invSearch.trim().toLowerCase();
    return (invoices || []).filter((inv: SalesInvoice) =>
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.customerName || '').toLowerCase().includes(q) ||
      (inv.phone || '').includes(q) ||
      (inv.branch || '').toLowerCase().includes(q) ||
      (inv.paymentMethod || '').toLowerCase().includes(q)
    );
  }, [invoices, invSearch]);

  useEffect(() => {
    setInvPage(1);
  }, [invSearch, invPageSize, selectedBranch, periodLabel]);

  const pagedInvoices = useMemo(() => {
    if (invPageSize <= 0) return filteredInvoices;
    return filteredInvoices.slice((invPage - 1) * invPageSize, invPage * invPageSize);
  }, [filteredInvoices, invPage, invPageSize]);

  // Quotations table pagination
  const [qotPage, setQotPage] = useState(1);
  const [qotPageSize, setQotPageSize] = useState(25);
  const pagedQuotations = useMemo(() => {
    if (qotPageSize <= 0) return quotations || [];
    return (quotations || []).slice((qotPage - 1) * qotPageSize, qotPage * qotPageSize);
  }, [quotations, qotPage, qotPageSize]);

  // Collections table pagination
  const [colPage, setColPage] = useState(1);
  const [colPageSize, setColPageSize] = useState(25);
  const pagedCollections = useMemo(() => {
    if (colPageSize <= 0) return collections || [];
    return (collections || []).slice((colPage - 1) * colPageSize, colPage * colPageSize);
  }, [collections, colPage, colPageSize]);

  // تصفية الخزن: لو المستخدم أدمن ومحدد الكل تظهر الـ 4، لو مش أدمن تظهر خزنته فقط
  const visibleTreasuries = useMemo(() => {
    if (!kpis.branchTreasuries || !Array.isArray(kpis.branchTreasuries)) return [];

    if (isAdmin) {
      if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'الكل') {
        return kpis.branchTreasuries.filter((b: any) => {
          const s = String(selectedBranch || '').trim();
          if (b.key === 'الرئيسي') return s.includes('رئيسي') || s.includes('سعد زغلول');
          if (b.key === 'عرابي') return s.includes('عرابي') || s.includes('عدلي');
          if (b.key === 'عمر أفندي') return s.includes('عمر أفندي') || s.includes('عمر');
          if (b.key === 'الثلاثيني') return s.includes('الثلاثيني');
          return false;
        });
      }
      return kpis.branchTreasuries;
    }

    // موظف فرع: تظهر خزينة فرعه فقط
    const target = String(userBranch || '').trim();
    const filtered = kpis.branchTreasuries.filter((b: any) => {
      if (b.key === 'الرئيسي') return target.includes('رئيسي') || target.includes('سعد زغلول');
      if (b.key === 'عرابي') return target.includes('عرابي') || target.includes('عدلي');
      if (b.key === 'عمر أفندي') return target.includes('عمر أفندي') || target.includes('عمر');
      if (b.key === 'الثلاثيني') return target.includes('الثلاثيني');
      return false;
    });

    return filtered.length > 0 ? filtered : kpis.branchTreasuries.slice(0, 1);
  }, [kpis.branchTreasuries, isAdmin, userBranch, selectedBranch]);

  const showAllFour = isAdmin && (!selectedBranch || selectedBranch === 'ALL' || selectedBranch === 'الكل');

  return (
    <>
      <KpiStrip items={[
        { label: 'إجمالى المبيعات الشاملة', value: `${kpis.grand.toLocaleString()} ج`, color: 'bg-amber-100 border-amber-400' },
        { label: '💵 كاش بالدرج / الخزائن', value: `${kpis.cash.toLocaleString()} ج`, color: 'bg-emerald-50 border-emerald-300' },
        { label: '⚡ إنستاباى', value: `${kpis.instapay.toLocaleString()} ج`, color: 'bg-purple-50 border-purple-300' },
        { label: '📱 فودافون كاش', value: `${kpis.vodafone.toLocaleString()} ج`, color: 'bg-rose-50 border-rose-300' },
        { label: '💳 فيزا/كارت', value: `${kpis.visa.toLocaleString()} ج`, color: 'bg-blue-50 border-blue-300' },
        { label: '⏳ متبقي تحصيله (آجل وعقود)', value: `${kpis.remaining.toLocaleString()} ج`, color: 'bg-amber-50 border-amber-300' },
      ]} />

      {/* Breakdown Badges */}
      <div className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center gap-3">
        <span className="text-sky-950 bg-sky-100 border border-sky-300 px-2.5 py-1 rounded-lg">
          🏪 فواتير بيع الأقمشة: <span className="font-mono font-black">{kpis.fabricSalesGrand?.toLocaleString() || 0} ج</span> (محصل: <span className="font-mono text-emerald-800 font-bold">{kpis.fabricSalesPaid?.toLocaleString() || 0} ج</span>)
        </span>
        <span className="text-indigo-950 bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded-lg">
          ✂️ عقود وتفصيل الستائر: <span className="font-mono font-black">{kpis.curtainSalesGrand?.toLocaleString() || 0} ج</span> (عربابين: <span className="font-mono text-emerald-800 font-bold">{kpis.curtainSalesDeposits?.toLocaleString() || 0} ج</span>)
        </span>
        {(kpis.totalDirectCollections || 0) > 0 && (
          <span className="text-purple-950 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-lg">
            💰 سندات تحصيل عملاء مباشرة: <span className="font-mono font-black">{kpis.totalDirectCollections.toLocaleString()} ج</span>
          </span>
        )}
        {kpis.deferred > 0 && <span>مسجل كآجل: <span className="font-mono text-amber-700 font-black">{kpis.deferred.toLocaleString()} ج</span></span>}
        {kpis.other > 0 && <span>طرق أخرى: <span className="font-mono text-slate-700 font-black">{kpis.other.toLocaleString()} ج</span></span>}
      </div>

      {/* 🏛️ Branch Treasuries Live Summary */}
      {visibleTreasuries.length > 0 && (
        <div className="card bg-white rounded-2xl border border-slate-200 p-4 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-lg">savings</span>
              <h3 className="font-black text-xs text-slate-900">
                {showAllFour
                  ? `أرصدة خزن وورديات الفروع النقدية والمحصلة — (${periodLabel})`
                  : (visibleTreasuries.length > 1 && visibleTreasuries[0]?.key === 'عمر أفندي')
                    ? `ورديات فرع عمر أفندي (رصيد الصبح ورصيد بالليل) — (${periodLabel})`
                    : `رصيد ${visibleTreasuries[0]?.treasury || 'الخزينة'} — (${periodLabel})`}
              </h3>
            </div>
            <div className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              إجمالي {showAllFour ? 'كل الخزن والورديات' : 'الخزينة'}: <span className="text-emerald-700">{visibleTreasuries.reduce((s: number, b: any) => s + b.total, 0).toLocaleString()} ج.م</span>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${visibleTreasuries.length === 1 ? 'max-w-md' : visibleTreasuries.length === 2 ? 'sm:grid-cols-2 max-w-3xl' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'} gap-3`}>
            {visibleTreasuries.map((b: any, idx: number) => (
              <div key={idx} className={`p-3 rounded-xl border ${b.color} flex flex-col justify-between shadow-xs transition-all`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs text-slate-900 truncate">{b.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 text-slate-700">
                      {b.count} عملية
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-600 font-bold mb-1 truncate">{b.treasury}</div>

                  {b.isShift && (
                    <div className="flex items-center justify-between text-[10px] mb-2 px-1.5 py-0.5 rounded bg-white/70 border border-slate-200/80 font-bold">
                      <span className="text-slate-600">المسؤول: <strong className="text-slate-900">{b.employeeName}</strong></span>
                      <span className="text-[9.5px]">{b.shiftStatus}</span>
                    </div>
                  )}

                  <div className="bg-white/95 p-2.5 rounded-lg border border-slate-200 mb-2 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-bold">المحصل بالخزينة فى الفترة</div>
                    <div className="font-mono font-black text-lg text-emerald-700 mt-0.5">
                      {b.total.toLocaleString()} <span className="text-xs font-normal">ج</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-1.5 border-t border-slate-200/60 text-[10.5px]">
                  <div className="flex justify-between items-center text-slate-800 bg-white/75 px-2 py-1 rounded border border-slate-200 font-bold">
                    <span className="flex items-center gap-1">
                      <span>💵</span>
                      <span>كاش (الدرج):</span>
                    </span>
                    <strong className="font-mono text-slate-900">{b.cash.toLocaleString()} ج</strong>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1 text-[9.5px]">
                    <div className="bg-purple-50 border border-purple-200 rounded p-1 text-center">
                      <div className="text-purple-900 font-bold">⚡ إنستاباي</div>
                      <div className="font-mono font-black text-purple-700">{b.instapay.toLocaleString()}</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded p-1 text-center">
                      <div className="text-rose-900 font-bold">📱 فودافون</div>
                      <div className="font-mono font-black text-rose-700">{b.vodafone.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded p-1 text-center">
                      <div className="text-blue-900 font-bold">💳 فيزا</div>
                      <div className="font-mono font-black text-blue-700">{b.visa.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. Fabric Sales POS Invoices Table */}
      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 mb-2 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sky-600 text-sm">storefront</span>
              <span>فواتير بيع الأقمشة بالمتر ({invoices?.length || 0}) — {branchLabel} • {periodLabel}</span>
            </h3>
            <span className="text-[11px] font-mono font-bold text-emerald-700">
              (مقبوضات: {(kpis.fabricSalesPaid || 0).toLocaleString()} ج)
            </span>
          </div>

          <div className="no-print flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
                placeholder="بحث برقم الفاتورة أو العميل..."
                className="pr-7 pl-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none w-44 font-bold"
              />
            </div>
            <select
              value={invPageSize}
              onChange={e => setInvPageSize(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 cursor-pointer"
            >
              <option value={25}>25 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
              <option value={100}>100 لكل صفحة</option>
              <option value={0}>عرض الكل</option>
            </select>
          </div>
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
              {pagedInvoices.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-slate-400 font-bold">لا توجد فواتير بيع أقمشة مطابقة</td></tr>
              ) : pagedInvoices.map((inv: SalesInvoice) => (
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
                  <td colSpan={5} className="p-2 text-slate-900">إجمالي فواتير الأقمشة</td>
                  <td className="p-2 text-left font-mono">{(kpis.fabricSalesGrand || 0).toLocaleString()}</td>
                  <td className="p-2 text-left font-mono text-emerald-700">{(kpis.fabricSalesPaid || 0).toLocaleString()}</td>
                  <td className="p-2 text-left font-mono text-rose-700">{(kpis.fabricSalesRemaining || 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {invPageSize > 0 && filteredInvoices.length > invPageSize && (
          <div className="no-print mt-2">
            <Pagination
              currentPage={invPage}
              totalItems={filteredInvoices.length}
              pageSize={invPageSize}
              onPageChange={setInvPage}
              itemName="فاتورة"
            />
          </div>
        )}
      </div>

      {/* 2. Curtain Contracts & Quotations Table */}
      {quotations && quotations.length > 0 && (
        <div className="card bg-white rounded-2xl border border-slate-200 p-3">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
            <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo-600 text-sm">content_cut</span>
              <span>عقود وتفصيل الستائر والمقايسات ({quotations.length}) — {branchLabel} • {periodLabel}</span>
            </h3>
            <span className="text-[11px] font-mono font-bold text-emerald-700">عرابين الستائر المحصلة: {(kpis.curtainSalesDeposits || 0).toLocaleString()} ج</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px] border-collapse">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-2">رقم المقايسة</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">العميل</th>
                  <th className="p-2">الفرع</th>
                  <th className="p-2 text-center">طريقة العربون</th>
                  <th className="p-2 text-left font-mono">إجمالي العقد</th>
                  <th className="p-2 text-left font-mono">العربون المسدد</th>
                  <th className="p-2 text-left font-mono">المتبقي عند التركيب</th>
                </tr>
              </thead>
              <tbody>
                {pagedQuotations.map((q: any) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 font-mono font-bold text-slate-900">{q.id}</td>
                    <td className="p-2 font-mono text-slate-600">{q.date || q.createdAt ? formatDateOnly(q.date || q.createdAt) : '—'}</td>
                    <td className="p-2 font-bold text-slate-900">{q.customerName}</td>
                    <td className="p-2 text-slate-600">{q.branch || 'الرئيسي'}</td>
                    <td className="p-2 text-center text-[10px]">
                      {q.depositSplit ? (
                        <span className="bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded font-bold">متعدد</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded font-bold">{q.depositMethod || 'نقدي'}</span>
                      )}
                    </td>
                    <td className="p-2 text-left font-mono font-black">{(Number(q.totalAmount) || 0).toLocaleString()}</td>
                    <td className="p-2 text-left font-mono font-bold text-emerald-700">{(Number(q.depositPaid) || 0).toLocaleString()}</td>
                    <td className="p-2 text-left font-mono font-bold text-rose-700">{(Number(q.remainingAmount) || 0) > 0 ? (Number(q.remainingAmount)).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                <tr>
                  <td colSpan={5} className="p-2 text-slate-900">إجمالي عقود الستائر</td>
                  <td className="p-2 text-left font-mono">{(kpis.curtainSalesGrand || 0).toLocaleString()}</td>
                  <td className="p-2 text-left font-mono text-emerald-700">{(kpis.curtainSalesDeposits || 0).toLocaleString()}</td>
                  <td className="p-2 text-left font-mono text-rose-700">{(kpis.curtainSalesRemaining || 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {qotPageSize > 0 && quotations.length > qotPageSize && (
            <div className="no-print mt-2">
              <Pagination
                currentPage={qotPage}
                totalItems={quotations.length}
                pageSize={qotPageSize}
                onPageChange={setQotPage}
                itemName="عقد"
              />
            </div>
          )}
        </div>
      )}

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
              {!pagedCollections || pagedCollections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                    لا توجد سندات تحصيل مباشرة فى الفترة المحددة
                  </td>
                </tr>
              ) : pagedCollections.map((col: any) => {
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
                    <td className="p-2 font-bold text-slate-700">{col.treasury || 'خزينة الفرع الرئيسي (سعد زغلول)'}</td>
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

        {colPageSize > 0 && (collections?.length || 0) > colPageSize && (
          <div className="no-print mt-2">
            <Pagination
              currentPage={colPage}
              totalItems={collections.length}
              pageSize={colPageSize}
              onPageChange={setColPage}
              itemName="سند"
            />
          </div>
        )}
      </div>
    </>
  );
}

function ProfitsReport({ stats, topItems, branchLabel, periodLabel }: any) {
  const isNegative = Number(stats.profit) < 0;

  const [profitSearch, setProfitSearch] = useState('');
  const [profitPage, setProfitPage] = useState(1);
  const [profitPageSize, setProfitPageSize] = useState(25);

  const filteredProfitRows = useMemo(() => {
    const list = stats.profitItemRows || [];
    if (!profitSearch.trim()) return list;
    const q = profitSearch.trim().toLowerCase();
    return list.filter((r: any) =>
      (r.invNumber || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q)
    );
  }, [stats.profitItemRows, profitSearch]);

  useEffect(() => {
    setProfitPage(1);
  }, [profitSearch, profitPageSize]);

  const pagedProfitRows = useMemo(() => {
    if (profitPageSize <= 0) return filteredProfitRows;
    return filteredProfitRows.slice((profitPage - 1) * profitPageSize, profitPage * profitPageSize);
  }, [filteredProfitRows, profitPage, profitPageSize]);

  return (
    <>
      <KpiStrip items={[
        { label: 'إجمالى الإيرادات', value: `${stats.revenue.toLocaleString()} ج`, color: 'bg-amber-100 border-amber-400' },
        { label: 'تكلفة المبيعات', value: `${stats.cost.toLocaleString()} ج`, color: 'bg-rose-50 border-rose-300' },
        { label: 'صافى الربح', value: `${stats.profit.toLocaleString()} ج`, color: isNegative ? 'bg-rose-100 border-rose-400 text-rose-950 font-black' : 'bg-emerald-50 border-emerald-300' },
        { label: 'هامش الربح %', value: `${stats.marginPct.toFixed(1)}%`, color: isNegative ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-amber-50 border-amber-300' },
      ]} />

      {isNegative && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 text-xs font-bold text-rose-950 flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-600 text-lg">warning</span>
          <span>
            <strong>تنبيه الأرباح السالبة:</strong> صافي الربح بالسالب لوجود فواتير مسجلة بتكلفة أعلى من سعر البيع أو فواتير كُتب فيها الأمتار أو الأسعار بالخطأ. راجع جدول تحليل الأرباح التفصيلي بالأسفل لتحديد وتعديل الفاتورة المعنية.
          </span>
        </div>
      )}

      {stats.cost === 0 && stats.revenue > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-[11px] font-bold text-amber-900">
          ⚠️ لا توجد بيانات تكلفة للأصناف المباعة فى المخزون — أضف سعر التكلفة (costPrice) لكل صنف لعرض الربح الحقيقى.
        </div>
      )}

      {/* 📊 Detailed Profit Breakdown per Sold Item */}
      {stats.profitItemRows && stats.profitItemRows.length > 0 && (
        <div className="card bg-white rounded-2xl border border-slate-200 p-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-600 text-sm">analytics</span>
              <span>تحليل أرباح وتكلفة الأصناف المباعة ({stats.profitItemRows.length}) — {branchLabel} • {periodLabel}</span>
            </h3>

            <div className="no-print flex items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  value={profitSearch}
                  onChange={e => setProfitSearch(e.target.value)}
                  placeholder="بحث برقم الفاتورة أو الصنف..."
                  className="pr-7 pl-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none w-44 font-bold"
                />
              </div>
              <select
                value={profitPageSize}
                onChange={e => setProfitPageSize(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 cursor-pointer"
              >
                <option value={25}>25 لكل صفحة</option>
                <option value={50}>50 لكل صفحة</option>
                <option value={100}>100 لكل صفحة</option>
                <option value={0}>عرض الكل</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px] border-collapse">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-2">الفاتورة</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">الصنف</th>
                  <th className="p-2 text-center">الأمتار</th>
                  <th className="p-2 text-left font-mono">سعر البيع/م</th>
                  <th className="p-2 text-left font-mono">الإيراد</th>
                  <th className="p-2 text-left font-mono">تكلفة المتر</th>
                  <th className="p-2 text-left font-mono">إجمالي التكلفة</th>
                  <th className="p-2 text-left font-mono">صافي الربح</th>
                  <th className="p-2 text-center">الهامش %</th>
                </tr>
              </thead>
              <tbody>
                {pagedProfitRows.map((row: any, rIdx: number) => {
                  const itemNegative = row.profit < 0;
                  return (
                    <tr
                      key={rIdx}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${itemNegative ? 'bg-rose-50/70 font-bold text-rose-950' : ''}`}
                    >
                      <td className="p-2 font-mono font-bold text-slate-900">{row.invNumber}</td>
                      <td className="p-2 font-mono text-slate-500">{row.date ? formatDateOnly(row.date) : '—'}</td>
                      <td className="p-2 font-bold text-slate-900">{row.name}</td>
                      <td className="p-2 text-center font-mono font-bold">{row.meters}</td>
                      <td className="p-2 text-left font-mono">{row.pricePerMeter.toLocaleString()} ج</td>
                      <td className="p-2 text-left font-mono font-black text-slate-900">{row.revenue.toLocaleString()} ج</td>
                      <td className="p-2 text-left font-mono text-slate-600">{row.unitCost > 0 ? `${row.unitCost.toLocaleString()} ج` : '—'}</td>
                      <td className="p-2 text-left font-mono text-rose-800">{row.cost > 0 ? `${row.cost.toLocaleString()} ج` : '—'}</td>
                      <td className={`p-2 text-left font-mono font-black ${itemNegative ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {row.profit > 0 ? `+${row.profit.toLocaleString()}` : row.profit.toLocaleString()} ج
                      </td>
                      <td className="p-2 text-center font-mono font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${itemNegative ? 'bg-rose-200 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`}>
                          {row.marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                <tr>
                  <td colSpan={5} className="p-2 text-slate-900">المجموع الكلي</td>
                  <td className="p-2 text-left font-mono text-slate-950">{stats.revenue.toLocaleString()} ج</td>
                  <td></td>
                  <td className="p-2 text-left font-mono text-rose-800">{stats.cost.toLocaleString()} ج</td>
                  <td className={`p-2 text-left font-mono ${isNegative ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {stats.profit.toLocaleString()} ج
                  </td>
                  <td className="p-2 text-center font-mono">{stats.marginPct.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {profitPageSize > 0 && filteredProfitRows.length > profitPageSize && (
            <div className="no-print mt-2">
              <Pagination
                currentPage={profitPage}
                totalItems={filteredProfitRows.length}
                pageSize={profitPageSize}
                onPageChange={setProfitPage}
                itemName="صنف مباع"
              />
            </div>
          )}
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
  const [invSearch, setInvSearch] = useState('');
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(25);

  const filteredList = useMemo(() => {
    const list = alerts.list || [];
    if (!invSearch.trim()) return list;
    const q = invSearch.trim().toLowerCase();
    return list.filter((i: InventoryItem) =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.code || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.branch || '').toLowerCase().includes(q)
    );
  }, [alerts.list, invSearch]);

  useEffect(() => {
    setInvPage(1);
  }, [invSearch, invPageSize]);

  const pagedList = useMemo(() => {
    if (invPageSize <= 0) return filteredList;
    return filteredList.slice((invPage - 1) * invPageSize, invPage * invPageSize);
  }, [filteredList, invPage, invPageSize]);

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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <h3 className="font-black text-xs text-slate-900">
            كامل المخزون — {branchLabel} ({alerts.list.length} صنف)
          </h3>

          <div className="no-print flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
                placeholder="بحث باسم الصنف، الكود..."
                className="pr-7 pl-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none w-44 font-bold"
              />
            </div>
            <select
              value={invPageSize}
              onChange={e => setInvPageSize(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 cursor-pointer"
            >
              <option value={25}>25 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
              <option value={100}>100 لكل صفحة</option>
              <option value={0}>عرض الكل</option>
            </select>
          </div>
        </div>

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
                {pagedList.map((i: InventoryItem) => (
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

        {invPageSize > 0 && filteredList.length > invPageSize && (
          <div className="no-print mt-2">
            <Pagination
              currentPage={invPage}
              totalItems={filteredList.length}
              pageSize={invPageSize}
              onPageChange={setInvPage}
              itemName="صنف"
            />
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
  const [custSearch, setCustSearch] = useState('');
  const [custPage, setCustPage] = useState(1);
  const [custPageSize, setCustPageSize] = useState(25);

  const filteredCustDebts = useMemo(() => {
    const list = stats.custDebts || [];
    if (!custSearch.trim()) return list;
    const q = custSearch.trim().toLowerCase();
    return list.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [stats.custDebts, custSearch]);

  useEffect(() => {
    setCustPage(1);
  }, [custSearch, custPageSize]);

  const pagedCustDebts = useMemo(() => {
    if (custPageSize <= 0) return filteredCustDebts;
    return filteredCustDebts.slice((custPage - 1) * custPageSize, custPage * custPageSize);
  }, [filteredCustDebts, custPage, custPageSize]);

  return (
    <>
      <KpiStrip items={[
        { label: 'ديون العملاء (لنا)', value: `${stats.custTotalDebt.toLocaleString()} ج`, color: 'bg-rose-50 border-rose-300' },
        { label: 'رصيد للعملاء (علينا)', value: `${stats.custTotalCredit.toLocaleString()} ج`, color: 'bg-emerald-50 border-emerald-300' },
        { label: 'مستحقات الموردين', value: `${stats.supTotalDebt.toLocaleString()} ج`, color: 'bg-amber-50 border-amber-300' },
        { label: 'إجمالى المديونيات', value: `${(stats.custTotalDebt + stats.supTotalDebt).toLocaleString()} ج`, color: 'bg-amber-100 border-amber-400' },
      ]} />

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <h3 className="font-black text-xs text-slate-900">
            كشف ديون العملاء ({stats.custDebts.length}) — {branchLabel}
          </h3>

          <div className="no-print flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={custSearch}
                onChange={e => setCustSearch(e.target.value)}
                placeholder="بحث باسم العميل أو الهاتف..."
                className="pr-7 pl-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none w-44 font-bold"
              />
            </div>
            <select
              value={custPageSize}
              onChange={e => setCustPageSize(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 cursor-pointer"
            >
              <option value={25}>25 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
              <option value={100}>100 لكل صفحة</option>
              <option value={0}>عرض الكل</option>
            </select>
          </div>
        </div>

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
                {pagedCustDebts.map((c: any) => {
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

        {custPageSize > 0 && filteredCustDebts.length > custPageSize && (
          <div className="no-print mt-2">
            <Pagination
              currentPage={custPage}
              totalItems={filteredCustDebts.length}
              pageSize={custPageSize}
              onPageChange={setCustPage}
              itemName="عميل"
            />
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
