'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { getStoredInspections, getStoredQuotations } from '@/lib/inspectionsStore';
import { getStoredPipelineOrders } from '@/lib/pipelineStore';
import { getTodayDateStr } from '@/lib/dateUtils';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'MONTH' | 'WEEK' | 'TODAY' | 'ALL'>('ALL');

  const [rawInspections, setRawInspections] = useState<any[]>([]);
  const [rawQuotations, setRawQuotations] = useState<any[]>([]);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawInventory, setRawInventory] = useState<any[]>([]);
  const [rawCustomers, setRawCustomers] = useState<any[]>([]);
  const [rawCollections, setRawCollections] = useState<any[]>([]);
  const [rawFabricSales, setRawFabricSales] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [resIns, resQot, resOrd, resInv, resCust, resSales] = await Promise.all([
          fetch('/api/inspections', { cache: 'no-store' }).then(r => r.ok ? r.json() : { inspections: [] }).catch(() => ({ inspections: [] })),
          fetch('/api/pricing', { cache: 'no-store' }).then(r => r.ok ? r.json() : { quotations: [] }).catch(() => ({ quotations: [] })),
          fetch('/api/pipeline-orders', { cache: 'no-store' }).then(r => r.ok ? r.json() : { orders: [] }).catch(() => ({ orders: [] })),
          fetch('/api/inventory', { cache: 'no-store' }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
          fetch('/api/customers', { cache: 'no-store' }).then(r => r.ok ? r.json() : { customers: [], collections: [] }).catch(() => ({ customers: [], collections: [] })),
          fetch('/api/fabric-sales', { cache: 'no-store' }).then(r => r.ok ? r.json() : { invoices: [] }).catch(() => ({ invoices: [] })),
        ]);

        const ins = (resIns.success && Array.isArray(resIns.inspections)) ? resIns.inspections : getStoredInspections();
        const qot = (resQot.success && Array.isArray(resQot.quotations)) ? resQot.quotations : getStoredQuotations();
        const orders = (resOrd.success && Array.isArray(resOrd.orders)) ? resOrd.orders : getStoredPipelineOrders();
        const invItems = (resInv.success && Array.isArray(resInv.items)) ? resInv.items : [];
        const customers = (resCust.success && Array.isArray(resCust.customers)) ? resCust.customers : [];
        const collections = (resCust.success && Array.isArray(resCust.collections)) ? resCust.collections : [];
        const sales = (resSales.success && Array.isArray(resSales.sales)) ? resSales.sales : [];

        setRawInspections(ins || []);
        setRawQuotations(qot || []);
        setRawOrders(orders || []);
        setRawInventory(invItems || []);
        setRawCustomers(customers || []);
        setRawCollections(collections || []);
        setRawFabricSales(sales || []);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
      }
    }

    loadDashboardData();
  }, []);

  // Helper to filter data by timeRange (Cairo local time 12:00 AM boundary)
  const filterByRange = (items: any[], dateField = 'createdAt') => {
    if (!items || items.length === 0) return [];
    if (timeRange === 'ALL') return items;
    const todayStr = getTodayDateStr();

    return items.filter(item => {
      const d = item[dateField] || item.date || item.scheduledAt || item.createdAt;
      if (!d) return true;
      const itemDateStr = getTodayDateStr(d) || String(d).split('T')[0].split(' ')[0];

      if (timeRange === 'TODAY') {
        return itemDateStr === todayStr;
      }

      if (timeRange === 'WEEK') {
        const itemDate = new Date(itemDateStr);
        const todayDate = new Date(todayStr);
        const diffDays = (todayDate.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }

      if (timeRange === 'MONTH') {
        return itemDateStr.substring(0, 7) === todayStr.substring(0, 7);
      }

      return true;
    });
  };

  const rangedQuotations = filterByRange(rawQuotations, 'date');
  const rangedSales = filterByRange(rawFabricSales, 'date');

  // Real KPI calculations
  const contractsSales = rangedQuotations.reduce((sum: number, q: any) => sum + (Number(q.totalAmount) || 0), 0);
  const posSales = rangedSales.reduce((sum: number, s: any) => sum + (Number(s.totalAmount) || 0), 0);
  const totalSales = contractsSales + posSales;

  const totalRemaining = rawCustomers.reduce((sum: number, c: any) => sum + (c.balance > 0 ? c.balance : 0), 0)
    || rawQuotations.reduce((sum: number, q: any) => sum + (Number(q.remainingAmount) || 0), 0);

  // Pipeline Stages Progress Summary (Live Dynamic)
  const pipelineStats = [
    {
      id: 1,
      title: '1. رفع المقاسات',
      count: rawInspections.filter((i: any) => i.status !== 'مكتمل').length,
      color: 'bg-amber-500',
      textLight: 'text-amber-800',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      href: '/pipeline/inspections',
      desc: 'معاينات جارية',
    },
    {
      id: 2,
      title: '2. التسعير والعقد',
      count: rawQuotations.length,
      color: 'bg-sky-500',
      textLight: 'text-sky-800',
      border: 'border-sky-200',
      bg: 'bg-sky-50',
      href: '/pipeline/pricing',
      desc: 'بانتظار العربون',
    },
    {
      id: 3,
      title: '3. قص القماش',
      count: rawOrders.filter((o: any) => o.status === 'في المقص' || o.status === 'قص القماش').length,
      color: 'bg-indigo-500',
      textLight: 'text-indigo-800',
      border: 'border-indigo-200',
      bg: 'bg-indigo-50',
      href: '/pipeline/cutting',
      desc: 'قيد القص بالورشة',
    },
    {
      id: 4,
      title: '4. الورشة والتفصيل',
      count: rawOrders.filter((o: any) => o.status === 'في الورشة').length,
      color: 'bg-purple-500',
      textLight: 'text-purple-800',
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      href: '/pipeline/tailoring',
      desc: 'ستائر تحت التشغيل',
    },
    {
      id: 5,
      title: '5. الإكسسوارات',
      count: rawOrders.filter((o: any) => o.status === 'تجهيز الاكسسوارات').length,
      color: 'bg-cyan-500',
      textLight: 'text-cyan-800',
      border: 'border-cyan-200',
      bg: 'bg-cyan-50',
      href: '/pipeline/accessories',
      desc: 'تجهيز المواسير والتراكات',
    },
    {
      id: 6,
      title: '6. التركيب والتسليم',
      count: rawOrders.filter((o: any) => o.status === 'جاهز للاستلام' || o.status === 'جاهز للتركيب').length,
      color: 'bg-emerald-500',
      textLight: 'text-emerald-800',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      href: '/pipeline/installation',
      desc: 'مواعيد التركيب والتسليم',
    },
  ];

  // Helper to match branch
  const matchBranch = (branchVal: any, branchKey: string) => {
    const s = String(branchVal || '').trim();
    if (branchKey === 'الرئيسي') return s.includes('رئيسي') || s.includes('سعد زغلول') || s.includes('القاهرة');
    if (branchKey === 'عرابي') return s.includes('عرابي') || s.includes('عدلي');
    if (branchKey === 'عمر أفندي') return s.includes('عمر أفندي') || s.includes('عمر افندي') || s.includes('عمر');
    if (branchKey === 'الثلاثيني') return s.includes('الثلاثيني');
    return false;
  };

  // Dynamic Branch Sales & Treasury Calculation (100% Real data)
  const branchList = [
    { name: 'الفرع الرئيسي (73 سعد زغلول)', treasuryName: 'خزينة الفرع الرئيسي (سعد زغلول)', type: 'ستائر وأقمشة تنجيد', key: 'الرئيسي', color: 'border-amber-300 bg-amber-50/70', badgeBg: 'bg-amber-100 text-amber-900 border-amber-300' },
    { name: 'فرع عرابي (18 ش عدلي)', treasuryName: 'خزينة فرع عرابي', type: 'ستائر وأقمشة تنجيد', key: 'عرابي', color: 'border-sky-300 bg-sky-50/70', badgeBg: 'bg-sky-100 text-sky-900 border-sky-300' },
    { name: 'فرع عمر أفندي', treasuryName: 'خزينة فرع عمر أفندي', type: 'أقمشة فقط', key: 'عمر أفندي', color: 'border-emerald-300 bg-emerald-50/70', badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { name: 'فرع الثلاثيني', treasuryName: 'خزينة فرع الثلاثيني', type: 'أقمشة فقط', key: 'الثلاثيني', color: 'border-purple-300 bg-purple-50/70', badgeBg: 'bg-purple-100 text-purple-900 border-purple-300' },
  ];

  const dynamicBranchSales = branchList.map(b => {
    const bQot = rangedQuotations.filter((q: any) => matchBranch(q.branch, b.key));
    const bSales = rangedSales.filter((s: any) => matchBranch(s.branch, b.key));
    const bCollections = filterByRange(rawCollections, 'date').filter((c: any) => {
      const treasury = c.treasury || '';
      if (matchBranch(treasury, b.key)) return true;
      const cust = rawCustomers.find(cust => cust.phone === c.phone || cust.name === c.customerName);
      if (cust && (cust.branch || cust.city) && matchBranch(cust.branch || cust.city, b.key)) return true;
      return false;
    });

    const totalSalesAmount = bQot.reduce((sum: number, q: any) => sum + (Number(q.totalAmount) || 0), 0)
      + bSales.reduce((sum: number, s: any) => sum + (Number(s.totalAmount) || 0), 0);

    const totalQuotAndPosCollected = bQot.reduce((sum: number, q: any) => sum + (Number(q.depositPaid) || 0), 0)
      + bSales.reduce((sum: number, s: any) => sum + (Number(s.paidAmount) || 0), 0);

    const totalDirectCollections = bCollections.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
    const totalCollectedAmount = totalQuotAndPosCollected + totalDirectCollections;

    const totalRemainingAmount = Math.max(0, totalSalesAmount - totalQuotAndPosCollected);

    const totalOps = bQot.length + bSales.length + bCollections.length;
    const collectionRate = totalSalesAmount > 0
      ? Math.round((totalCollectedAmount / totalSalesAmount) * 100)
      : (totalOps > 0 ? 100 : 0);

    // Calculate cash in treasury (POS cash + Split cash + Quotation deposits + customer collections)
    let treasuryCash = 0;
    let treasuryInstapay = 0;
    let treasuryVodafone = 0;
    let treasuryVisa = 0;

    bSales.forEach((s: any) => {
      let split = s.splitPayments;
      if (!split && s.notes && s.notes.includes('[SPLIT:')) {
        try {
          const match = s.notes.match(/\[SPLIT:([^\]]+)\]/);
          if (match && match[1]) split = JSON.parse(match[1]);
        } catch {}
      }
      if (split) {
        treasuryCash += Number(split.cash || 0);
        treasuryInstapay += Number(split.instapay || 0);
        treasuryVodafone += Number(split.vodafone || 0);
        treasuryVisa += Number(split.visa || 0);
      } else {
        const m = (s.paymentMethod || '').trim();
        const paid = Number(s.paidAmount || 0);
        if (m.includes('فودافون')) treasuryVodafone += paid;
        else if (m.includes('إنستا') || m.includes('انستا')) treasuryInstapay += paid;
        else if (m.includes('فيزا') || m.includes('كارت')) treasuryVisa += paid;
        else treasuryCash += paid;
      }
    });

    bQot.forEach((q: any) => {
      let split = q.depositSplit;
      if (!split && q.notes && q.notes.includes('[DEPOSIT_SPLIT:')) {
        try {
          const match = q.notes.match(/\[DEPOSIT_SPLIT:([^\]]+)\]/);
          if (match && match[1]) split = JSON.parse(match[1]);
        } catch {}
      }
      if (split) {
        treasuryCash += Number(split.cash || 0);
        treasuryInstapay += Number(split.instapay || 0);
        treasuryVodafone += Number(split.vodafone || 0);
        treasuryVisa += Number(split.visa || 0);
      } else {
        const m = (q.depositMethod || '').trim();
        const deposit = Number(q.depositPaid || 0);
        if (m.includes('فودافون')) treasuryVodafone += deposit;
        else if (m.includes('إنستا') || m.includes('انستا')) treasuryInstapay += deposit;
        else if (m.includes('فيزا') || m.includes('كارت')) treasuryVisa += deposit;
        else treasuryCash += deposit;
      }
    });

    bCollections.forEach((col: any) => {
      const amt = Number(col.amount || 0);
      const m = (col.method || '').trim();
      if (m.includes('فودافون')) treasuryVodafone += amt;
      else if (m.includes('إنستا') || m.includes('انستا')) treasuryInstapay += amt;
      else if (m.includes('فيزا') || m.includes('كارت')) treasuryVisa += amt;
      else treasuryCash += amt;
    });

    return {
      name: b.name,
      treasuryName: b.treasuryName,
      type: b.type,
      color: b.color,
      badgeBg: b.badgeBg,
      sales: `${totalSalesAmount.toLocaleString()} ج`,
      collected: `${totalCollectedAmount.toLocaleString()} ج`,
      remaining: `${totalRemainingAmount.toLocaleString()} ج`,
      orders: totalOps,
      target: `${collectionRate}% محصَّل`,
      rateNum: collectionRate,
      treasuryCash,
      treasuryInstapay,
      treasuryVodafone,
      treasuryVisa,
      treasuryTotal: totalCollectedAmount,
      directCollectionsCount: bCollections.length,
    };
  });

  // Dynamic Fabric Stock Breakdown Calculation
  const dynamicFabricStats = [
    {
      category: 'أقمشة سواريه وحرير',
      availableMeters: rawInventory.filter((i: any) => i.category?.includes('سواريه') || i.category?.includes('حرير') || i.name?.includes('حرير')).reduce((s: number, i: any) => s + (Number(i.totalQuantity) || 0), 0),
      reservedMeters: rawInventory.filter((i: any) => i.category?.includes('سواريه') || i.category?.includes('حرير') || i.name?.includes('حرير')).reduce((s: number, i: any) => s + (Number(i.reservedQuantity) || 0), 0),
      salesAmount: `${(rawInventory.filter((i: any) => i.category?.includes('سواريه') || i.category?.includes('حرير') || i.name?.includes('حرير')).reduce((s: number, i: any) => s + ((Number(i.totalQuantity) || 0) * (Number(i.sellPrice) || 0)), 0)).toLocaleString()} ج`,
    },
    {
      category: 'قطيفة وكتان ستائر',
      availableMeters: rawInventory.filter((i: any) => i.category?.includes('ستائر') || i.name?.includes('قطيفة') || i.name?.includes('كتان')).reduce((s: number, i: any) => s + (Number(i.totalQuantity) || 0), 0),
      reservedMeters: rawInventory.filter((i: any) => i.category?.includes('ستائر') || i.name?.includes('قطيفة') || i.name?.includes('كتان')).reduce((s: number, i: any) => s + (Number(i.reservedQuantity) || 0), 0),
      salesAmount: `${(rawInventory.filter((i: any) => i.category?.includes('ستائر') || i.name?.includes('قطيفة') || i.name?.includes('كتان')).reduce((s: number, i: any) => s + ((Number(i.totalQuantity) || 0) * (Number(i.sellPrice) || 0)), 0)).toLocaleString()} ج`,
    },
    {
      category: 'تول وشيفون ناعم',
      availableMeters: rawInventory.filter((i: any) => i.category?.includes('شيفون') || i.name?.includes('شيفون') || i.name?.includes('تول')).reduce((s: number, i: any) => s + (Number(i.totalQuantity) || 0), 0),
      reservedMeters: rawInventory.filter((i: any) => i.category?.includes('شيفون') || i.name?.includes('شيفون') || i.name?.includes('تول')).reduce((s: number, i: any) => s + (Number(i.reservedQuantity) || 0), 0),
      salesAmount: `${(rawInventory.filter((i: any) => i.category?.includes('شيفون') || i.name?.includes('شيفون') || i.name?.includes('تول')).reduce((s: number, i: any) => s + ((Number(i.totalQuantity) || 0) * (Number(i.sellPrice) || 0)), 0)).toLocaleString()} ج`,
    },
    {
      category: 'بلاك آوت عازل ضوء',
      availableMeters: rawInventory.filter((i: any) => i.category?.includes('بلاك') || i.name?.includes('بلاك')).reduce((s: number, i: any) => s + (Number(i.totalQuantity) || 0), 0),
      reservedMeters: rawInventory.filter((i: any) => i.category?.includes('بلاك') || i.name?.includes('بلاك')).reduce((s: number, i: any) => s + (Number(i.reservedQuantity) || 0), 0),
      salesAmount: `${(rawInventory.filter((i: any) => i.category?.includes('بلاك') || i.name?.includes('بلاك')).reduce((s: number, i: any) => s + ((Number(i.totalQuantity) || 0) * (Number(i.sellPrice) || 0)), 0)).toLocaleString()} ج`,
    },
  ];

  const totalWarehouseMeters = dynamicFabricStats.reduce((sum, f) => sum + f.availableMeters + f.reservedMeters, 0);

  const displaySales = totalSales.toLocaleString();
  const displayContracts = contractsSales.toLocaleString();
  const displayPos = posSales.toLocaleString();
  const displayRemaining = totalRemaining.toLocaleString();

  return (
    <PageShell title="الرئيسية والتقارير التنفيذية">
      <div className="flex flex-col gap-6">
        {/* Concise Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900">
              التقرير التنفيذي الشامل والمؤشرات
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 font-bold">
              متابعة الإيرادات، مراحل تنفيذ الستائر، أداء الفروع الأربعة، وحركة المخزون.
            </p>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 self-start sm:self-auto border border-slate-200">
            <button
              onClick={() => setTimeRange('ALL')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'ALL' ? 'bg-brand-gold text-slate-950 font-black shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setTimeRange('MONTH')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'MONTH' ? 'bg-brand-gold text-slate-950 font-black shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setTimeRange('WEEK')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'WEEK' ? 'bg-brand-gold text-slate-950 font-black shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              onClick={() => setTimeRange('TODAY')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === 'TODAY' ? 'bg-brand-gold text-slate-950 font-black shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
          </div>
        </div>

        {/* 4 Main Mbehje (Cheerful Colorful) KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sales */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-5 text-white shadow-lg border border-emerald-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold text-emerald-100">إجمالي المبيعات</span>
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-white">payments</span>
              </div>
            </div>
            <div>
              <div className="font-display font-black text-2xl tracking-tight">
                {displaySales} <span className="text-sm font-normal">ج.م</span>
              </div>
              <div className="text-[10px] text-emerald-100 font-bold mt-1.5">مبيعات نقدية وعقود معتمدة</div>
            </div>
          </div>

          {/* Card 2: Curtain Contracts */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-5 text-white shadow-lg border border-amber-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold text-amber-100">عقود تفصيل الستائر</span>
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-white">precision_manufacturing</span>
              </div>
            </div>
            <div>
              <div className="font-display font-black text-2xl tracking-tight text-white">
                {displayContracts} <span className="text-sm font-normal">ج.م</span>
              </div>
              <div className="text-[10px] text-amber-100 font-bold mt-1.5">{rangedQuotations.length} عقود مسجلة بالنظام</div>
            </div>
          </div>

          {/* Card 3: Fabric Sales POS */}
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-5 text-white shadow-lg border border-sky-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold text-sky-100">بيع القماش بالمتر (كاشير)</span>
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-white">storefront</span>
              </div>
            </div>
            <div>
              <div className="font-display font-black text-2xl tracking-tight">
                {displayPos} <span className="text-sm font-normal">ج.م</span>
              </div>
              <div className="text-[10px] text-sky-100 font-bold mt-1.5">فواتير بيع مباشر</div>
            </div>
          </div>

          {/* Card 4: Remaining Debts */}
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-5 text-white shadow-lg border border-rose-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold text-rose-100">المتبقي تحصيله عند التركيب</span>
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-white">account_balance_wallet</span>
              </div>
            </div>
            <div>
              <div className="font-display font-black text-2xl tracking-tight">
                {displayRemaining} <span className="text-sm font-normal">ج.م</span>
              </div>
              <div className="text-[10px] text-rose-100 font-bold mt-1.5">مبالغ وعقود قيد التنفيذ والتحصيل</div>
            </div>
          </div>
        </div>

        {/* 4 Branch Treasuries Live Balances (أرصدة خزن الفروع الأربعة) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-xl">savings</span>
                <h2 className="font-display font-black text-base text-slate-900">أرصدة خزن الفروع النقدية والتحصيل الحى</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">الرصيد الفعلى بالدرج/الخزينة لكل فرع مستقل (كاش، إنستاباي، فودافون، وفيزا)</p>
            </div>
            <div className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              إجمالي خزن الفروع: <span className="text-emerald-700">{dynamicBranchSales.reduce((s, b) => s + b.treasuryTotal, 0).toLocaleString()} ج.م</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dynamicBranchSales.map((b, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border ${b.color} flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-xs text-slate-900 truncate">{b.name}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                      {b.orders} عملية
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold mb-3 truncate">{b.treasuryName}</div>

                  <div className="bg-white/90 p-3 rounded-xl border border-slate-200/80 mb-3 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-bold">الرصيد المحصل بالخزينة</div>
                    <div className="font-display font-black text-xl text-emerald-700 tracking-tight mt-0.5">
                      {b.treasuryTotal.toLocaleString()} <span className="text-xs font-bold text-emerald-900">ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
                  <div className="flex justify-between items-center text-slate-700 bg-white/60 px-2 py-1 rounded-lg border border-slate-200/50">
                    <span className="flex items-center gap-1 font-bold">💵 كاش (الدرج):</span>
                    <span className="font-mono font-black text-slate-900">{b.treasuryCash.toLocaleString()} ج</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 text-[10px]">
                    <div className="bg-purple-50/80 border border-purple-200/80 rounded-lg p-1 text-center">
                      <div className="text-purple-900 font-bold">⚡ إنستاباي</div>
                      <div className="font-mono font-black text-purple-700">{b.treasuryInstapay.toLocaleString()}</div>
                    </div>
                    <div className="bg-rose-50/80 border border-rose-200/80 rounded-lg p-1 text-center">
                      <div className="text-rose-900 font-bold">📱 فودافون</div>
                      <div className="font-mono font-black text-rose-700">{b.treasuryVodafone.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-1 text-center">
                      <div className="text-blue-900 font-bold">💳 فيزا</div>
                      <div className="font-mono font-black text-blue-700">{b.treasuryVisa.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 pt-1.5 text-[10px]">
                    <span>معدل التحصيل: <strong className="text-amber-800 font-bold">{b.target}</strong></span>
                    {b.directCollectionsCount > 0 && (
                      <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {b.directCollectionsCount} سند تحصيل
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Curtain Pipeline Real-time Progress (6 Stages) - Vibrant UI */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-soft">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-display font-black text-base text-slate-900">متابعة مراحل التنفيذ بالورشة والتركيب</h2>
              <p className="text-xs text-slate-500 mt-0.5">توزيع الأوردرات النشطة حسب كل مرحلة تشغيلية</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineStats.map((stage) => (
              <Link
                key={stage.id}
                href={stage.href}
                className={`p-3.5 rounded-2xl border ${stage.border} ${stage.bg} hover:scale-[1.02] transition-all flex flex-col justify-between group cursor-pointer shadow-xs`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-black ${stage.textLight} truncate`}>{stage.title}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`}></span>
                </div>
                <div>
                  <div className={`font-mono font-black text-2xl ${stage.textLight}`}>
                    {stage.count}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{stage.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Branch Performance Report (4 Branches) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-soft">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display font-black text-base text-slate-900">تقرير المبيعات والنشاط للفروع الأربعة</h2>
                <p className="text-xs text-slate-500 mt-0.5">مبيعات كل فرع وعدد العمليات التي تمت بنجاح</p>
              </div>
            </div>

            <div className="space-y-3">
              {dynamicBranchSales.map((b, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/50 transition-colors">
                  <div>
                    <div className="font-black text-sm text-slate-900">{b.name}</div>
                    <span className="text-[11px] text-slate-500 font-bold">{b.type} • {b.orders} عملية</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                    <div className="text-right sm:text-left">
                      <div className="text-[10px] text-slate-500 font-bold">إجمالي المبيعات / العقود</div>
                      <div className="font-mono font-black text-sm text-slate-900">{b.sales}</div>
                    </div>
                    <div className="text-right sm:text-left bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-800 font-bold">المحصَّل بالدرج</div>
                      <div className="font-mono font-black text-xs text-emerald-700">{b.collected}</div>
                    </div>
                    <div className="text-right sm:text-left bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      <div className="text-[10px] text-amber-800 font-bold">{b.target}</div>
                      <div className="font-mono font-bold text-[10px] text-amber-900">آجل: {b.remaining}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Report */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-display font-black text-base text-slate-900">تقرير الأقمشة وحجز المخازن</h2>
                  <p className="text-xs text-slate-500 mt-0.5">متابعة الأمتار المتاحة والمحجوزة للستائر</p>
                </div>
                <Link href="/inventory" className="text-xs font-bold text-brand-gold-dark hover:underline">
                  إدارة المخزن ←
                </Link>
              </div>

              <div className="space-y-2.5">
                {dynamicFabricStats.map((f, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-center font-bold text-slate-900 mb-1.5">
                      <span>{f.category}</span>
                      <span className="font-mono text-brand-gold-dark font-black">{f.salesAmount}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px] font-medium">
                      <span>المتاح للبيع: <strong className="text-emerald-700 font-mono">{f.availableMeters} متر</strong></span>
                      <span>المحجوز للتفصيل: <strong className="text-amber-700 font-mono">{f.reservedMeters} متر</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500">إجمالي أمتار المخزن:</span>
              <span className="font-mono font-black text-slate-900 text-sm">{totalWarehouseMeters.toLocaleString()} متر</span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
