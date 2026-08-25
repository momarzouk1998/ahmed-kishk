'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  categoriesSupplied: string[];
  totalPurchases: number;
  paidAmount: number;
  balanceOwed: number; // positive = we owe them
  notes: string;
}

const initialSuppliers: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'شركة النيل للأقمشة والمنسوجات',
    phone: '01099988877',
    address: 'القاهرة — شارع المعز',
    categoriesSupplied: ['ستان سواريه', 'حرير طبيعي', 'كريب'],
    totalPurchases: 85000,
    paidAmount: 79800,
    balanceOwed: 5200,
    notes: 'مورد رئيسي لخامات السوارية. التوريد بشيك 30 يوم.',
  },
  {
    id: 'SUP-002',
    name: 'مصنع الدلتا لإكسسوارات الستائر',
    phone: '01011223344',
    address: 'المنصورة — المنطقة الصناعية',
    categoriesSupplied: ['بلاك آوت', 'تول', 'مواسير', 'تراكات سقف'],
    totalPurchases: 42000,
    paidAmount: 40200,
    balanceOwed: 1800,
    notes: 'مورد مواسير وإكسسوارات التراك.',
  },
  {
    id: 'SUP-003',
    name: 'مستورد الشرق للتول والشيفون',
    phone: '01244556677',
    address: 'الإسكندرية — المنشية',
    categoriesSupplied: ['شيفون ناعم', 'أشرطة كشكشة'],
    totalPurchases: 28000,
    paidAmount: 28000,
    balanceOwed: 0,
    notes: 'مسدد بالكامل.',
  },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [selected, setSelected] = useState<Supplier | null>(initialSuppliers[0]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Supplier form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [categories, setCategories] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newSup: Supplier = {
      id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
      name,
      phone,
      address,
      categoriesSupplied: categories.split(',').map((c) => c.trim()),
      totalPurchases: 0,
      paidAmount: 0,
      balanceOwed: 0,
      notes,
    };

    setSuppliers([newSup, ...suppliers]);
    setSelected(newSup);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setAddress('');
    setCategories('');
    setNotes('');
  };

  const handlePaySupplier = () => {
    if (!selected) return;
    const amountStr = prompt(`تسجيل دفعة مسددة للمورد ${selected.name}. أدخل المبلغ (ج.م):`, '1000');
    if (amountStr && !isNaN(Number(amountStr))) {
      const amount = Number(amountStr);
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === selected.id
            ? {
                ...s,
                paidAmount: s.paidAmount + amount,
                balanceOwed: Math.max(0, s.balanceOwed - amount),
              }
            : s
        )
      );
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              paidAmount: prev.paidAmount + amount,
              balanceOwed: Math.max(0, prev.balanceOwed - amount),
            }
          : null
      );
    }
  };

  return (
    <PageShell title="إدارة الموردين والديون">
      <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-primary">الموردون وحسابات الديون</h1>
              <p className="text-on-surface-variant text-xs sm:text-sm mt-1">
                متابعة مشتريات الأقمشة والإكسسوارات، المدفوعات للموردين والديون المستحقة عليهم.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-on-primary px-4 sm:px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-xs sm:text-sm shadow w-full sm:w-auto justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">domain_add</span>
              إضافة مورد جديد
            </button>
          </div>

          {/* KPI summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">إجمالي الموردين</div>
              <div className="font-display font-bold text-2xl text-primary mt-1">{suppliers.length}</div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">إجمالي المشتريات</div>
              <div className="font-display font-bold text-2xl text-primary mt-1">
                {suppliers.reduce((sum, s) => sum + s.totalPurchases, 0).toLocaleString()} ج.م
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">إجمالي الديون للموردين</div>
              <div className="font-display font-bold text-2xl text-error mt-1">
                {suppliers.reduce((sum, s) => sum + s.balanceOwed, 0).toLocaleString()} ج.م
              </div>
            </div>
          </div>

          {/* Supplier Grid / Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Supplier List */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[480px]">
                <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant border-b border-surface-container-high">
                  <tr>
                    <th className="p-3.5">المورد</th>
                    <th className="p-3.5">التوريدات</th>
                    <th className="p-3.5 text-left">المشتريات</th>
                    <th className="p-3.5 text-left">الديون المستحقة</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`border-b border-surface-container-low cursor-pointer transition-colors ${
                        selected?.id === s.id ? 'bg-primary-container/20 font-semibold' : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-primary">{s.name}</div>
                        <div className="text-xs text-on-surface-variant font-mono">{s.phone}</div>
                      </td>
                      <td className="p-3.5 text-xs text-on-surface-variant">
                        {s.categoriesSupplied.join(', ')}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-sm">
                        {s.totalPurchases.toLocaleString()} ج
                      </td>
                      <td className="p-3.5 text-left font-mono">
                        {s.balanceOwed > 0 ? (
                          <span className="text-error font-bold">{s.balanceOwed.toLocaleString()} ج</span>
                        ) : (
                          <span className="text-primary text-xs">خالي الديون ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Selected Supplier Card */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-surface-container-highest p-4 sm:p-6 lg:sticky lg:top-20">
              {selected ? (
                <div className="flex flex-col gap-5">
                  <div className="border-b border-surface-container-high pb-4">
                    <span className="text-xs font-mono text-on-surface-variant">{selected.id}</span>
                    <h2 className="font-bold text-xl text-primary mt-0.5">{selected.name}</h2>
                    <p className="text-xs text-on-surface-variant mt-1">{selected.address} • {selected.phone}</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between p-3 bg-surface-container-low rounded-lg">
                      <span>إجمالي ما تم شراؤه</span>
                      <span className="font-mono font-bold text-sm">{selected.totalPurchases.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between p-3 bg-surface-container-low rounded-lg">
                      <span>المسدد للمورد</span>
                      <span className="font-mono font-bold text-sm text-primary">{selected.paidAmount.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between p-3 bg-surface-container-low rounded-lg">
                      <span>المتبقي للمورد (ديون)</span>
                      <span className="font-mono font-bold text-sm text-error">{selected.balanceOwed.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  {selected.notes && (
                    <div className="bg-surface-container-low p-3 rounded-lg text-xs">
                      <span className="text-on-surface-variant font-mono block mb-1">ملاحظات التعامل</span>
                      <p className="text-primary">{selected.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => alert(`كشف حساب للمورد ${selected.name}`)}
                      className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded-lg text-xs font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      كشف حساب
                    </button>
                    <button
                      onClick={handlePaySupplier}
                      className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-xs font-bold hover:bg-inverse-surface transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      تسجيل دفعة سداد
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-on-surface-variant text-sm">اختر مورداً من القائمة.</div>
              )}
            </div>
          </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-primary mb-4">إضافة مورد جديد</h2>
            <form onSubmit={handleAddSupplier} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">اسم المورد / الشركة *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">رقم الهاتف</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">العنوان</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">الأصناف الموردة (مفصولة بفواصل)</label>
                <input
                  value={categories}
                  onChange={(e) => setCategories(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="ستان، بلاك آوت، مواسير..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">ملاحظات الشراء والائتمان</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">
                  حفظ المورد
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
    </PageShell>
  );
}
