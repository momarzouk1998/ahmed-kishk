'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface OrderItem {
  id: string;
  customer: string;
  phone: string;
  stage: 'اختيار قماش' | 'ورشة' | 'تركيب' | 'مكتمل';
  total: number;
  paid: number;
  date: string;
  technician: string;
  installDate: string;
  branch: string;
  notes: string;
}

const initialOrders: OrderItem[] = [
  {
    id: 'ORD-001',
    customer: 'محمود عبد الرحمن',
    phone: '01012345678',
    stage: 'اختيار قماش',
    total: 12600,
    paid: 10000,
    date: '2026-08-24',
    technician: 'أحمد حسن',
    installDate: '2026-09-05',
    branch: 'الفرع الرئيسي — القاهرة',
    notes: 'صالة بلكونة (مجرى سقف) + غرفة نوم رئيسية'
  },
  {
    id: 'ORD-002',
    customer: 'شركة المعمار',
    phone: '01155556666',
    stage: 'ورشة',
    total: 28400,
    paid: 18400,
    date: '2026-08-20',
    technician: 'محمد علي',
    installDate: '2026-09-10',
    branch: 'الفرع الرئيسي — القاهرة',
    notes: '6 غرف مكاتب — بلاك آوت عازل 100%'
  },
  {
    id: 'ORD-003',
    customer: 'أسرة محمود سعيد',
    phone: '01099887766',
    stage: 'تركيب',
    total: 7800,
    paid: 7800,
    date: '2026-08-18',
    technician: 'علي إبراهيم',
    installDate: '2026-08-27',
    branch: 'فرع ثانٍ — القاهرة',
    notes: 'صالة فقط — مواسير استيل مذهبة'
  },
  {
    id: 'ORD-004',
    customer: 'نادي الأحمدي',
    phone: '01033445566',
    stage: 'مكتمل',
    total: 54000,
    paid: 54000,
    date: '2026-08-10',
    technician: 'أحمد حسن',
    installDate: '2026-08-20',
    branch: 'الفرع الرئيسي — القاهرة',
    notes: 'قاعة اجتماعات كبرى'
  },
];

const stages: ('اختيار قماش' | 'ورشة' | 'تركيب' | 'مكتمل')[] = ['اختيار قماش', 'ورشة', 'تركيب', 'مكتمل'];

const stageStyle: Record<string, string> = {
  'اختيار قماش': 'bg-secondary-container text-on-secondary-container',
  'ورشة': 'bg-surface-container-highest text-on-surface',
  'تركيب': 'bg-primary-container text-on-primary-container',
  'مكتمل': 'bg-primary text-on-primary',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [filter, setFilter] = useState('الكل');
  const [selected, setSelected] = useState<OrderItem>(initialOrders[0]);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<'اختيار قماش' | 'ورشة' | 'تركيب' | 'مكتمل'>('اختيار قماش');
  const [total, setTotal] = useState<number>(10000);
  const [paid, setPaid] = useState<number>(5000);
  const [technician, setTechnician] = useState('أحمد حسن');
  const [installDate, setInstallDate] = useState('2026-09-01');
  const [branch, setBranch] = useState('الفرع الرئيسي — القاهرة');
  const [notes, setNotes] = useState('');

  const filtered = filter === 'الكل' ? orders : orders.filter(o => o.stage === filter);

  // Advance stage
  const advanceStage = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const idx = stages.indexOf(o.stage);
      const next = idx < stages.length - 1 ? stages[idx + 1] : o.stage;
      const updated = { ...o, stage: next };
      if (selected.id === id) setSelected(updated);
      return updated;
    }));
  };

  // Open Edit Modal
  const openEdit = (order: OrderItem) => {
    setCustomer(order.customer);
    setPhone(order.phone);
    setStage(order.stage);
    setTotal(order.total);
    setPaid(order.paid);
    setTechnician(order.technician);
    setInstallDate(order.installDate);
    setBranch(order.branch);
    setNotes(order.notes);
    setShowEditModal(true);
  };

  // Save new order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !phone) return;
    const newOrd: OrderItem = {
      id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      customer,
      phone,
      stage,
      total,
      paid,
      date: new Date().toISOString().split('T')[0],
      technician,
      installDate,
      branch,
      notes,
    };
    setOrders([newOrd, ...orders]);
    setSelected(newOrd);
    setShowNewModal(false);
  };

  // Save edited order
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: OrderItem = {
      ...selected,
      customer,
      phone,
      stage,
      total,
      paid,
      technician,
      installDate,
      branch,
      notes,
    };
    setOrders(prev => prev.map(o => o.id === selected.id ? updated : o));
    setSelected(updated);
    setShowEditModal(false);
  };

  return (
    <PageShell title="الطلبات (Pipeline) والورشة">
      <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-primary">الطلبات ومراحل العمل</h1>
              <p className="text-on-surface-variant text-xs sm:text-sm mt-1">متابعة وتعديل أوامر التصنيع والتركيب وحالات التسليم.</p>
            </div>
            <button
              onClick={() => {
                setCustomer(''); setPhone(''); setStage('اختيار قماش'); setTotal(12000); setPaid(6000);
                setNotes(''); setShowNewModal(true);
              }}
              className="bg-primary text-on-primary px-4 sm:px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-xs sm:text-sm shadow w-full sm:w-auto justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              إنشاء طلب / أوردر جديد
            </button>
          </div>

          {/* Kanban Stage Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stages.map(s => {
              const count = orders.filter(o => o.stage === s).length;
              const totalAmount = orders.filter(o => o.stage === s).reduce((sum, o) => sum + o.total, 0);
              return (
                <div
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`bg-surface-container-lowest rounded-xl border p-4 text-center cursor-pointer transition-all ${
                    filter === s ? 'border-primary shadow-md' : 'border-surface-container-highest hover:border-outline-variant'
                  }`}
                >
                  <div className={`text-xs px-2.5 py-1 rounded font-mono mb-2 inline-block ${stageStyle[s]}`}>{s}</div>
                  <div className="font-display font-bold text-2xl text-primary">{count}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{totalAmount.toLocaleString()} ج.م</div>
                </div>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex gap-2 flex-wrap">
            {['الكل', ...stages].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono border transition-colors ${filter === f ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Table & Details Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Orders Table */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[680px]">
                <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant">
                  <tr>
                    <th className="p-3.5">الطلب</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">الفني</th>
                    <th className="p-3.5">موعد التركيب</th>
                    <th className="p-3.5 text-center">المرحلة</th>
                    <th className="p-3.5 text-left">الإجمالي</th>
                    <th className="p-3.5 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className={`border-t border-surface-container-low hover:bg-surface-container-low cursor-pointer transition-colors ${
                        selected?.id === o.id ? 'bg-primary-container/20 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3.5 font-mono text-xs text-on-surface-variant">{o.id}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-primary">{o.customer}</div>
                        <div className="text-xs text-on-surface-variant font-mono" dir="ltr">{o.phone}</div>
                      </td>
                      <td className="p-3.5 text-xs text-on-surface-variant">{o.technician}</td>
                      <td className="p-3.5 text-xs font-mono text-on-surface-variant">{o.installDate}</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono ${stageStyle[o.stage]}`}>{o.stage}</span>
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-primary">{o.total.toLocaleString()} ج</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(o); }}
                            className="p-1 text-on-surface-variant hover:text-primary rounded"
                            title="تعديل الأوردر"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {o.stage !== 'مكتمل' && (
                            <button
                              onClick={e => { e.stopPropagation(); advanceStage(o.id); }}
                              className="text-xs bg-primary-container text-on-primary-container px-2.5 py-1 rounded hover:bg-primary hover:text-on-primary transition-colors font-mono"
                              title="نقل للمرحلة التالية"
                            >
                              التالي →
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Selected Order Card / Statement */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-surface-container-highest p-4 sm:p-6 lg:sticky lg:top-20">
              {selected ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start border-b border-surface-container-high pb-3">
                    <div>
                      <span className="text-xs font-mono text-on-surface-variant">{selected.id}</span>
                      <h2 className="font-bold text-lg text-primary">{selected.customer}</h2>
                      <p className="text-xs text-on-surface-variant" dir="ltr">{selected.phone}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded font-mono ${stageStyle[selected.stage]}`}>{selected.stage}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                      <span className="text-on-surface-variant">الفرع</span>
                      <span className="font-bold text-primary">{selected.branch}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                      <span className="text-on-surface-variant">الفني المسؤول</span>
                      <span className="font-bold text-primary">{selected.technician}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                      <span className="text-on-surface-variant">موعد التركيب</span>
                      <span className="font-bold text-primary font-mono">{selected.installDate}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                      <span className="text-on-surface-variant">إجمالي القيمة</span>
                      <span className="font-bold text-primary font-mono text-sm">{selected.total.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                      <span className="text-on-surface-variant">المسدد (الدفعة)</span>
                      <span className="font-bold text-primary font-mono">{selected.paid.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                      <span className="text-on-surface-variant">المتبقي عند التركيب</span>
                      <span className={`font-bold font-mono ${selected.total - selected.paid > 0 ? 'text-error' : 'text-primary'}`}>
                        {(selected.total - selected.paid).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>

                  {selected.notes && (
                    <div className="bg-surface-container-low p-3 rounded-lg text-xs">
                      <span className="text-on-surface-variant font-mono block mb-1">تفاصيل وملاحظات:</span>
                      <p className="text-primary">{selected.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openEdit(selected)}
                      className="flex-1 bg-primary text-on-primary py-2 rounded-lg text-xs font-bold hover:bg-inverse-surface transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      تعديل بيانات الأوردر
                    </button>
                    {selected.stage !== 'مكتمل' && (
                      <button
                        onClick={() => advanceStage(selected.id)}
                        className="flex-1 bg-secondary-container text-on-secondary-container py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-colors flex items-center justify-center gap-1"
                      >
                        نقل للمرحلة التالية →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-on-surface-variant text-sm">اختر طلباً لعرض تفاصيله.</div>
              )}
            </div>
          </div>
      </div>

      {/* Modal 1: Create Order */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-primary mb-4">إنشاء طلب / أوردر ستائر جديد</h2>
            <form onSubmit={handleCreateOrder} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">اسم العميل *</label>
                  <input value={customer} onChange={e => setCustomer(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">رقم الهاتف *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary" dir="ltr" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">المرحلة الحالية</label>
                  <select value={stage} onChange={e => setStage(e.target.value as any)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary">
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الفني المسؤول</label>
                  <select value={technician} onChange={e => setTechnician(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary">
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                    <option>علي إبراهيم</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">إجمالي القيمة (ج.م) *</label>
                  <input type="number" value={total} onChange={e => setTotal(Number(e.target.value))} className="border border-outline-variant rounded p-2 text-sm font-mono focus:outline-none focus:border-primary" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">المدفوع مقدماً (ج.م)</label>
                  <input type="number" value={paid} onChange={e => setPaid(Number(e.target.value))} className="border border-outline-variant rounded p-2 text-sm font-mono focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">موعد التركيب المتوقع</label>
                  <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الفرع</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary">
                    <option>الفرع الرئيسي — القاهرة</option>
                    <option>فرع ثانٍ — القاهرة</option>
                    <option>فرع ثالث — القاهرة</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">ملاحظات وتفاصيل الغرف</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary h-20 resize-none" placeholder="تفاصيل الخامات، التراكات، الإكسسوارات..." />
              </div>

              <div className="flex gap-2 mt-3">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">حفظ الطلب</button>
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Order */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-primary mb-4">تعديل بيانات الأوردر — {selected.id}</h2>
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">اسم العميل *</label>
                  <input value={customer} onChange={e => setCustomer(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">رقم الهاتف *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary" dir="ltr" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">المرحلة الحالية</label>
                  <select value={stage} onChange={e => setStage(e.target.value as any)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary">
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الفني المسؤول</label>
                  <select value={technician} onChange={e => setTechnician(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary">
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                    <option>علي إبراهيم</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">إجمالي القيمة (ج.م) *</label>
                  <input type="number" value={total} onChange={e => setTotal(Number(e.target.value))} className="border border-outline-variant rounded p-2 text-sm font-mono focus:outline-none focus:border-primary" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">المدفوع (ج.م)</label>
                  <input type="number" value={paid} onChange={e => setPaid(Number(e.target.value))} className="border border-outline-variant rounded p-2 text-sm font-mono focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">موعد التركيب</label>
                  <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الفرع</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary">
                    <option>الفرع الرئيسي — القاهرة</option>
                    <option>فرع ثانٍ — القاهرة</option>
                    <option>فرع ثالث — القاهرة</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary h-20 resize-none" />
              </div>

              <div className="flex gap-2 mt-3">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">حفظ التعديلات</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
