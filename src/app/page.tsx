'use client';

import React from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';

const stats = [
  { label: 'معاينات هذا الشهر', value: '24', icon: 'square_foot', bg: 'bg-amber-500/10 text-amber-600', border: 'border-amber-200', desc: '+4 هذا الأسبوع' },
  { label: 'أوامر تصنيع بالورشة', value: '8', icon: 'precision_manufacturing', bg: 'bg-slate-900/10 text-slate-800', border: 'border-slate-200', desc: '3 جاهزة للتركيب' },
  { label: 'إجمالي العملاء', value: '142', icon: 'groups', bg: 'bg-blue-500/10 text-blue-600', border: 'border-blue-200', desc: '12 عميل جديد' },
  { label: 'مبيعات الأقمشة بالمتر', value: '118,500 ج', icon: 'point_of_sale', bg: 'bg-emerald-500/10 text-emerald-600', border: 'border-emerald-200', desc: 'هذا الشهر' },
];

const recentInspections = [
  { name: 'محمود عبد الرحمن', phone: '01012345678', address: 'التجمع الخامس، فيلا 42', date: 'اليوم 4:00 م', status: 'مُجدول', stage: 'معاينة' },
  { name: 'سارة أحمد', phone: '01298765432', address: 'الشيخ زايد، بيفرلي هيلز', date: 'غداً 2:00 م', status: 'قيد الانتظار', stage: 'معاينة' },
  { name: 'شركة المعمار للمقاولات', phone: '01155556666', address: 'المهندسين، البطل أحمد عبد العزيز', date: 'أمس', status: 'مكتمل', stage: 'اختيار قماش' },
];

const quickSales = [
  { fabric: 'ستان سواريه ناعم', meters: 5.5, total: 2475, branch: 'الفرع الرئيسي' },
  { fabric: 'حرير طبيعي ممتاز', meters: 3.0, total: 2700, branch: 'فرع ثانٍ' },
  { fabric: 'كريب مزدوج أسباني', meters: 8.0, total: 2400, branch: 'الفرع الرئيسي' },
];

export default function DashboardPage() {
  return (
    <PageShell title="لوحة القيادة الرئيسية">
      <div className="flex flex-col gap-6 lg:gap-8">
        {/* Welcome Banner with Luxury Gold Accents */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-gold/20 text-brand-gold border border-brand-gold/30 inline-block mb-3">
                مرحباً بك في نظام أحمد كشك
              </span>
              <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
                إدارة الأقمشة وتفصيل الستائر الفاخرة
              </h1>
              <p className="text-slate-300 text-sm mt-2 max-w-xl">
                متابعة المعاينات الميدانية، رفع المقاسات الدقيقة، أوامر تشغيل الورشة، ونقاط بيع الأقمشة بالمتر لجميع الفروع.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Link
                href="/inspections"
                className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm transition-all shadow-gold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_box</span>
                طلب معاينة ومقاسات
              </Link>
              <Link
                href="/fabric-sales"
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                نقطة البيع (POS)
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s, i) => (
            <div key={i} className={`bg-white rounded-2xl p-4 sm:p-5 border ${s.border} shadow-soft hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500">{s.label}</span>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 ${s.bg} rounded-lg sm:rounded-xl flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{s.icon}</span>
                </div>
              </div>
              <div className="font-display font-black text-xl sm:text-2xl text-slate-900 break-words">{s.value}</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Recent Inspections */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-soft">
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <div>
                <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">أحدث طلبات المعاينة والمقاسات</h2>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">متابعة الفنيين ومواعيد زيارة العملاء</p>
              </div>
              <Link href="/inspections" className="text-xs font-bold text-brand-gold-dark hover:underline flex items-center gap-1 shrink-0">
                عرض الكل ←
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {recentInspections.map((r, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{r.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                      <span className="material-symbols-outlined text-[14px] shrink-0">location_on</span>
                      <span className="truncate">{r.address}</span>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:gap-1.5 justify-between sm:justify-start">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold whitespace-nowrap ${
                      r.status === 'مُجدول' ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : r.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : 'bg-slate-200 text-slate-800'
                    }`}>{r.status}</span>
                    <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">{r.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Fabric Sales & POS Widget */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 sm:mb-5">
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">مبيعات الأقمشة السريعة</h2>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">المبيعات المباشرة بالمتر</p>
                </div>
                <Link href="/fabric-sales" className="text-xs font-bold text-brand-gold-dark hover:underline shrink-0">
                  شاشة POS ←
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                {quickSales.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-3 sm:p-3.5 bg-slate-50 border border-slate-100 rounded-xl gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate">{s.fabric}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{s.meters} متر • {s.branch}</div>
                    </div>
                    <div className="font-bold text-slate-900 font-mono text-sm whitespace-nowrap">{s.total.toLocaleString()} ج.م</div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/fabric-sales"
              className="mt-6 flex items-center justify-center gap-2 w-full bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm font-bold shadow-gold transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
              فتح شاشة الكاشير وبيع القماش بالمتر
            </Link>
          </div>
        </div>

        {/* Stages Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-soft">
          <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 mb-1">دورة العمل والطلبات (Pipeline)</h2>
          <p className="text-xs text-slate-500 mb-4 sm:mb-5 hidden sm:block">مراحل تنفيذ طلبات الستائر من المعاينة حتى التركيب النهائي</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { stage: '1. رفع المقاسات والمعاينة', count: 5, icon: 'square_foot', color: 'border-amber-300 bg-amber-50/50 text-amber-900' },
              { stage: '2. اختيار الأقمشة والخامات', count: 3, icon: 'texture', color: 'border-blue-300 bg-blue-50/50 text-blue-900' },
              { stage: '3. الورشة المركزية للتفصيل', count: 2, icon: 'precision_manufacturing', color: 'border-purple-300 bg-purple-50/50 text-purple-900' },
              { stage: '4. التركيب النهائي والتسليم', count: 1, icon: 'build_circle', color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900' },
            ].map((p, i) => (
              <div key={i} className={`p-4 sm:p-5 border-2 ${p.color} rounded-2xl flex flex-col items-center text-center gap-2 shadow-xs`}>
                <span className="material-symbols-outlined text-[28px] sm:text-[32px]">{p.icon}</span>
                <div className="font-display font-black text-xl sm:text-2xl mt-1">{p.count} طلبات</div>
                <div className="text-[11px] sm:text-xs font-bold leading-tight">{p.stage}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
