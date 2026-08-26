'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'MONTH' | 'WEEK' | 'TODAY'>('MONTH');

  // Key Financial & Operational KPIs
  const financialStats = [
    { label: 'إجمالي مبيعات الشهر', value: '348,600 ج.م', icon: 'payments', bg: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200', change: '+14.2% عن الشهر السابق' },
    { label: 'عقود ستائر وتفصيل', value: '230,100 ج.م', icon: 'precision_manufacturing', bg: 'bg-amber-50 text-amber-900', border: 'border-amber-200', change: '18 طلب نشط بالورشة' },
    { label: 'مبيعات قماش بالمتر (POS)', value: '118,500 ج.م', icon: 'storefront', bg: 'bg-blue-50 text-blue-800', border: 'border-blue-200', change: '840 متر مباع' },
    { label: 'متبقي تحصيل عند التركيب', value: '42,800 ج.م', icon: 'account_balance_wallet', bg: 'bg-rose-50 text-rose-800', border: 'border-rose-200', change: 'ديون مستحقة للتحصيل' },
  ];

  // Pipeline Stages Progress Summary
  const pipelineStats = [
    { id: 1, title: '1. رفع المقاسات', count: 5, color: 'bg-amber-500', href: '/pipeline/inspections', desc: 'معاينات جارية' },
    { id: 2, title: '2. التسعير والعقد', count: 3, color: 'bg-blue-500', href: '/pipeline/pricing', desc: 'بانتظار سداد العربون' },
    { id: 3, title: '3. القص والتجهيز', count: 4, color: 'bg-indigo-500', href: '/pipeline/cutting', desc: 'أثواب قيد القص' },
    { id: 4, title: '4. الخياطة والتفصيل', count: 6, color: 'bg-purple-500', href: '/pipeline/tailoring', desc: 'ستائر بالورشة' },
    { id: 5, title: '5. الإكسسوارات', count: 3, color: 'bg-cyan-500', href: '/pipeline/accessories', desc: 'تجهيز المواسير' },
    { id: 6, title: '6. التركيب والتسليم', count: 2, color: 'bg-emerald-500', href: '/pipeline/installation', desc: 'زيارات مجدولة' },
  ];

  // 4 Official Branches Performance
  const branchPerformance = [
    { name: 'الفرع الرئيسي (73 سعد زغلول)', type: 'ستائر وأقمشة', sales: '164,200 ج', orders: 12, target: '92%' },
    { name: 'فرع عرابي (18 ش عدلي)', type: 'ستائر وأقمشة', sales: '98,400 ج', orders: 8, target: '84%' },
    { name: 'فرع عمر أفندي', type: 'أقمشة فقط', sales: '54,800 ج', orders: 36, target: '78%' },
    { name: 'فرع الثلاثيني', type: 'أقمشة فقط', sales: '31,200 ج', orders: 22, target: '70%' },
  ];

  // Fabric Category Stock Distribution
  const fabricStats = [
    { category: 'أقمشة سواريه وحرير', availableMeters: 445, reservedMeters: 80, salesAmount: '78,400 ج' },
    { category: 'قطيفة وكتان ستائر', availableMeters: 380, reservedMeters: 140, salesAmount: '112,000 ج' },
    { category: 'تول وشيفون ناعم', availableMeters: 620, reservedMeters: 210, salesAmount: '86,200 ج' },
    { category: 'بلاك آوت عازل 100%', availableMeters: 290, reservedMeters: 95, salesAmount: '72,000 ج' },
  ];

  return (
    <PageShell title="الرئيسية والتقارير التنفيذية">
      <div className="flex flex-col gap-6">
        {/* Concise Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900">
              التقرير التنفيذي الشامل والمؤشرات
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              متابعة الإيرادات، مراحل دورة الستائر، أداء الفروع الـ 4، وحركة المخزون.
            </p>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'MONTH' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setTimeRange('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'WEEK' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              onClick={() => setTimeRange('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'TODAY' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
          </div>
        </div>

        {/* 4 Main Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialStats.map((kpi, i) => (
            <div key={i} className={`bg-white rounded-2xl p-5 border ${kpi.border} shadow-soft flex flex-col justify-between`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-600">{kpi.label}</span>
                <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
                </div>
              </div>
              <div>
                <div className="font-display font-black text-2xl text-slate-900 font-mono tracking-tight">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">{kpi.change}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Curtain Pipeline Real-time Progress (6 Stages) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-soft">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-display font-black text-base text-slate-900">متابعة مراحل دورة الستائر بالورشة (Pipeline)</h2>
              <p className="text-xs text-slate-500 mt-0.5">توزيع الأوردرات الجارية في كل مرحلة من المعاينة حتى التسليم</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineStats.map((stage) => (
              <Link
                key={stage.id}
                href={stage.href}
                className="p-3.5 bg-slate-50 hover:bg-amber-50/50 rounded-2xl border border-slate-200 hover:border-brand-gold transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700 truncate">{stage.title}</span>
                  <span className={`w-2 h-2 rounded-full ${stage.color}`}></span>
                </div>
                <div>
                  <div className="font-mono font-black text-2xl text-slate-900 group-hover:text-brand-gold-dark">
                    {stage.count}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{stage.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2-Columns Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Branch Performance Report (4 Branches) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-soft">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display font-black text-base text-slate-900">تقرير مبيعات وأداء الفروع الأربعة</h2>
                <p className="text-xs text-slate-500 mt-0.5">إجمالي الإيرادات وعدد العمليات المنفذة لكل فرع</p>
              </div>
            </div>

            <div className="space-y-3">
              {branchPerformance.map((b, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{b.name}</div>
                    <span className="text-[11px] text-slate-500">{b.type} • {b.orders} عملية</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left">
                      <div className="font-mono font-black text-sm text-slate-900">{b.sales}</div>
                      <div className="text-[10px] text-emerald-700 font-bold">إنجاز {b.target}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory & Fabric Stock Balance Report */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-display font-black text-base text-slate-900">تقرير الأقمشة وحجز المخزون</h2>
                  <p className="text-xs text-slate-500 mt-0.5">الأمتار المتاحة والمحجوزة للورشة</p>
                </div>
                <Link href="/inventory" className="text-xs font-bold text-brand-gold-dark hover:underline">
                  المخزون ←
                </Link>
              </div>

              <div className="space-y-2.5">
                {fabricStats.map((f, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between items-center font-bold text-slate-900 mb-1">
                      <span>{f.category}</span>
                      <span className="font-mono text-slate-700">{f.salesAmount}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>متاح: <strong className="text-emerald-700 font-mono">{f.availableMeters}م</strong></span>
                      <span>محجوز للورشة: <strong className="text-amber-700 font-mono">{f.reservedMeters}م</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500">إجمالي الأمتار بالمخازن:</span>
              <span className="font-mono font-black text-slate-900 text-sm">2,180 متر</span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
