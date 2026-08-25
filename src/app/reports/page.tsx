'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'sales' | 'profits' | 'inventory' | 'curtains' | 'ledgers'>('sales');
  const [period, setPeriod] = useState<'today' | 'thisMonth' | 'thisYear'>('thisMonth');

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <Header title="التقارير والإحصائيات الشاملة" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">التقارير والإحصائيات الشاملة</h1>
              <p className="text-on-surface-variant text-sm mt-1">
                تقارير مبيعات الأقمشة والستائر، صافي الأرباح، حركة المخزون وأداء الفنيين.
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex bg-surface-container-lowest border border-outline-variant p-1 rounded-lg">
              {[
                { id: 'today', label: 'اليوم' },
                { id: 'thisMonth', label: 'هذا الشهر' },
                { id: 'thisYear', label: 'هذه السنة' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-4 py-1.5 rounded-md text-xs font-mono transition-colors ${
                    period === p.id ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Report Type Tabs */}
          <div className="flex border-b border-surface-container-high overflow-x-auto">
            {[
              { id: 'sales', label: 'تقارير المبيعات', icon: 'payments' },
              { id: 'profits', label: 'تقارير الأرباح والتكلفة', icon: 'trending_up' },
              { id: 'inventory', label: 'حركة وحالة المخزون', icon: 'inventory_2' },
              { id: 'curtains', label: 'تقارير الستائر والفنيين', icon: 'square_foot' },
              { id: 'ledgers', label: 'ديون العملاء والموردين', icon: 'account_balance_wallet' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  reportType === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Report Content Panel */}
          {reportType === 'sales' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
                  <div className="text-xs font-mono text-on-surface-variant">مبيعات الأقمشة بالمتر</div>
                  <div className="font-display font-bold text-2xl text-primary mt-1">18,500 ج.م</div>
                  <div className="text-xs text-secondary mt-1">45 عملية بيع سريع</div>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
                  <div className="text-xs font-mono text-on-surface-variant">مبيعات فواتير الستائر</div>
                  <div className="font-display font-bold text-2xl text-primary mt-1">94,800 ج.م</div>
                  <div className="text-xs text-secondary mt-1">8 طلبات مكتملة ومجمعة</div>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
                  <div className="text-xs font-mono text-on-surface-variant">إجمالي المبيعات العامة</div>
                  <div className="font-display font-bold text-2xl text-primary mt-1">113,300 ج.م</div>
                  <div className="text-xs text-primary mt-1">+14% عن الشهر السابق</div>
                </div>
              </div>

              {/* Sales Table Breakdown */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6">
                <h3 className="font-bold text-base text-primary mb-4">المبيعات حسب الفرع والموظف</h3>
                <table className="w-full text-right text-sm">
                  <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant">
                    <tr>
                      <th className="p-3">الفرع</th>
                      <th className="p-3">نوع النشاط</th>
                      <th className="p-3 text-center">عدد العمليات</th>
                      <th className="p-3 text-left">إجمالي المبيعات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-surface-container-low">
                      <td className="p-3 font-bold text-primary">الفرع الرئيسي — القاهرة</td>
                      <td className="p-3 text-xs text-on-surface-variant">ستائر + أقمشة</td>
                      <td className="p-3 text-center font-mono">32</td>
                      <td className="p-3 text-left font-mono font-bold text-primary">78,500 ج</td>
                    </tr>
                    <tr className="border-b border-surface-container-low">
                      <td className="p-3 font-bold text-primary">فرع الأقمشة الثاني — القاهرة</td>
                      <td className="p-3 text-xs text-on-surface-variant">أقمشة فقط</td>
                      <td className="p-3 text-center font-mono">14</td>
                      <td className="p-3 text-left font-mono font-bold text-primary">21,400 ج</td>
                    </tr>
                    <tr className="border-b border-surface-container-low">
                      <td className="p-3 font-bold text-primary">فرع السوارية الثالث — القاهرة</td>
                      <td className="p-3 text-xs text-on-surface-variant">أقمشة سوارية</td>
                      <td className="p-3 text-center font-mono">7</td>
                      <td className="p-3 text-left font-mono font-bold text-primary">13,400 ج</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType === 'profits' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
                  <div className="text-xs font-mono text-on-surface-variant">إجمالي الإيرادات</div>
                  <div className="font-display font-bold text-2xl text-primary mt-1">113,300 ج.م</div>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
                  <div className="text-xs font-mono text-on-surface-variant">تكلفة المنسوجات والخامات</div>
                  <div className="font-display font-bold text-2xl text-error mt-1">74,200 ج.م</div>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
                  <div className="text-xs font-mono text-on-surface-variant">صافي الأرباح التقديرية</div>
                  <div className="font-display font-bold text-2xl text-secondary mt-1">39,100 ج.م</div>
                  <div className="text-xs text-secondary font-mono mt-1">هامش ربح ~34.5%</div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'inventory' && (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6 space-y-4">
              <h3 className="font-bold text-base text-primary">الأصناف الأكثر مبيعاً هذا الشهر</h3>
              <div className="space-y-3 text-sm">
                {[
                  { name: 'تول ناعم ستائر', metersSold: 140, totalVal: 16800 },
                  { name: 'ستان سواريه', metersSold: 85, totalVal: 38250 },
                  { name: 'بلاك آوت عازل ضوء', metersSold: 65, totalVal: 18200 },
                  { name: 'تراك سقف ألومنيوم', metersSold: 110, totalVal: 9350 },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
                    <div>
                      <div className="font-bold text-primary">{item.name}</div>
                      <div className="text-xs text-on-surface-variant font-mono">تم بيع {item.metersSold} متر</div>
                    </div>
                    <div className="font-mono font-bold text-primary">{item.totalVal.toLocaleString()} ج.م</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportType === 'curtains' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest">
                <h3 className="font-bold text-base text-primary mb-3">حالات المعاينات والطلبات</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span>إجمالي طلبات المعاينة</span>
                    <span className="font-mono font-bold">24 معاينة</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span>معاينات مكتملة (تم رفع المقاسات)</span>
                    <span className="font-mono font-bold text-primary">18 معاينة</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                    <span>طلبات تحولت لستائر منفذة</span>
                    <span className="font-mono font-bold text-secondary">12 طلب</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest">
                <h3 className="font-bold text-base text-primary mb-3">أداء الفنيين</h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-surface-container-low rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-bold text-primary">أحمد حسن</div>
                      <div className="text-xs text-on-surface-variant">14 معاينة • 8 تركيبات</div>
                    </div>
                    <span className="text-xs font-mono bg-primary-container px-2.5 py-1 rounded text-on-primary-container font-bold">ممتاز</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-bold text-primary">محمد علي</div>
                      <div className="text-xs text-on-surface-variant">10 معاينات • 4 تركيبات</div>
                    </div>
                    <span className="text-xs font-mono bg-primary-container px-2.5 py-1 rounded text-on-primary-container font-bold">جيد جداً</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'ledgers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest">
                <h3 className="font-bold text-base text-primary mb-3">ديون العملاء المستحقة</h3>
                <div className="font-display font-bold text-3xl text-error mb-4">12,600 ج.م</div>
                <div className="text-xs text-on-surface-variant">مسجلة على 2 عملاء آجل.</div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest">
                <h3 className="font-bold text-base text-primary mb-3">ديون الموردين المستحقة</h3>
                <div className="font-display font-bold text-3xl text-error mb-4">7,000 ج.م</div>
                <div className="text-xs text-on-surface-variant">مستحقة لـ 2 موردين.</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
