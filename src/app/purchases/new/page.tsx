'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';

interface PurchaseLineItem {
  id: string;
  code: string;
  name: string;
  meters: number;
  unitCost: number;
  totalCost: number;
}

const PURCHASES_KEY = 'ahmed_kishk_purchase_invoices_v1';

export default function NewPurchaseInvoicePage() {
  const router = useRouter();

  // Supplier Information
  const [supplierName, setSupplierName] = useState('شركة النيل للأقمشة والمنسوجات');
  const [supplierPhone, setSupplierPhone] = useState('01099988877');
  const [branch, setBranch] = useState('الفرع الرئيسي');

  // Dynamic Line Items
  const [items, setItems] = useState<PurchaseLineItem[]>([
    { id: '1', code: 'FAB-SUP-01', name: 'توب قطيفة تركي ثقيل (50م)', meters: 50, unitCost: 260, totalCost: 13000 },
  ]);

  // Discount
  const [discountType, setDiscountType] = useState<'EGP' | 'PERCENT'>('EGP');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Supplier Payment Method & Settlement
  const [paymentMethod, setPaymentMethod] = useState<'نقدي (كاش)' | 'شيكات بنكية' | 'على دفعات / آجل'>('نقدي (كاش)');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [purNotes, setPurNotes] = useState('');

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.meters * item.unitCost, 0);
  const calculatedDiscount = discountType === 'PERCENT' ? (subtotal * discountValue) / 100 : discountValue;
  const totalAmount = Math.max(0, subtotal - calculatedDiscount);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const addItemRow = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), code: `FAB-SUP-0${items.length + 1}`, name: 'توب تول خفيف مطرز', meters: 30, unitCost: 95, totalCost: 2850 },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(it => it.id !== id));
  };

  const updateItem = (id: string, field: keyof PurchaseLineItem, val: any) => {
    setItems(items.map(it => {
      if (it.id === id) {
        const updated = { ...it, [field]: val };
        updated.totalCost = updated.meters * updated.unitCost;
        return updated;
      }
      return it;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || items.length === 0 || subtotal <= 0) return;

    try {
      const rawPurchases = localStorage.getItem(PURCHASES_KEY);
      const existingPurchases = rawPurchases ? JSON.parse(rawPurchases) : [];

      const purNum = `PUR-2026-${String(existingPurchases.length + 1).padStart(3, '0')}`;
      const statusLabel = remainingAmount === 0 ? 'مسدد بالكامل' : paidAmount > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';

      const newPur = {
        id: `PUR-${Date.now()}`,
        invoiceNumber: purNum,
        date: new Date().toISOString().split('T')[0],
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim() || 'غير محدد',
        branch,
        items,
        subtotal,
        discountType,
        discountValue,
        discountAmount: calculatedDiscount,
        totalAmount,
        paymentMethod,
        paidAmount,
        remainingAmount,
        status: statusLabel,
        notes: purNotes.trim(),
      };

      const updated = [newPur, ...existingPurchases];
      localStorage.setItem(PURCHASES_KEY, JSON.stringify(updated));

      // Sync to server
      await fetch('/api/system-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: PURCHASES_KEY, data: updated }),
      }).catch(() => {});

      router.push('/purchases');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PageShell title="إنشاء فاتورة مشتريات جديدة">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Back Button */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-2xl">add_business</span>
              <span>صفحة إنشاء فاتورة شراء جديدة من مورد</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">سجل بيانات المورد، الخامات الموردة، وطرق الدفع والخصم بسهولة</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/purchases')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ↩️ العودة لفواتير المشتريات
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Supplier Details */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <h3 className="font-black text-slate-900 text-sm border-r-4 border-amber-500 pr-2.5">
              1. بيانات المورد والشركة:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم المورد / الشركة *:</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسم المورد..."
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الهاتف التواصل:</label>
                <input
                  type="text"
                  placeholder="مثال: 01099988877"
                  value={supplierPhone}
                  onChange={e => setSupplierPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 bg-slate-50"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">فرع التوريد:</label>
                <select
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none bg-slate-50 cursor-pointer"
                >
                  <option value="الفرع الرئيسي">الفرع الرئيسي — القاهرة</option>
                  <option value="فرع عرابي">فرع عرابي</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Items Table */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-sm border-r-4 border-amber-500 pr-2.5">
                2. جدول الخامات الموردة والتكلفة:
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="bg-amber-100 hover:bg-amber-200 text-amber-950 px-3.5 py-1.5 rounded-xl text-xs font-black border border-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>+ إضافة خامة/صنف آخر</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3">الكود والخامة الموردة</th>
                    <th className="p-3 font-mono text-center">الأمتار / الكمية</th>
                    <th className="p-3 font-mono text-center">تكلفة الشراء للمتر (ج.م)</th>
                    <th className="p-3 font-mono text-center">التكلفة الإجمالية</th>
                    <th className="p-3 text-center">إزالة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td className="p-2.5 min-w-[200px]">
                        <input
                          type="text"
                          required
                          value={it.name}
                          onChange={e => updateItem(it.id, 'name', e.target.value)}
                          placeholder="اسم الخامة والتوب..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none"
                        />
                      </td>

                      <td className="p-2.5 w-[140px]">
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.meters}
                          onChange={e => updateItem(it.id, 'meters', Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-bold text-center text-slate-900 focus:outline-none"
                        />
                      </td>

                      <td className="p-2.5 w-[140px]">
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.unitCost}
                          onChange={e => updateItem(it.id, 'unitCost', Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-bold text-center text-slate-900 focus:outline-none"
                        />
                      </td>

                      <td className="p-2.5 text-center font-mono font-black text-sm text-slate-950 w-[140px]">
                        {it.totalCost.toLocaleString()} ج
                      </td>

                      <td className="p-2.5 text-center w-[60px]">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(it.id)}
                            className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-left font-mono font-black text-slate-950 text-xs pt-1 border-t border-slate-100">
              الإجمالي قبل الخصم: {subtotal.toLocaleString()} ج
            </div>
          </div>

          {/* Section 3: Discounts & Supplier Payments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Supplier Discount */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3 text-xs">
              <h3 className="font-black text-slate-900 text-sm border-r-4 border-amber-500 pr-2.5">
                3. خصم المورد والتخفيضات:
              </h3>

              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-700">نوع الخصم:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('EGP')}
                    className={`px-3 py-1 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                      discountType === 'EGP' ? 'bg-amber-400 text-slate-950 shadow-2xs font-black' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    خصم بالمبلغ (ج.م)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENT')}
                    className={`px-3 py-1 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                      discountType === 'PERCENT' ? 'bg-amber-400 text-slate-950 shadow-2xs font-black' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    خصم بالنسبة (%)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">خصم الكمية للمورد:</label>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(Number(e.target.value))}
                  placeholder={discountType === 'PERCENT' ? 'مثال: 5%' : 'مثال: 500 ج'}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-between font-mono font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>مبلغ الخصم المخصوم:</span>
                <span className="text-rose-700">-{calculatedDiscount.toLocaleString()} ج</span>
              </div>
            </div>

            {/* Supplier Payment Method Picker */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3 text-xs">
              <h3 className="font-black text-slate-900 text-sm border-r-4 border-amber-500 pr-2.5">
                4. طرق الدفع للمورد:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['نقدي (كاش)', 'شيكات بنكية', 'على دفعات / آجل'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-2 rounded-xl font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === m
                        ? 'bg-blue-900 text-white border-blue-950 shadow-2xs font-black'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-blue-950 font-bold block mb-1">المسدد للمورد الآن (ج.م):</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full border border-blue-300 rounded-xl px-3 py-2 font-mono font-black text-blue-950 focus:outline-none bg-blue-50/40"
                  />
                </div>

                <div>
                  <label className="text-rose-950 font-bold block mb-1">المتبقي بالآجل:</label>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-mono font-black text-rose-950 text-sm text-center">
                    {remainingAmount.toLocaleString()} ج
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Notes & Final Actions */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <div>
              <label className="text-slate-700 font-bold block mb-1 text-xs">ملاحظات الفاتورة ورصيد المورد:</label>
              <textarea
                rows={2}
                placeholder="أدخل أي ملاحظات على شحنة التوريد..."
                value={purNotes}
                onChange={e => setPurNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none text-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-slate-100">
              <div className="font-mono text-sm font-black text-slate-950">
                صافي التكلفة الكلية: <span className="text-amber-800 text-lg">{totalAmount.toLocaleString()} ج</span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial bg-brand-gold hover:bg-amber-400 text-slate-950 px-8 py-3 rounded-2xl font-black text-xs shadow-gold cursor-pointer"
                >
                  تأكيد وتجميع فاتورة الشراء ✓
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/purchases')}
                  className="flex-1 sm:flex-initial bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
