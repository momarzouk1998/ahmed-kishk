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
  phone?: string;
  customerPhone?: string;
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

const SALES_INVOICES_KEY = 'ahmed_kishk_sales_invoices_v1';
const SALES_RETURNS_KEY = 'ahmed_kishk_sales_returns_v1';

export default function FabricSalesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'RETURNS'>('INVOICES');
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [returns, setReturns] = useState<CustomerSalesReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected Invoice Modal for Full View & Print
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  // Modals & Edit States
  const [showAddReturnModal, setShowAddReturnModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [editingReturn, setEditingReturn] = useState<CustomerSalesReturn | null>(null);

  // Create Return Form State
  const [retCustName, setRetCustName] = useState('');
  const [retCustPhone, setRetCustPhone] = useState('');
  const [retInvNumber, setRetInvNumber] = useState('');
  const [retReason, setRetReason] = useState('عيوب في القماش');
  const [retItemsDetail, setRetItemsDetail] = useState('');
  const [retAmount, setRetAmount] = useState<number>(500);
  const [retMethod, setRetMethod] = useState<CustomerSalesReturn['refundMethod']>('نقدي');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fabric-sales', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.sales)) {
          setInvoices(json.sales);
          localStorage.setItem(SALES_INVOICES_KEY, JSON.stringify(json.sales));
        }
      } else {
        const rawI = localStorage.getItem(SALES_INVOICES_KEY);
        if (rawI) setInvoices(JSON.parse(rawI));
      }
    } catch (e) {
      console.error(e);
      const rawI = localStorage.getItem(SALES_INVOICES_KEY);
      if (rawI) setInvoices(JSON.parse(rawI));
    }

    try {
      const rawR = localStorage.getItem(SALES_RETURNS_KEY);
      if (rawR) setReturns(JSON.parse(rawR));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
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

  const handleDeleteInvoice = async (id: string, num: string) => {
    if (confirm(`هل أنت متأكد من حذف فاتورة المبيعات (${num})؟`)) {
      const updated = invoices.filter(i => i.id !== id);
      await saveInvoicesState(updated);
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    }
  };

  const handleDeleteReturn = (id: string, num: string) => {
    if (confirm(`هل أنت متأكد من حذف إذن مرتجع المبيعات (${num})؟`)) {
      saveReturnsState(returns.filter(r => r.id !== id));
    }
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const remaining = Math.max(0, editingInvoice.totalAmount - editingInvoice.paidAmount);
    const statusLabel: SalesInvoice['status'] =
      remaining === 0 ? 'تم السداد بالكامل' : editingInvoice.paidAmount > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';

    const updatedObj = { ...editingInvoice, remainingAmount: remaining, status: statusLabel };
    const updatedList = invoices.map(i => i.id === editingInvoice.id ? updatedObj : i);
    await saveInvoicesState(updatedList);
    setEditingInvoice(null);
    if (selectedInvoice?.id === editingInvoice.id) setSelectedInvoice(updatedObj);
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
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const custPhone = inv.phone || inv.customerPhone || '';
    const matchSearch =
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      custPhone.includes(search);

    const matchPayment = paymentFilter === 'all' || inv.paymentMethod === paymentFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchPayment && matchStatus;
  });

  // Filtered Returns
  const filteredReturns = returns.filter(ret => {
    return (
      (ret.customerName && ret.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (ret.returnNumber && ret.returnNumber.toLowerCase().includes(search.toLowerCase())) ||
      (ret.invoiceNumber && ret.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
    );
  });

  // Metrics
  const totalSalesRevenue = filteredInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  const totalSalesPaid = filteredInvoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
  const totalSalesRemaining = filteredInvoices.reduce((s, i) => s + (Number(i.remainingAmount) || 0), 0);
  const totalReturnsAmount = filteredReturns.reduce((s, r) => s + (Number(r.refundAmount) || 0), 0);

  return (
    <PageShell title="فواتير المبيعات ومردودات العملاء">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 justify-between items-center gap-2 pb-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('INVOICES')}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'INVOICES' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>🛒 فواتير المبيعات</span>
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">{invoices.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RETURNS')}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'RETURNS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>↩️ مرتجعات العملاء</span>
              <span className="bg-rose-100 text-rose-950 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">{returns.length}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/fabric-sales/new')}
              className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SALES INVOICES */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-4">
            
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block text-[11px]">إجمالي المبيعات</span>
                <strong className="text-lg font-black text-slate-900 mt-0.5 block font-mono">{totalSalesRevenue.toLocaleString()} ج</strong>
              </div>

              <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block text-[11px]">المحصل نقداً / إلكتروني</span>
                <strong className="text-lg font-black text-emerald-950 mt-0.5 block font-mono">{totalSalesPaid.toLocaleString()} ج</strong>
              </div>

              <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200 text-center shadow-3xs">
                <span className="text-rose-800 font-bold block text-[11px]">المتبقي بالآجل</span>
                <strong className="text-lg font-black text-rose-950 mt-0.5 block font-mono">{totalSalesRemaining.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block text-[11px]">عدد الفواتير</span>
                <strong className="text-lg font-black text-amber-950 mt-0.5 block font-mono">{filteredInvoices.length} فاتورة</strong>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="relative sm:col-span-6">
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="بحث برقم الفاتورة، اسم العميل، أو الهاتف..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل طرق الدفع</option>
                  <option value="نقدي">💵 نقدي (كاش)</option>
                  <option value="إنستاباي">⚡ إنستاباي</option>
                  <option value="فودافون كاش">📱 فودافون كاش</option>
                  <option value="فيزا / كارت">💳 فيزا / كارت</option>
                  <option value="بالآجل / دفعات">⏳ بالآجل / دفعات</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل حالات السداد</option>
                  <option value="تم السداد بالكامل">تم السداد بالكامل</option>
                  <option value="مسدد جزئياً">مسدد جزئياً</option>
                  <option value="آجل / غير مسدد">آجل / غير مسدد</option>
                </select>
              </div>
            </div>

            {/* Clean & Spacious Invoices Table (Click Row to Open Invoice) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 pr-4">رقم الفاتورة</th>
                      <th className="p-3.5">العميل والفرع</th>
                      <th className="p-3.5 text-center">طريقة الدفع</th>
                      <th className="p-3.5 text-center font-mono">الخصم</th>
                      <th className="p-3.5 text-center font-mono">الإجمالي</th>
                      <th className="p-3.5 text-center font-mono">المدفوع / المتبقي</th>
                      <th className="p-3.5 text-center">الحالة</th>
                      <th className="p-3.5 text-center w-[70px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد فواتير مبيعات مسجلة
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map(inv => {
                        const paid = Number(inv.paidAmount) || 0;
                        const remaining = Number(inv.remainingAmount) || 0;
                        const phone = inv.phone || inv.customerPhone || '';
                        const isFullyPaid = remaining <= 0;
                        const isPartial = paid > 0 && remaining > 0;

                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setSelectedInvoice(inv)}
                            className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                            title="اضغط لفتح وعرض وطباعة تفاصيل الفاتورة"
                          >
                            {/* Invoice Number & Date */}
                            <td className="p-3.5 pr-4">
                              <div className="font-mono font-black text-amber-800 text-xs group-hover:text-amber-600 transition-colors">
                                {inv.invoiceNumber}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {inv.date ? formatDateOnly(inv.date) : 'غير محدد'}
                              </div>
                            </td>

                            {/* Customer Name & Phone */}
                            <td className="p-3.5 text-slate-700">
                              <div className="font-bold text-slate-900 text-sm">{inv.customerName}</div>
                              <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{phone || inv.branch}</div>
                            </td>

                            {/* Payment Method */}
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {inv.paymentMethod}
                              </span>
                            </td>

                            {/* Discount */}
                            <td className="p-3.5 text-center font-mono text-[11px]">
                              {(Number(inv.discountAmount) || 0) > 0 ? (
                                <span className="text-amber-800 font-bold">-{Number(inv.discountAmount).toLocaleString()} ج</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Net Total */}
                            <td className="p-3.5 text-center font-mono font-black text-sm text-slate-950">
                              {(Number(inv.totalAmount) || 0).toLocaleString()} ج
                            </td>

                            {/* Paid / Remaining */}
                            <td className="p-3.5 text-center font-mono text-[11px]">
                              <div className="text-emerald-700 font-bold">مدفوع: {paid.toLocaleString()} ج</div>
                              {remaining > 0 && (
                                <div className="text-rose-700 font-bold">متبقي: {remaining.toLocaleString()} ج</div>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="p-3.5 text-center">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 whitespace-nowrap">
                                  مسدد بالكامل ✓
                                </span>
                              ) : isPartial ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap">
                                  مسدد جزئياً
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-200 whitespace-nowrap">
                                  آجل / غير مسدد
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="عرض وطباعة"
                                >
                                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                                  className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="حذف الفاتورة"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
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
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                <span>+ تسجيل إذن مرتجع</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block text-[11px]">إجمالي مبالغ المرتجعات</span>
                <strong className="text-lg font-black text-rose-950 mt-0.5 block font-mono">{totalReturnsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block text-[11px]">عدد عمليات الإرجاع</span>
                <strong className="text-lg font-black text-slate-900 mt-0.5 block font-mono">{filteredReturns.length} عملية</strong>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block text-[11px]">المرتجع نقداً (كاش)</span>
                <strong className="text-lg font-black text-amber-950 mt-0.5 block font-mono">
                  {filteredReturns.filter(r => r.refundMethod === 'نقدي').reduce((s, r) => s + (Number(r.refundAmount) || 0), 0).toLocaleString()} ج
                </strong>
              </div>
            </div>

            {/* Returns Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">رقم الإذن والتاريخ</th>
                      <th className="p-3.5">العميل والفاتورة</th>
                      <th className="p-3.5">سبب الإرجاع والخامة</th>
                      <th className="p-3.5 font-mono text-center">المبلغ المسترد</th>
                      <th className="p-3.5 text-center">طريقة الرد</th>
                      <th className="p-3.5 text-center w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReturns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد أذونات مرتجعات مسجلة
                        </td>
                      </tr>
                    ) : (
                      filteredReturns.map(ret => (
                        <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            <span className="font-mono text-rose-800 text-xs block">{ret.returnNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{ret.date ? formatDateOnly(ret.date) : 'غير محدد'}</span>
                          </td>

                          <td className="p-3.5 text-slate-700">
                            <div className="font-bold text-slate-900">{ret.customerName}</div>
                            <div className="text-slate-400 font-mono text-[11px]">فاتورة: {ret.invoiceNumber}</div>
                          </td>

                          <td className="p-3.5 text-slate-700">
                            <div className="font-bold text-slate-900">{ret.reason}</div>
                            <div className="text-slate-400 text-[11px]">{ret.itemsDetail}</div>
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-sm text-rose-700">
                            -{(Number(ret.refundAmount) || 0).toLocaleString()} ج
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-950 border border-slate-200">
                              {ret.refundMethod}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteReturn(ret.id, ret.returnNumber)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف المرتجع"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 OPEN INVOICE MODAL (عرض تفاصيل الفاتورة والطباعة) */}
      {selectedInvoice && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-sales-invoice, #printable-sales-invoice * { visibility: visible !important; }
              #printable-sales-invoice { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div id="printable-sales-invoice" className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 text-slate-900 border border-slate-200 my-auto shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* Modal Control Header */}
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-2xl">receipt_long</span>
                <div>
                  <h3 className="font-black text-sm text-slate-950 flex items-center gap-2">
                    <span>فاتورة مبيعات:</span>
                    <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg font-mono text-xs border border-amber-300">
                      {selectedInvoice.invoiceNumber}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedInvoice.branch} — {selectedInvoice.date ? formatDateOnly(selectedInvoice.date) : ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>طباعة الفاتورة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
              <h2 className="font-display font-black text-xl text-slate-950">مؤسسة أحمد كشك للأقمشة والستائر</h2>
              <p className="text-xs text-slate-600 font-bold">{selectedInvoice.branch}</p>
              <div className="flex justify-between text-xs font-mono pt-2 text-slate-700">
                <span><strong>رقم الفاتورة:</strong> {selectedInvoice.invoiceNumber}</span>
                <span><strong>التاريخ:</strong> {selectedInvoice.date}</span>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div><strong>اسم العميل:</strong> {selectedInvoice.customerName}</div>
              <div><strong>رقم الهاتف:</strong> {selectedInvoice.phone || selectedInvoice.customerPhone || '—'}</div>
              <div><strong>طريقة الدفع:</strong> {selectedInvoice.paymentMethod}</div>
              <div><strong>الفرع:</strong> {selectedInvoice.branch}</div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-slate-900 border-r-4 border-amber-500 pr-2">
                الأصناف والأقمشة المشتراة ({selectedInvoice.items ? selectedInvoice.items.length : 0}):
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">الصنف والكود</th>
                      <th className="p-2.5 font-mono text-center">السعر</th>
                      <th className="p-2.5 font-mono text-center">الأمتار</th>
                      <th className="p-2.5 font-mono text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!selectedInvoice.items || selectedInvoice.items.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 font-bold">
                          لا توجد أصناف مضافة في الفاتورة
                        </td>
                      </tr>
                    ) : (
                      selectedInvoice.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900 block">{it.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{it.code}</span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-700">{it.pricePerMeter} ج</td>
                          <td className="p-2.5 text-center font-mono font-black text-amber-900">{it.meters} م</td>
                          <td className="p-2.5 text-center font-mono font-black text-slate-950">{it.totalPrice} ج</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs font-bold shadow-md">
              <div className="flex justify-between text-slate-300">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{selectedInvoice.subtotal || selectedInvoice.totalAmount} ج.م</span>
              </div>

              {(selectedInvoice.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono">- {selectedInvoice.discountAmount} ج.م</span>
                </div>
              )}

              <div className="flex justify-between text-white border-t border-slate-800 pt-2 text-sm font-black">
                <span>صافي الفاتورة الإجمالي:</span>
                <span className="font-mono text-base text-amber-400">{selectedInvoice.totalAmount.toLocaleString()} ج.م</span>
              </div>

              <div className="border-t border-slate-800 pt-2 flex justify-between">
                <span className="text-emerald-400">المدفوع ({selectedInvoice.paymentMethod}):</span>
                <span className="font-mono text-emerald-400">{selectedInvoice.paidAmount.toLocaleString()} ج.م</span>
              </div>

              {(selectedInvoice.remainingAmount || 0) > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>المتبقي بالآجل:</span>
                  <span className="font-mono">{selectedInvoice.remainingAmount.toLocaleString()} ج.م</span>
                </div>
              )}
            </div>

            {/* Footer Notes */}
            {selectedInvoice.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <strong>ملاحظات:</strong> {selectedInvoice.notes}
              </div>
            )}

            <div className="no-print pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ➕ Modal: Add Sales Return */}
      {showAddReturnModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تسجيل طلب إرجاع مبيعات (مرتجع)</h3>
              <button onClick={() => setShowAddReturnModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم العميل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد العزيز"
                  value={retCustName}
                  onChange={e => setRetCustName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الفاتورة الأصلية (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: INV-2026-101"
                  value={retInvNumber}
                  onChange={e => setRetInvNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المسترد (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={retAmount}
                  onChange={e => setRetAmount(Number(e.target.value))}
                  className="w-full border border-rose-300 rounded-xl px-3 py-2 font-mono font-black text-rose-950 bg-rose-50/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">سبب المرتجع:</label>
                <select
                  value={retReason}
                  onChange={e => setRetReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none"
                >
                  <option value="عيوب في القماش">عيوب تصنيع / نسج في القماش</option>
                  <option value="خطأ في المقاسات / الأمتار">خطأ في الأمتار أو القص</option>
                  <option value="اختلاف درجة اللون عن العينة">اختلاف درجة اللون عن العينة</option>
                  <option value="رغبة العميل (استبدال / إلغاء)">رغبة العميل (استبدال / إلغاء)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">تفاصيل الأصناف المرتجعة:</label>
                <textarea
                  rows={2}
                  placeholder="مثال: مرتجع ٣ متر شيفون حرير أبيض..."
                  value={retItemsDetail}
                  onChange={e => setRetItemsDetail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة رد المبلغ:</label>
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  {(['نقدي', 'إنستاباي', 'فودافون كاش', 'إضافة لرصيد العميل'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRetMethod(m)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        retMethod === m ? 'bg-rose-600 text-white font-black border-rose-700 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl cursor-pointer shadow-xs text-xs"
                >
                  حفظ المرتجع ✓
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddReturnModal(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs"
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
