'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  inspectionsCount: number;
  ordersCount: number;
  totalSpent: number;
  balance: number; // positive = owed by customer, negative = credit
  notes: string;
}

const initialCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    city: 'القاهرة الجديدة',
    inspectionsCount: 2,
    ordersCount: 1,
    totalSpent: 12600,
    balance: 2600, // آجل
    notes: 'عميل فيلا — يفضل أقمشة السوارية الثقيلة',
  },
  {
    id: 'CUST-002',
    name: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    city: '6 أكتوبر',
    inspectionsCount: 1,
    ordersCount: 0,
    totalSpent: 0,
    balance: 0,
    notes: 'طلب معاينة قيد المتابعة',
  },
  {
    id: 'CUST-003',
    name: 'شركة المعمار للمقاولات',
    phone: '01155556666',
    address: 'شارع البطل أحمد عبد العزيز',
    city: 'المهندسين',
    inspectionsCount: 3,
    ordersCount: 2,
    totalSpent: 42000,
    balance: 10000,
    notes: 'حساب تجاري شركي — سداد بشيكات',
  },
  {
    id: 'CUST-004',
    name: 'أسرة الدكتور سامي',
    phone: '01022334455',
    address: 'ميدان الحجاز',
    city: 'مدينة نصر',
    inspectionsCount: 1,
    ordersCount: 1,
    totalSpent: 18500,
    balance: 0,
    notes: 'تم السداد بالكامل',
  },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(initialCustomers[0]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('القاهرة');
  const [notes, setNotes] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.includes(search) ||
      c.phone.includes(search) ||
      c.address.includes(search) ||
      c.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newCust: Customer = {
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      name,
      phone,
      address,
      city,
      inspectionsCount: 0,
      ordersCount: 0,
      totalSpent: 0,
      balance: 0,
      notes,
    };

    setCustomers([newCust, ...customers]);
    setSelected(newCust);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setAddress('');
    setCity('القاهرة');
    setNotes('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title="سجل العملاء والديون" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          {/* Title bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">إدارة العملاء وكشف الحساب</h1>
              <p className="text-on-surface-variant text-sm mt-1">
                ملف موحد لكل عميل يشمل المعاينات، الطلبات، الفواتير، والمديونيات.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-sm shadow"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              إضافة عميل جديد
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">إجمالي العملاء</div>
              <div className="font-display font-bold text-2xl text-primary mt-1">{customers.length}</div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">عملاء آجل (ديون)</div>
              <div className="font-display font-bold text-2xl text-secondary mt-1">
                {customers.filter((c) => c.balance > 0).length}
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">إجمالي الديون المستحقة</div>
              <div className="font-display font-bold text-2xl text-error mt-1">
                {customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0).toLocaleString()} ج.م
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">إجمالي المبيعات</div>
              <div className="font-display font-bold text-2xl text-primary mt-1">
                {customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()} ج.م
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث باسم العميل، رقم التليفون، أو الكود..."
              className="w-full border border-outline-variant rounded-lg py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:border-primary bg-surface-container-lowest"
            />
          </div>

          {/* Table & Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Customer List Table */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant border-b border-surface-container-high">
                  <tr>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">التليفون</th>
                    <th className="p-3.5 text-center">الطلبات</th>
                    <th className="p-3.5 text-left">المديونية</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={`border-b border-surface-container-low cursor-pointer transition-colors ${
                        selected?.id === c.id ? 'bg-primary-container/20 font-semibold' : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-primary">{c.name}</div>
                        <div className="text-xs text-on-surface-variant font-mono">{c.id} • {c.city}</div>
                      </td>
                      <td className="p-3.5 text-sm font-mono text-on-surface-variant" dir="ltr">
                        {c.phone}
                      </td>
                      <td className="p-3.5 text-center text-xs font-mono">
                        {c.ordersCount} طلبات ({c.inspectionsCount} معاينة)
                      </td>
                      <td className="p-3.5 text-left font-mono">
                        {c.balance > 0 ? (
                          <span className="text-error font-bold">{c.balance.toLocaleString()} ج</span>
                        ) : (
                          <span className="text-primary text-xs">خالي الديون ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Customer Card / Statement */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6 sticky top-20">
              {selected ? (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start border-b border-surface-container-high pb-4">
                    <div>
                      <span className="text-xs font-mono text-on-surface-variant">{selected.id}</span>
                      <h2 className="font-bold text-xl text-primary mt-0.5">{selected.name}</h2>
                      <p className="text-xs text-on-surface-variant mt-1" dir="ltr">{selected.phone}</p>
                    </div>
                    <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-mono">
                      {selected.city}
                    </span>
                  </div>

                  {/* Customer Info Box */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-surface-container-low p-3 rounded-lg">
                      <span className="text-on-surface-variant font-mono block">العنوان</span>
                      <span className="font-bold text-primary text-sm mt-0.5 block">{selected.address || 'غير محدد'}</span>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-lg">
                      <span className="text-on-surface-variant font-mono block">الرصيد والمديونية</span>
                      <span className={`font-bold text-sm mt-0.5 block ${selected.balance > 0 ? 'text-error' : 'text-primary'}`}>
                        {selected.balance > 0 ? `${selected.balance.toLocaleString()} ج.م مديونية` : 'خالي الديون'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Timeline */}
                  <div className="border-t border-surface-container-high pt-4">
                    <h3 className="font-bold text-sm text-primary mb-3">كشف الحساب والعمليات</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                        <span>إجمالي المبيعات والطلبات</span>
                        <span className="font-mono font-bold">{selected.totalSpent.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                        <span>المسدد</span>
                        <span className="font-mono font-bold text-primary">
                          {(selected.totalSpent - selected.balance).toLocaleString()} ج.م
                        </span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-surface-container-low rounded-lg">
                        <span>المتبقي غير المسدد</span>
                        <span className="font-mono font-bold text-error">
                          {selected.balance.toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>
                  </div>

                  {selected.notes && (
                    <div className="bg-surface-container-low p-3 rounded-lg text-xs">
                      <span className="text-on-surface-variant font-mono block mb-1">ملاحظات</span>
                      <p className="text-primary">{selected.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => alert(`طباعة كشف حساب للعميل ${selected.name}`)}
                      className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded-lg text-xs font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      كشف حساب PDF
                    </button>
                    <button
                      onClick={() => {
                        const newBal = prompt(`سداد دفعة من العميل ${selected.name}. أدخل المبلغ المسدد (ج.م):`, '1000');
                        if (newBal && !isNaN(Number(newBal))) {
                          setCustomers((prev) =>
                            prev.map((c) => (c.id === selected.id ? { ...c, balance: Math.max(0, c.balance - Number(newBal)) } : c))
                          );
                          setSelected((prev) => (prev ? { ...prev, balance: Math.max(0, prev.balance - Number(newBal)) } : null));
                        }
                      }}
                      className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-xs font-bold hover:bg-inverse-surface transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      تسجيل دفعة
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-on-surface-variant text-sm">اختر عميلاً من القائمة لعرض ملفه الشامل.</div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="font-display font-bold text-xl text-primary mb-4">إضافة عميل جديد</h2>
            <form onSubmit={handleAddCustomer} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">اسم العميل *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="اسم العميل الرباعي"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">رقم الهاتف *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">المدينة / المنطقة</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">العنوان بالتفصيل</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="اسم الشارع والمبنى"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">ملاحظات العميل</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                  placeholder="تفضيلات الأقمشة، طريقة السداد..."
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">
                  حفظ العميل
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
