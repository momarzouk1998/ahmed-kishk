'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Link from 'next/link';

const stats = [
  { label: 'معاينات هذا الشهر', value: '24', icon: 'square_foot', color: 'bg-primary', desc: '+3 هذا الأسبوع' },
  { label: 'طلبات قيد التنفيذ', value: '8', icon: 'pending', color: 'bg-secondary', desc: '2 في الورشة' },
  { label: 'إجمالي العملاء', value: '142', icon: 'group', color: 'bg-primary-container', desc: '12 جديد الشهر' },
  { label: 'مبيعات القماش', value: '18,500 ج', icon: 'texture', color: 'bg-surface-container-highest', desc: 'هذا الشهر' },
];

const recentInspections = [
  { name: 'محمود عبد الرحمن', phone: '01012345678', address: 'التجمع الخامس', date: 'اليوم 4:00 م', status: 'مُجدول', stage: 'معاينة' },
  { name: 'سارة أحمد', phone: '01298765432', address: 'الشيخ زايد', date: 'غداً 2:00 م', status: 'قيد الانتظار', stage: 'معاينة' },
  { name: 'شركة المعمار', phone: '01155556666', address: 'المهندسين', date: 'أمس', status: 'مكتمل', stage: 'اختيار قماش' },
];

const quickSales = [
  { fabric: 'ستان سواريه', meters: 5.5, total: 2475 },
  { fabric: 'حرير طبيعي', meters: 3, total: 2700 },
  { fabric: 'كريب مزدوج', meters: 8, total: 2400 },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <Header title="لوحة التحكم" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-primary">مرحباً بك 👋</h1>
            <p className="text-on-surface-variant mt-1">نظام إدارة أحمد كشك للأقمشة والستائر — القاهرة</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container-highest shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${s.color} text-on-primary rounded-lg flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant font-mono">{s.label}</span>
                </div>
                <div className="font-display font-bold text-2xl text-primary">{s.value}</div>
                <div className="text-xs text-on-surface-variant mt-1">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Inspections */}
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display font-bold text-lg text-primary">آخر المعاينات</h2>
                <Link href="/inspections" className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors">عرض الكل ←</Link>
              </div>
              <div className="flex flex-col gap-3">
                {recentInspections.map((r, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                    <div>
                      <div className="font-bold text-sm text-primary">{r.name}</div>
                      <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {r.address} • {r.date}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                        r.status === 'مُجدول' ? 'bg-secondary-container text-on-secondary-container'
                        : r.status === 'مكتمل' ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant'
                      }`}>{r.status}</span>
                      <span className="text-xs text-on-surface-variant">{r.stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Fabric Sales */}
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display font-bold text-lg text-primary">مبيعات القماش السريعة</h2>
                <Link href="/fabric-sales" className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors">عرض الكل ←</Link>
              </div>
              <div className="flex flex-col gap-3">
                {quickSales.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
                    <div>
                      <div className="font-bold text-sm text-primary">{s.fabric}</div>
                      <div className="text-xs text-on-surface-variant font-mono">{s.meters} متر</div>
                    </div>
                    <div className="font-bold text-primary font-mono">{s.total.toLocaleString()} ج</div>
                  </div>
                ))}
              </div>
              <Link href="/fabric-sales/new" className="mt-4 flex items-center justify-center gap-2 w-full bg-secondary-container text-on-secondary-container py-3 rounded-lg text-sm font-bold hover:bg-secondary hover:text-on-secondary transition-colors">
                <span className="material-symbols-outlined text-[18px]">add</span>
                بيع قماش جديد
              </Link>
            </div>
          </div>

          {/* Stages Pipeline */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6">
            <h2 className="font-display font-bold text-lg text-primary mb-4">مراحل العمل (Pipeline)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { stage: 'معاينة', icon: 'home_search', count: 5, color: 'border-outline-variant' },
                { stage: 'اختيار قماش', icon: 'texture', count: 3, color: 'border-secondary' },
                { stage: 'ورشة', icon: 'precision_manufacturing', count: 2, color: 'border-on-surface-variant' },
                { stage: 'تركيب', icon: 'build', count: 1, color: 'border-primary' },
              ].map((p, i) => (
                <div key={i} className={`p-4 border-2 ${p.color} rounded-xl flex flex-col items-center gap-2`}>
                  <span className="material-symbols-outlined text-[28px] text-on-surface-variant">{p.icon}</span>
                  <div className="font-display font-bold text-xl text-primary">{p.count}</div>
                  <div className="text-xs text-on-surface-variant text-center">{p.stage}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
