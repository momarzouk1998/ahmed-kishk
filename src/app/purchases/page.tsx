'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { formatDateOnly } from '@/lib/dateUtils';

interface PurchaseInvoiceItem {
  code: string;
  name: string;
  meters: number;
  unitCost: number;
  totalCost: number;
}

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  supplierPhone: string;
  branch: string;
  items: PurchaseInvoiceItem[];
  subtotal: number;
  discountType: 'EGP' | 'PERCENT';
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'نقدي (كاش)' | 'شيكات بنكية' | 'على دفعات / آجل';
  paidAmount: number;
  remainingAmount: number;
  status: 'مسدد بالكامل' | 'مسدد جزئياً' | 'آجل / غير مسدد';
  notes?: string;
}

interface SupplierPurchaseReturn {
  id: string;
  returnNumber: string;
  date: string;
  invoiceNumber: string;
  supplierName: string;
  supplierPhone: string;
  reason: string;
  itemsDetail: string;
  refundAmount: number;
  refundMethod: 'نقدي (كاش)' | 'خصم من حساب المورد' | 'إلغاء شيك';
  notes?: string;
}

const defaultPurchases: PurchaseInvoice[] = [];
const defaultReturns: SupplierPurchaseReturn[] = [];

const PURCHASES_KEY = 'ahmed_kishk_purchase_invoices_v1';
const PRETURNS_KEY = 'ahmed_kishk_purchase_returns_v1';

export default function PurchasesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'PURCHASES' | 'RETURNS'>('PURCHASES');

  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(defaultPurchases);
  const [returns, setReturns] = useState<SupplierPurchaseReturn[]>(defaultReturns);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Modals & Edit States
  const [showAddReturnModal, setShowAddReturnModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseInvoice | null>(null);
  const [editingReturn, setEditingReturn] = useState<SupplierPurchaseReturn | null>(null);
  const [printablePurchase, setPrintablePurchase] = useState<PurchaseInvoice | null>(null);

  // Create Supplier Return Form State
  const [retSupplierName, setRetSupplierName] = useState('');
  const [retSupplierPhone, setRetSupplierPhone] = useState('');
  const [retInvNumber, setRetInvNumber] = useState('');
  const [retReason, setRetReason] = useState('خامة غير مطابقة للمواصفات');
  const [retItemsDetail, setRetItemsDetail] = useState('');
  const [retAmount, setRetAmount] = useState<number>(1000);
  const [retMethod, setRetMethod] = useState<SupplierPurchaseReturn['refundMethod']>('خصم من حساب المورد');

  useEffect(() => {
    async function loadPurchases() {
      try {
        const res = await fetch('/api/purchases', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.purchases) && json.purchases.length > 0) {
            setPurchases(json.purchases);
            localStorage.setItem(PURCHASES_KEY, JSON.stringify(json.purchases));
          } else {
            const rawP = localStorage.getItem(PURCHASES_KEY);
            if (rawP) setPurchases(JSON.parse(rawP));
          }
        }
      } catch (e) {
        console.error(e);
      }

      try {
        const rawR = localStorage.getItem(PRETURNS_KEY);
        if (rawR) setReturns(JSON.parse(rawR));
      } catch {}
    }

    loadPurchases();
  }, []);

  // #FIX: كانت بتزامن مع /api/system-data بمفتاح غير متعرَّف عليه فى POST (blob ميت لا
  // تقرأه صفحة القائمة أبداً — القائمة بتقرأ من /api/purchases الحقيقى). الآن state
  // محلى فقط؛ الحفظ الحقيقى يتم صراحةً فى كل مكان يستدعيها (حذف حقيقى، أو POST لـ /api/purchases).
  const savePurchasesState = (list: PurchaseInvoice[]) => {
    setPurchases(list);
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(list));
  };

  const saveReturnsState = (list: SupplierPurchaseReturn[]) => {
    setReturns(list);
    localStorage.setItem(PRETURNS_KEY, JSON.stringify(list));
  };

  const handleDeletePurchase = async (id: string, num: string) => {
    if (!confirm(`هل أنت متأكد من حذف فاتورة الشراء (${num})؟`)) return;
    savePurchasesState(purchases.filter(p => p.id !== id));
    // #FIX: الحذف كان بيروح لمفتاح system-data خاطئ (ahmed_kishk_purchase_invoices_v1)
    // مختلف عن المصدر الحقيقى اللى الصفحة بتقرأ منه (/api/purchases → جدول PurchaseInvoice)،
    // فكان بيرجع بعد أى ريفريش. دلوقتى بيحذف من الجدول الحقيقى مباشرة.
    try {
      await fetch(`/api/purchases?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete purchase invoice from server:', err);
    }
  };

  const handleDeleteReturn = (id: string, num: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف إذن مرتجع المشتريات (${num})؟`)) {
      saveReturnsState(returns.filter(r => r.id !== id));
    }
  };

  const handleUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;

    const remaining = Math.max(0, editingPurchase.totalAmount - editingPurchase.paidAmount);
    const statusLabel: PurchaseInvoice['status'] = remaining === 0 ? 'مسدد بالكامل' : editingPurchase.paidAmount > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';

    const updatedObj = { ...editingPurchase, remainingAmount: remaining, status: statusLabel };
    const updated = purchases.map(p => p.id === editingPurchase.id ? updatedObj : p);
    savePurchasesState(updated);

    // #FIX: كان التعديل بيتحفظ فى blob ميت. دلوقتى بيتحفظ مباشرة فى جدول الفاتورة الحقيقى.
    try {
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedObj),
      });
    } catch (err) {
      console.error('Failed to save purchase update to server:', err);
    }

    setEditingPurchase(null);
  };

  const handleUpdateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReturn) return;

    const updated = returns.map(r => r.id === editingReturn.id ? editingReturn : r);
    saveReturnsState(updated);
    setEditingReturn(null);
  };

  // Submit Supplier Return
  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retSupplierName.trim() || retAmount <= 0) return;

    const retNum = `PRET-2026-${String(returns.length + 1).padStart(3, '0')}`;
    const newRet: SupplierPurchaseReturn = {
      id: `PRET-${Date.now()}`,
      returnNumber: retNum,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: retInvNumber.trim() || '—',
      supplierName: retSupplierName.trim(),
      supplierPhone: retSupplierPhone.trim(),
      reason: retReason,
      itemsDetail: retItemsDetail.trim() || 'مرتجع خامات قماش للمورد',
      refundAmount: retAmount,
      refundMethod: retMethod,
    };

    saveReturnsState([newRet, ...returns]);
    setShowAddReturnModal(false);
    setRetSupplierName('');
    setRetItemsDetail('');
    setRetAmount(1000);
  };

  // Filtered Purchases
  const filteredPurchases = purchases.filter(p => {
    const matchSearch = p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierPhone.includes(search);
    const matchPayment = paymentFilter === 'all' || p.paymentMethod === paymentFilter;
    return matchSearch && matchPayment;
  });

  // Filtered Returns
  const filteredReturns = returns.filter(ret => {
    return ret.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      ret.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      ret.invoiceNumber.toLowerCase().includes(search.toLowerCase());
  });

  // Metrics — Number() guards against undefined fields coming from server
  const totalPurchasesCost = filteredPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
  const totalPurchasesPaid = filteredPurchases.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
  const totalPurchasesRemaining = filteredPurchases.reduce((s, p) => s + (Number(p.remainingAmount) || 0), 0);

  const totalReturnsAmount = filteredReturns.reduce((s, r) => s + (Number(r.refundAmount) || 0), 0);

  return (
    <PageShell title="فواتير المشتريات ومردودات المشتريات">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Navigation Tabs (2 Tabs) */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('PURCHASES')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PURCHASES' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>📥 فواتير المشتريات</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{purchases.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RETURNS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'RETURNS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>↩️ مرتجعات الموردين (مردودات المشتريات)</span>
            <span className="bg-rose-100 text-rose-950 px-2 rounded-full text-[11px] font-mono font-bold">{returns.length}</span>
          </button>
        </div>

        {/* TAB 1: PURCHASES */}
        {activeTab === 'PURCHASES' && (
          <div className="space-y-4">
            {/* Header & Full Page Creation Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي فواتير الشراء المسجلة: {filteredPurchases.length} فاتورة</span>

              <button
                type="button"
                onClick={() => router.push('/purchases/new')}
                className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                <span>+ إنشاء فاتورة شراء من مورد (صفحة كاملة)</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي قيمة المشتريات</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{totalPurchasesCost.toLocaleString()} ج</strong>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block">المسدد للموردين</span>
                <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">{totalPurchasesPaid.toLocaleString()} ج</strong>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
                <span className="text-rose-800 font-bold block">المتبقي بالآجل (علينا)</span>
                <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalPurchasesRemaining.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">عدد عمليات الشراء</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{filteredPurchases.length} فاتورة</strong>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="relative sm:col-span-8">
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="ابحث برقم الفاتورة، اسم المورد، أو رقم الهاتف..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل طرق الدفع للموردين</option>
                  <option value="نقدي (كاش)">1. نقدي (كاش)</option>
                  <option value="شيكات بنكية">2. شيكات بنكية مؤجلة</option>
                  <option value="على دفعات / آجل">3. على دفعات / بالآجل</option>
                </select>
              </div>
            </div>

            {/* Purchases Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[850px]">
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">رقم الفاتورة والتاريخ</th>
                      <th className="p-3.5">اسم المورد والهاتف</th>
                      <th className="p-3.5">طريقة الدفع للمورد</th>
                      <th className="p-3.5 text-center font-mono">خصم المورد</th>
                      <th className="p-3.5 text-center font-mono">صافي الفاتورة</th>
                      <th className="p-3.5 text-center font-mono">المسدد / المتبقي</th>
                      <th className="p-3.5 text-center">الحالة</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map(pur => {
                      const badgeClass = pur.status === 'مسدد بالكامل' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : pur.status === 'مسدد جزئياً' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-rose-100 text-rose-900 border-rose-200';

                      return (
                        <tr key={pur.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            <span className="font-mono text-amber-800 text-xs block">{pur.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{pur.date ? formatDateOnly(pur.date) : 'غير محدد'} ({pur.branch})</span>
                          </td>

                          <td className="p-3.5 text-slate-700">
                            <div className="font-bold text-slate-900">{pur.supplierName}</div>
                            <div className="text-slate-500 font-mono text-[11px]" dir="ltr">{pur.supplierPhone}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-950 border border-slate-200">
                              🤝 {pur.paymentMethod}
                            </span>
                          </td>

                          <td className="p-3.5 text-center font-mono font-bold text-rose-800">
                            {(Number(pur.discountAmount) || 0) > 0 ? `-${(Number(pur.discountAmount) || 0).toLocaleString()} ج` : 'لا يوجد'}
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-sm text-slate-950">
                            {(Number(pur.totalAmount) || 0).toLocaleString()} ج
                          </td>

                          <td className="p-3.5 text-center font-mono">
                            <div className="text-emerald-700 font-bold">مسدد: {(Number(pur.paidAmount) || 0).toLocaleString()} ج</div>
                            {(Number(pur.remainingAmount) || 0) > 0 && (
                              <div className="text-rose-700 font-bold text-[11px]">متبقي: {(Number(pur.remainingAmount) || 0).toLocaleString()} ج</div>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${badgeClass}`}>
                              {pur.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPrintablePurchase(pur)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                🖨️
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingPurchase(pur)}
                                className="bg-amber-100 text-amber-950 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePurchase(pur.id, pur.invoiceNumber)}
                                className="bg-rose-100 text-rose-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUPPLIER RETURNS */}
        {activeTab === 'RETURNS' && (
          <div className="space-y-4">
            {/* Header & Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي عمليات مرتجعات المشتريات للموردين: {filteredReturns.length} عملية</span>

              <button
                type="button"
                onClick={() => setShowAddReturnModal(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                <span>+ تسجيل مرتجع شراء لمورد</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي مبالغ المرتجعات للموردين</span>
                <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalReturnsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">عدد العمليات</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredReturns.length} عملية</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">المخصوم من رصيد الموردين</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">
                  {filteredReturns.filter(r => r.refundMethod === 'خصم من حساب المورد').reduce((s, r) => s + (Number(r.refundAmount) || 0), 0).toLocaleString()} ج
                </strong>
              </div>
            </div>

            {/* Returns Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">رقم إذن المرتجع والتاريخ</th>
                      <th className="p-3.5">اسم المورد والفاتورة</th>
                      <th className="p-3.5">سبب الارجاع والتفاصيل</th>
                      <th className="p-3.5 font-mono text-center">المبلغ المسترد / المخصوم</th>
                      <th className="p-3.5 text-center">طريقة الرد من المورد</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturns.map(ret => (
                      <tr key={ret.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <span className="font-mono text-rose-800 text-xs block">{ret.returnNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{ret.date ? formatDateOnly(ret.date) : 'غير محدد'}</span>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <div className="font-bold text-slate-900">{ret.supplierName}</div>
                          <div className="text-slate-500 font-mono text-[11px]">فاتورة شراء: {ret.invoiceNumber}</div>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <div className="font-bold text-slate-900">{ret.reason}</div>
                          <div className="text-slate-500 text-[11px]">{ret.itemsDetail}</div>
                        </td>

                        <td className="p-3.5 text-center font-mono font-black text-sm text-emerald-700">
                          +{(Number(ret.refundAmount) || 0).toLocaleString()} ج
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-950 border border-slate-200">
                            {ret.refundMethod}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              🖨️
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingReturn(ret)}
                              className="bg-amber-100 text-amber-950 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteReturn(ret.id, ret.returnNumber)}
                              className="bg-rose-100 text-rose-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✏️ Modal: Edit Purchase Invoice */}
      {editingPurchase && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تعديل فاتورة الشراء #{editingPurchase.invoiceNumber}</h3>
              <button onClick={() => setEditingPurchase(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdatePurchase} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم المورد:</label>
                <input
                  type="text"
                  required
                  value={editingPurchase.supplierName}
                  onChange={e => setEditingPurchase({ ...editingPurchase, supplierName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المسدد (ج.م):</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editingPurchase.paidAmount}
                  onChange={e => setEditingPurchase({ ...editingPurchase, paidAmount: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة الدفع للمورد:</label>
                <select
                  value={editingPurchase.paymentMethod}
                  onChange={e => setEditingPurchase({ ...editingPurchase, paymentMethod: e.target.value as any })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                >
                  <option value="نقدي (كاش)">1. نقدي (كاش)</option>
                  <option value="شيكات بنكية">2. شيكات بنكية مؤجلة</option>
                  <option value="على دفعات / آجل">3. على دفعات / بالآجل</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow-gold cursor-pointer">
                  حفظ التعديلات ✓
                </button>
                <button type="button" onClick={() => setEditingPurchase(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ Modal: Edit Supplier Return */}
      {editingReturn && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تعديل إذن المرتجع للمورد #{editingReturn.returnNumber}</h3>
              <button onClick={() => setEditingReturn(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم المورد:</label>
                <input
                  type="text"
                  required
                  value={editingReturn.supplierName}
                  onChange={e => setEditingReturn({ ...editingReturn, supplierName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المسترد (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingReturn.refundAmount}
                  onChange={e => setEditingReturn({ ...editingReturn, refundAmount: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-black text-xs cursor-pointer">
                  حفظ التعديلات ✓
                </button>
                <button type="button" onClick={() => setEditingReturn(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ↩️ Modal: Create Supplier Return */}
      {showAddReturnModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تسجيل مرتجع شراء لمورد</h3>
              <button onClick={() => setShowAddReturnModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم المورد:</label>
                <input
                  type="text"
                  required
                  placeholder="اسم المورد..."
                  value={retSupplierName}
                  onChange={e => setRetSupplierName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الهاتف ورقم فاتورة الشراء الأصلية:</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="الهاتف..."
                    value={retSupplierPhone}
                    onChange={e => setRetSupplierPhone(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none"
                    dir="ltr"
                  />
                  <input
                    type="text"
                    placeholder="رقم الفاتورة..."
                    value={retInvNumber}
                    onChange={e => setRetInvNumber(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">سبب المرتجع لمورد:</label>
                <select
                  value={retReason}
                  onChange={e => setRetReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="خامة غير مطابقة للمواصفات">خامة غير مطابقة للمواصفات</option>
                  <option value="عيوب نسجية">عيوب نسجية أو تلف بالشحن</option>
                  <option value="أمتار زائدة">أمتار زائدة مرجعة للمورد</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">تفاصيل الخامات المرجعة:</label>
                <input
                  type="text"
                  placeholder="مثال: لفة تول 10 متر..."
                  value={retItemsDetail}
                  onChange={e => setRetItemsDetail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المسترد / المخصوم (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={retAmount}
                  onChange={e => setRetAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-black text-emerald-950 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة الرد من المورد:</label>
                <select
                  value={retMethod}
                  onChange={e => setRetMethod(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="خصم من حساب المورد">خصم من حساب المورد الجاري</option>
                  <option value="نقدي (كاش)">استرداد نقدي (كاش)</option>
                  <option value="إلغاء شيك">إلغاء / استرداد شيك بنكي</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-black text-xs shadow-xs cursor-pointer">
                  تسجيل إذن المرتجع للمورد ✓
                </button>
                <button type="button" onClick={() => setShowAddReturnModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖨️ Printable Voucher Modal */}
      {printablePurchase && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-purchase-invoice, #printable-purchase-invoice * { visibility: visible !important; }
              #printable-purchase-invoice { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div id="printable-purchase-invoice" className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-slate-900 border border-slate-200 my-auto shadow-2xl">
            <div className="no-print flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm">إذن فاتورة مشتريات</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-bold">طباعة PDF</button>
                <button type="button" onClick={() => setPrintablePurchase(null)} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold">إغلاق ✕</button>
              </div>
            </div>

            <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
              <h2 className="font-black text-lg">مؤسسة أحمد كشك للأقمشة والستائر</h2>
              <p className="text-xs font-mono font-bold text-blue-900">فاتورة شراء خامات من مورد ({printablePurchase.invoiceNumber})</p>
              <div className="text-[11px] text-slate-500 font-mono">{printablePurchase.date} — {printablePurchase.branch}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>المورد:</strong> {printablePurchase.supplierName}</div>
              <div><strong>الهاتف:</strong> {printablePurchase.supplierPhone}</div>
              <div><strong>طريقة الدفع:</strong> {printablePurchase.paymentMethod}</div>
            </div>

            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-2 border border-slate-300">الصنف</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">الأمتار</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">سعر الشراء</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {(printablePurchase.items || []).map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 font-bold">{it.name}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{it.meters}م</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{it.unitCost} ج</td>
                    <td className="p-2 border border-slate-300 text-center font-mono font-bold">{it.totalCost} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 font-mono text-xs text-right border-t border-slate-200 pt-2">
              <div className="flex justify-between">
                <span>الإجمالي قبل الخصم:</span>
                <span>{(Number(printablePurchase.subtotal) || 0).toLocaleString()} ج</span>
              </div>
              {(Number(printablePurchase.discountAmount) || 0) > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>خصم المورد:</span>
                  <span>-{(Number(printablePurchase.discountAmount) || 0).toLocaleString()} ج</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-300">
                <span>الصافي الكلي:</span>
                <span>{(Number(printablePurchase.totalAmount) || 0).toLocaleString()} ج</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>المسدد:</span>
                <span>{(Number(printablePurchase.paidAmount) || 0).toLocaleString()} ج</span>
              </div>
              {(Number(printablePurchase.remainingAmount) || 0) > 0 && (
                <div className="flex justify-between text-rose-800 font-bold">
                  <span>المتبقي آجل:</span>
                  <span>{(Number(printablePurchase.remainingAmount) || 0).toLocaleString()} ج</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
