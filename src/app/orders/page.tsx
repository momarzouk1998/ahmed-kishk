'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const demoOrders = [
  { id: 'ORD-001', customer: 'محمود عبد الرحمن', phone: '01012345678', stage: 'اختيار قماش', total: 12600, date: '2026-08-24', technician: 'أحمد حسن', installDate: '2026-09-05', branch: 'الفرع الرئيسي — القاهرة', notes: 'صالة + غرفة نوم' },
  { id: 'ORD-002', customer: 'شركة المعمار', phone: '01155556666', stage: 'ورشة', total: 28400, date: '2026-08-20', technician: 'محمد علي', installDate: '2026-09-10', branch: 'الفرع الرئيسي — القاهرة', notes: '6 غرف' },
  { id: 'ORD-003', customer: 'أسرة محمود سعيد', phone: '01099887766', stage: 'تركيب', total: 7800, date: '2026-08-18', technician: 'علي إبراهيم', installDate: '2026-08-27', branch: 'فرع ثانٍ — القاهرة', notes: 'صالة فقط' },
  { id: 'ORD-004', customer: 'نادي الأحمدي', phone: '01033445566', stage: 'مكتمل', total: 54000, date: '2026-08-10', technician: 'أحمد حسن', installDate: '2026-08-20', branch: 'الفرع الرئيسي — القاهرة', notes: 'قاعة اجتماعات كبرى' },
];

const stages = ['اختيار قماش', 'ورشة', 'تركيب', 'مكتمل'];

const stageStyle: Record<string, string> = {
  'اختيار قماش': 'bg-secondary-container text-on-secondary-container',
  'ورشة': 'bg-surface-container-highest text-on-surface',
  'تركيب': 'bg-primary-container text-on-primary-container',
  'مكتمل': 'bg-primary text-on-primary',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState(demoOrders);
  const [filter, setFilter] = useState('الكل');
  const [selected, setSelected] = useState(demoOrders[0]);

  const filtered = filter === 'الكل' ? orders : orders.filter(o => o.stage === filter);

  const advanceStage = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const idx = stages.indexOf(o.stage);
      return { ...o, stage: idx < stages.length - 1 ? stages[idx + 1] : o.stage };
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title="الطلبات (Pipeline)" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">الطلبات ومراحل العمل</h1>
              <p className="text-on-surface-variant text-sm mt-1">تتبع كل طلب من اختيار القماش حتى التركيب النهائي.</p>
            </div>
          </div>

          {/* Kanban Summary */}
          <div className="grid grid-cols-4 gap-4">
            {stages.map(s => {
              const count = orders.filter(o => o.stage === s).length;
              const total = orders.filter(o => o.stage === s).reduce((sum, o) => sum + o.total, 0);
              return (
                <div key={s} className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-4 text-center">
                  <div className={`text-xs px-2 py-1 rounded font-mono mb-2 inline-block ${stageStyle[s]}`}>{s}</div>
                  <div className="font-display font-bold text-2xl text-primary">{count}</div>
                  <div className="text-xs text-on-surface-variant">{total.toLocaleString()} ج.م</div>
                </div>
              );
            })}
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['الكل', ...stages].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-mono border transition-colors ${filter === f ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'}`}>{f}</button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant">
                <tr>
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">الفرع</th>
                  <th className="p-4">الفني</th>
                  <th className="p-4">موعد التركيب</th>
                  <th className="p-4 text-center">المرحلة</th>
                  <th className="p-4 text-left">الإجمالي</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="border-t border-surface-container-low hover:bg-surface-container-low cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-on-surface-variant">{o.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-sm text-primary">{o.customer}</div>
                      <div className="text-xs text-on-surface-variant">{o.phone}</div>
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant">{o.branch}</td>
                    <td className="p-4 text-sm text-on-surface-variant">{o.technician}</td>
                    <td className="p-4 text-sm font-mono text-on-surface-variant">{o.installDate}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-mono ${stageStyle[o.stage]}`}>{o.stage}</span>
                    </td>
                    <td className="p-4 text-left font-mono font-bold text-primary">{o.total.toLocaleString()} ج</td>
                    <td className="p-4">
                      {o.stage !== 'مكتمل' && (
                        <button
                          onClick={e => { e.stopPropagation(); advanceStage(o.id); }}
                          className="text-xs bg-primary-container text-on-primary-container px-3 py-1.5 rounded hover:bg-primary hover:text-on-primary transition-colors font-mono"
                        >
                          التالي →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6">
              <h2 className="font-bold text-lg text-primary mb-4">تفاصيل — {selected.id}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'العميل', value: selected.customer },
                  { label: 'التليفون', value: selected.phone },
                  { label: 'الفني', value: selected.technician },
                  { label: 'موعد التركيب', value: selected.installDate },
                  { label: 'الفرع', value: selected.branch },
                  { label: 'تاريخ الطلب', value: selected.date },
                  { label: 'الملاحظات', value: selected.notes },
                  { label: 'الإجمالي', value: `${selected.total.toLocaleString()} ج.م` },
                ].map((d, i) => (
                  <div key={i} className="bg-surface-container-low rounded-lg p-3">
                    <div className="text-xs font-mono text-on-surface-variant">{d.label}</div>
                    <div className="font-bold text-primary text-sm mt-1">{d.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
