'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { formatDateOnly } from '@/lib/dateUtils';

interface SalesInvoiceItem {
  code: string;
  name: string;
  meters: number;
  pricePerMeter: number;
  totalPrice: number;
}

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  branch: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  discountType: 'EGP' | 'PERCENT';
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'فيزا / كارت' | 'بالآجل / دفعات';
  paidAmount: number;
  remainingAmount: number;
  status: 'تم السداد بالكامل' | 'مسدد جزئياً' | 'آجل / غير مسدد';
  notes?: string;
}

interface CustomerSalesReturn {
  id: string;
  returnNumber: string;
  date: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  itemsDetail: string;
  refundAmount: number;
  refundMethod: 'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'إضافة لرصيد العميل';
  notes?: string;
}

const defaultInvoices: SalesInvoice[] = [];
const defaultReturns: CustomerSalesReturn[] = [];

const SALES_INVOICES_KEY = 'ahmed_kishk_sales_invoices_v1';
const SALES_RETURNS_KEY = 'ahmed_kishk_sales_returns_v1';

export default function FabricSalesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'RETURNS'>('INVOICES');
  const [invoices, setInvoices] = useState<SalesInvoice[]>(defaultInvoices);
  const [returns, setReturns] = useState<CustomerSalesReturn[]>(defaultReturns);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Modals & Edit States
  const [showAddReturnModal, setShowAddReturnModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [editingReturn, setEditingReturn] = useState<CustomerSalesReturn | null>(null);
  const [printableInvoice, setPrintableInvoice] = useState<SalesInvoice | null>(null);

  // Create Return Form State
  const [retCustName, setRetCustName] = useState('');
  const [retCustPhone, setRetCustPhone] = useState('');
  const [retInvNumber, setRetInvNumber] = useState('');
  const [retReason, setRetReason] = useState('عيوب في القماش');
  const [retItemsDetail, setRetItemsDetail] = useState('');
  const [retAmount, setRetAmount] = useState<number>(500);
  const [retMethod, setRetMethod] = useState<CustomerSalesReturn['refundMethod']>('نقدي');

  useEffect(() => {
    async function loadSales() {
      try {
        const res = await fetch('/api/fabric-sales', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.sales) && json.sales.length > 0) {
            setInvoices(json.sales);
            localStorage.setItem(SALES_INVOICES_KEY, JSON.stringify(json.sales));
          } else {
            const rawI = localStorage.getItem(SALES_INVOICES_KEY);
            if (rawI) setInvoices(JSON.parse(rawI));
          }
        }
      } catch (e) {
        console.error(e);
      }

      try {
        const rawR = localStorage.getItem(SALES_RETURNS_KEY);
        if (rawR) setReturns(JSON.parse(rawR));
      } catch {}
    }

    loadSales();
  }, []);

  const saveInvoicesState = async (list: SalesInvoice[]) => {
    setInvoices(list);
    localStorage.setItem(SALES_INVOICES_KEY, JSON.stringify(list));
    try {
      await fetch('/api/system-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: SALES_INVOICES_KEY, data: list }),
      });
    } catch (err) {
      console.error('Failed to sync sales with server:', err);
    }
  };

  const saveReturnsState = (list: CustomerSalesReturn[]) => {
    setReturns(list);
    localStorage.setItem(SALES_RETURNS_KEY, JSON.stringify(list));
  };

  const handleDeleteInvoice = (id: string, num: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف فاتورة المبيعات (${num})؟`)) {
      saveInvoicesState(invoices.filter(i => i.id !== id));
    }
  };

  const handleDeleteReturn = (id: string, num: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف إذن مرتجع المبيعات (${num})؟`)) {
      saveReturnsState(returns.filter(r => r.id !== id));
    }
  };

  const handleUpdateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const remaining = Math.max(0, editingInvoice.totalAmount - editingInvoice.paidAmount);
    const statusLabel: SalesInvoice['status'] = remaining === 0 ? 'تم السداد بالكامل' : editingInvoice.paidAmount > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';

    const updated = invoices.map(i => i.id === editingInvoice.id ? { ...editingInvoice, remainingAmount: remaining, status: statusLabel } : i);
    saveInvoicesState(updated);
    setEditingInvoice(null);
    alert('تم تعديل فاتورة المبيعات بنجاح ✓');
  };

  const handleUpdateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReturn) return;

    const updated = returns.map(r => r.id === editingReturn.id ? editingReturn : r);
    saveReturnsState(updated);
    setEditingReturn(null);
    alert('تم تعديل إذن المرتجع بنجاح ✓');
  };

  // Submit Sales Return
  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retCustName.trim() || retAmount <= 0) return;

    const retNum = `RET-2026-${String(returns.length + 1).padStart(3, '0')}`;
    const newRet: CustomerSalesReturn = {
      id: `RET-${Date.now()}`,
      returnNumber: retNum,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: retInvNumber.trim() || '—',
      customerName: retCustName.trim(),
      customerPhone: retCustPhone.trim(),
      reason: retReason,
      itemsDetail: retItemsDetail.trim() || 'مرتجع قماش ستائر',
      refundAmount: retAmount,
      refundMethod: retMethod,
    };

    saveReturnsState([newRet, ...returns]);
    setShowAddReturnModal(false);
    setRetCustName('');
    setRetCustPhone('');
    setRetItemsDetail('');
    setRetAmount(500);
    alert(`تم تسجيل إذن مرتجع المبيعات (${retNum}) بنجاح ✓`);
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerPhone.includes(search);
    const matchPayment = paymentFilter === 'all' || inv.paymentMethod === paymentFilter;
    return matchSearch && matchPayment;
  });

  // Filtered Returns
  const filteredReturns = returns.filter(ret => {
    return ret.customerName.toLowerCase().includes(search.toLowerCase()) ||
      ret.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      ret.invoiceNumber.toLowerCase().includes(search.toLowerCase());
  });

  // Metrics
  const totalSalesRevenue = filteredInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalSalesPaid = filteredInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalSalesRemaining = filteredInvoices.reduce((s, i) => s + i.remainingAmount, 0);

  const totalReturnsAmount = filteredReturns.reduce((s, r) => s + r.refundAmount, 0);

  return (
    <PageShell title="فواتير المبيعات ومردودات المبيعات">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Navigation Tabs (2 Tabs) */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('INVOICES')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'INVOICES' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>🛒 فواتير المبيعات</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{invoices.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RETURNS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'RETURNS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>↩️ مرتجعات العملاء (مردودات المبيعات)</span>
            <span className="bg-rose-100 text-rose-950 px-2 rounded-full text-[11px] font-mono font-bold">{returns.length}</span>
          </button>
        </div>

        {/* TAB 1: SALES INVOICES */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-4">
            {/* Header & Full Page Creation Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي فواتير المبيعات المسجلة: {filteredInvoices.length} فاتورة</span>

              <button
                type="button"
                onClick={() => router.push('/fabric-sales/new')}
                className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>+ إنشاء فاتورة مبيعات جديدة (صفحة كاملة)</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي قيمة المبيعات</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{totalSalesRevenue.toLocaleString()} ج</strong>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block">المحصل من العملاء</span>
                <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">{totalSalesPaid.toLocaleString()} ج</strong>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
                <span className="text-rose-800 font-bold block">المتبقي آجل (ديون لينا)</span>
                <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalSalesRemaining.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">عدد العمليات</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{filteredInvoices.length} فاتورة</strong>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="relative sm:col-span-8">
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="ابحث برقم الفاتورة، اسم العميل، أو رقم الهاتف..."
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
                  <option value="all">كل طرق الدفع للزبون</option>
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="إنستاباي">إنستاباي (InstaPay)</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="فيزا / كارت">فيزا / كارت بنكي</option>
                  <option value="بالآجل / دفعات">بالآجل / دفعات</option>
                </select>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[850px]">
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">رقم الفاتورة والتاريخ</th>
                      <th className="p-3.5">اسم العميل والهاتف</th>
                      <th className="p-3.5">طريقة الدفع للزبون</th>
                      <th className="p-3.5 text-center font-mono">الخصم الممنوح</th>
                      <th className="p-3.5 text-center font-mono">صافي الفاتورة</th>
                      <th className="p-3.5 text-center font-mono">المحصل / المتبقي</th>
                      <th className="p-3.5 text-center">الحالة</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => {
                      const badgeClass = inv.status === 'تم السداد بالكامل' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : inv.status === 'مسدد جزئياً' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-rose-100 text-rose-900 border-rose-200';

                      return (
                        <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            <span className="font-mono text-amber-800 text-xs block">{inv.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{inv.date ? formatDateOnly(inv.date) : 'غير محدد'} ({inv.branch})</span>
                          </td>

                          <td className="p-3.5 text-slate-700">
                            <div className="font-bold text-slate-900">{inv.customerName}</div>
                            <div className="text-slate-500 font-mono text-[11px]" dir="ltr">{inv.customerPhone}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-950 border border-slate-200">
                              💳 {inv.paymentMethod}
                            </span>
                          </td>

                          <td className="p-3.5 text-center font-mono font-bold text-rose-800">
                            {inv.discountAmount > 0 ? `-${inv.discountAmount.toLocaleString()} ج` : 'لا يوجد'}
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-sm text-slate-950">
                            {inv.totalAmount.toLocaleString()} ج
                          </td>

                          <td className="p-3.5 text-center font-mono">
                            <div className="text-emerald-700 font-bold">مدفوع: {inv.paidAmount.toLocaleString()} ج</div>
                            {inv.remainingAmount > 0 && (
                              <div className="text-rose-700 font-bold text-[11px]">متبقي: {inv.remainingAmount.toLocaleString()} ج</div>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${badgeClass}`}>
                              {inv.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPrintableInvoice(inv)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                🖨️
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingInvoice(inv)}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-950 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                                title="تعديل الفاتورة"
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                                title="حذف الفاتورة"
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

        {/* TAB 2: SALES RETURNS */}
        {activeTab === 'RETURNS' && (
          <div className="space-y-4">
            {/* Header & Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي عمليات مرتجعات المبيعات: {filteredReturns.length} عملية إرجاع</span>

              <button
                type="button"
                onClick={() => setShowAddReturnModal(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                <span>+ تسجيل طلب مرتجع مبيعات</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي مبالغ المرتجعات</span>
                <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalReturnsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">عدد عمليات الإرجاع</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredReturns.length} عملية</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">المرتجع نقداً (كاش)</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">
                  {filteredReturns.filter(r => r.refundMethod === 'نقدي').reduce((s, r) => s + r.refundAmount, 0).toLocaleString()} ج
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
                      <th className="p-3.5">اسم العميل والفاتورة الأصلي</th>
                      <th className="p-3.5">سبب المرتجع والخامة</th>
                      <th className="p-3.5 font-mono text-center">المبلغ المسترد</th>
                      <th className="p-3.5 text-center">طريقة الرد للعميل</th>
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
                          <div className="font-bold text-slate-900">{ret.customerName}</div>
                          <div className="text-slate-500 font-mono text-[11px]">فاتورة: {ret.invoiceNumber}</div>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <div className="font-bold text-slate-900">{ret.reason}</div>
                          <div className="text-slate-500 text-[11px]">{ret.itemsDetail}</div>
                        </td>

                        <td className="p-3.5 text-center font-mono font-black text-sm text-rose-700">
                          -{ret.refundAmount.toLocaleString()} ج
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
                              onClick={() => alert(`إذن مرتجع مبيعات رقم (${ret.returnNumber})\nالعميل: ${ret.customerName}\nالمبلغ: ${ret.refundAmount} ج`)}
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

      {/* ✏️ Modal: Edit Sales Invoice */}
      {editingInvoice && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تعديل فاتورة المبيعات #{editingInvoice.invoiceNumber}</h3>
              <button onClick={() => setEditingInvoice(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم العميل:</label>
                <input
                  type="text"
                  required
                  value={editingInvoice.customerName}
                  onChange={e => setEditingInvoice({ ...editingInvoice, customerName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المحصل (ج.م):</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editingInvoice.paidAmount}
                  onChange={e => setEditingInvoice({ ...editingInvoice, paidAmount: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة الدفع:</label>
                <select
                  value={editingInvoice.paymentMethod}
                  onChange={e => setEditingInvoice({ ...editingInvoice, paymentMethod: e.target.value as any })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                >
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="إنستاباي">إنستاباي</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="فيزا / كارت">فيزا / كارت</option>
                  <option value="بالآجل / دفعات">بالآجل / دفعات</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow-gold cursor-pointer">
                  حفظ التعديلات ✓
                </button>
                <button type="button" onClick={() => setEditingInvoice(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ Modal: Edit Customer Return */}
      {editingReturn && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تعديل إذن المرتجع #{editingReturn.returnNumber}</h3>
              <button onClick={() => setEditingReturn(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم العميل:</label>
                <input
                  type="text"
                  required
                  value={editingReturn.customerName}
                  onChange={e => setEditingReturn({ ...editingReturn, customerName: e.target.value })}
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

      {/* ↩️ Modal: Create Customer Return */}
      {showAddReturnModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تسجيل مرتجع مبيعات لعميل</h3>
              <button onClick={() => setShowAddReturnModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم العميل:</label>
                <input
                  type="text"
                  required
                  placeholder="اسم العميل..."
                  value={retCustName}
                  onChange={e => setRetCustName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الهاتف ورقم الفاتورة الأصلية:</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="الهاتف..."
                    value={retCustPhone}
                    onChange={e => setRetCustPhone(e.target.value)}
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
                <label className="text-slate-700 font-bold block mb-1">سبب المرتجع:</label>
                <select
                  value={retReason}
                  onChange={e => setRetReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="عيوب في القماش">عيوب أو دشت في القماش</option>
                  <option value="زيادة في الأمتار">أمتار زائدة عن حاجة الشباك</option>
                  <option value="عدم مطابقة اللون">تغير أو عدم مطابقة تونة اللون</option>
                  <option value="تغير رأي العميل">تغير رأي العميل</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">تفاصيل القماش المرتجع:</label>
                <input
                  type="text"
                  placeholder="مثال: قطيفة تركي (3 متر)..."
                  value={retItemsDetail}
                  onChange={e => setRetItemsDetail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المسترد للعميل (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={retAmount}
                  onChange={e => setRetAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-black text-rose-950 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة رد المبلغ للعميل:</label>
                <select
                  value={retMethod}
                  onChange={e => setRetMethod(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="إنستاباي">إنستاباي</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="إضافة لرصيد العميل">إضافة لرصيد العميل (دائن)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-black text-xs shadow-xs cursor-pointer">
                  تسجيل إذن المرتجع ✓
                </button>
                <button type="button" onClick={() => setShowAddReturnModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖨️ Printable Receipt Modal */}
      {printableInvoice && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-sales-invoice, #printable-sales-invoice * { visibility: visible !important; }
              #printable-sales-invoice { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div id="printable-sales-invoice" className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-slate-900 border border-slate-200 my-auto shadow-2xl">
            <div className="no-print flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm">إيصال فاتورة مبيعات</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-bold">طباعة PDF</button>
                <button type="button" onClick={() => setPrintableInvoice(null)} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold">إغلاق ✕</button>
              </div>
            </div>

            <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
              <h2 className="font-black text-lg">مؤسسة أحمد كشك للأقمشة والستائر</h2>
              <p className="text-xs font-mono font-bold text-amber-800">فاتورة مبيعات قماش ({printableInvoice.invoiceNumber})</p>
              <div className="text-[11px] text-slate-500 font-mono">{printableInvoice.date} — {printableInvoice.branch}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>اسم العميل:</strong> {printableInvoice.customerName}</div>
              <div><strong>الهاتف:</strong> {printableInvoice.customerPhone}</div>
              <div><strong>طريقة الدفع:</strong> {printableInvoice.paymentMethod}</div>
            </div>

            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-2 border border-slate-300">الصنف</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">الأمتار</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">سعر المتر</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(printableInvoice.items || []).map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 font-bold">{it.name}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{it.meters}م</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{it.pricePerMeter} ج</td>
                    <td className="p-2 border border-slate-300 text-center font-mono font-bold">{it.totalPrice} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 font-mono text-xs text-right border-t border-slate-200 pt-2">
              <div className="flex justify-between">
                <span>المبلغ قبل الخصم:</span>
                <span>{printableInvoice.subtotal.toLocaleString()} ج</span>
              </div>
              {printableInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>الخصم الممنوح:</span>
                  <span>-{printableInvoice.discountAmount.toLocaleString()} ج</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-300">
                <span>الصافي الكلي:</span>
                <span>{printableInvoice.totalAmount.toLocaleString()} ج</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>المدفوع:</span>
                <span>{printableInvoice.paidAmount.toLocaleString()} ج</span>
              </div>
              {printableInvoice.remainingAmount > 0 && (
                <div className="flex justify-between text-rose-800 font-bold">
                  <span>المتبقي بالآجل:</span>
                  <span>{printableInvoice.remainingAmount.toLocaleString()} ج</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
