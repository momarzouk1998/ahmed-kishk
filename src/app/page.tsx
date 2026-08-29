'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { getStoredInspections, getStoredQuotations } from '@/lib/inspectionsStore';
import { getStoredPipelineOrders } from '@/lib/pipelineStore';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'MONTH' | 'WEEK' | 'TODAY'>('MONTH');

  const [rawInspections, setRawInspections] = useState<any[]>([]);
  const [rawQuotations, setRawQuotations] = useState<any[]>([]);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawInventory, setRawInventory] = useState<any[]>([]);
  const [rawCustomers, setRawCustomers] = useState<any[]>([]);
  const [rawFabricSales, setRawFabricSales] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [resIns, resQot, resOrd, resInv, resCust, resSales] = await Promise.all([
          fetch('/api/inspections', { cache: 'no-store' }).then(r => r.ok ? r.json() : { inspections: [] }).catch(() => ({ inspections: [] })),
          fetch('/api/pricing', { cache: 'no-store' }).then(r => r.ok ? r.json() : { quotations: [] }).catch(() => ({ quotations: [] })),
          fetch('/api/pipeline-orders', { cache: 'no-store' }).then(r => r.ok ? r.json() : { orders: [] }).catch(() => ({ orders: [] })),
          fetch('/api/inventory', { cache: 'no-store' }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
          fetch('/api/customers', { cache: 'no-store' }).then(r => r.ok ? r.json() : { customers: [] }).catch(() => ({ customers: [] })),
          fetch('/api/fabric-sales', { cache: 'no-store' }).then(r => r.ok ? r.json() : { invoices: [] }).catch(() => ({ invoices: [] })),
        ]);

        const ins = (resIns.success && Array.isArray(resIns.inspections)) ? resIns.inspections : getStoredInspections();
        const qot = (resQot.success && Array.isArray(resQot.quotations)) ? resQot.quotations : getStoredQuotations();
        const orders = (resOrd.success && Array.isArray(resOrd.orders)) ? resOrd.orders : getStoredPipelineOrders();
        const invItems = (resInv.success && Array.isArray(resInv.items)) ? resInv.items : [];
        const customers = (resCust.success && Array.isArray(resCust.customers)) ? resCust.customers : [];
        const sales = (resSales.success && Array.isArray(resSales.invoices)) ? resSales.invoices : [];

        setRawInspections(ins || []);
        setRawQuotations(qot || []);
        setRawOrders(orders || []);
        setRawInventory(invItems || []);
        setRawCustomers(customers || []);
        setRawFabricSales(sales || []);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
      }
    }

    loadDashboardData();
  }, []);

  // Helper to filter data by timeRange
  const filterByRange = (items: any[], dateField = 'createdAt') => {
    if (!items || items.length === 0) return [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return items.filter(item => {
      const d = item[dateField] || item.date || item.scheduledAt || item.createdAt;
      if (!d) return true;
      const itemDateStr = String(d).split('T')[0].split(' ')[0];

      if (timeRange === 'TODAY') {
        return itemDateStr === todayStr;
      }

      if (timeRange === 'WEEK') {
        const itemDate = new Date(itemDateStr);
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }

      if (timeRange === 'MONTH') {
        const itemDate = new Date(itemDateStr);
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
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

  // Dynamic Branch Sales Calculation (100% Real data)
  const branchList = [
    { name: 'الفرع الرئيسي (73 سعد زغلول)', type: 'ستائر وأقمشة تنجيد', key: 'الرئيسي' },
    { name: 'فرع عرابي (18 ش عدلي)', type: 'ستائر وأقمشة تنجيد', key: 'عرابي' },
    { name: 'فرع عمر أفندي', type: 'أقمشة فقط', key: 'عمر أفندي' },
    { name: 'فرع الثلاثيني', type: 'أقمشة فقط', key: 'الثلاثيني' },
  ];

  const dynamicBranchSales = branchList.map(b => {
    const bQot = rangedQuotations.filter((q: any) => q.branch && q.branch.includes(b.key));
    const bSales = rangedSales.filter((s: any) => s.branch && s.branch.includes(b.key));

    const totalSalesAmount = bQot.reduce((sum: number, q: any) => sum + (Number(q.totalAmount) || 0), 0)
      + bSales.reduce((sum: number, s: any) => sum + (Number(s.totalAmount) || 0), 0);

    const totalOps = bQot.length + bSales.length;
    const targetPercent = totalOps > 0 ? `${Math.min(100, totalOps * 25)}%` : '0%';

    return {
      name: b.name,
      type: b.type,
      sales: `${totalSalesAmount.toLocaleString()} ج`,
      orders: totalOps,
      target: targetPercent,
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
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left">
                      <div className="font-mono font-black text-base text-brand-gold-dark">{b.sales}</div>
                      <div className="text-[10px] text-emerald-800 font-bold">معدل الإنجاز {b.target}</div>
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
