'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { formatDateOnly, getTodayDateStr, getYesterdayDateStr } from '@/lib/dateUtils';
import FabricSalesPrintModal from '@/components/FabricSalesPrintModal';
import PdfPrintButton from '@/components/PdfPrintButton';

import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { normalizeBranchName } from '@/lib/branches';
import Pagination from '@/components/Pagination';

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
  paymentMethod: 'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'فيزا / كارت' | 'بالآجل / دفعات' | 'دفع متعدد / مزيج' | string;
  splitPayments?: {
    cash?: number;
    instapay?: number;
    vodafone?: number;
    visa?: number;
  };
  paidAmount: number;
  remainingAmount: number;
  status: 'تم السداد بالكامل' | 'مسدد جزئياً' | 'آجل / غير مسدد';
  notes?: string;
  isOnlineOrder?: boolean;
  shippingFee?: number;
  shippingCompany?: string;
  trackingNumber?: string;
  shippingAddress?: string;
  receiverPhone?: string;
  orderSource?: string;
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

export type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

export default function FabricSalesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'ONLINE' | 'RETURNS'>('INVOICES');
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [returns, setReturns] = useState<CustomerSalesReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse URL tab parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'online') {
        setActiveTab('ONLINE');
      } else if (tabParam === 'returns') {
        setActiveTab('RETURNS');
      }
    }
  }, []);

  // Filters (افتراضي اليوم)
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Pagination (30 فواتير لكل صفحة)
  const PAGE_SIZE = 30;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, dateFrom, dateTo, branchFilter, search, paymentFilter, statusFilter]);

  const { user: currentUser, isAdmin, isSuperAdmin } = useCurrentUser();
  const canViewOnlineTab = isAdmin || isSuperAdmin || normalizeBranchName(currentUser?.branch) === 'الفرع التجاري';

  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setBranchFilter(currentUser.branch);
  }, [isAdmin, currentUser]);

  useEffect(() => {
    if (!canViewOnlineTab && activeTab === 'ONLINE') {
      setActiveTab('INVOICES');
    }
  }, [canViewOnlineTab, activeTab]);

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

  // #FIX: كانت بترجع لنسخة قديمة محفوظة على قرص الجهاز (localStorage) لو الطلب فشل —
  // ده اللي بيسبب ظهور بيانات قديمة/غلط. دلوقتى مفيش أى تخزين على القرص، والمرتجعات
  // بقى لها جدول Prisma حقيقى (PurchaseReturn/SalesReturn) بدل localStorage.
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fabric-sales', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.sales)) {
          setInvoices(json.sales);
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const retRes = await fetch('/api/sales-returns', { cache: 'no-store' });
      if (retRes.ok) {
        const retJson = await retRes.json();
        if (retJson.success && Array.isArray(retJson.returns)) {
          setReturns(retJson.returns);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // state محلى فقط (فى ذاكرة الصفحة، مش على القرص) — التحديث الحقيقى للسيرفر يتم
  // بشكل مباشر فى كل مكان يستدعيها (حذف حقيقى، أو POST لـ /api/fabric-sales).
  const saveInvoicesState = (list: SalesInvoice[]) => {
    setInvoices(list);
  };

  const saveReturnsState = (list: CustomerSalesReturn[]) => {
    setReturns(list);
  };

  const handleDeleteInvoice = async (id: string, num: string) => {
    if (!confirm(`هل أنت متأكد من حذف فاتورة المبيعات (${num})؟`)) return;
    const updated = invoices.filter(i => i.id !== id);
    await saveInvoicesState(updated);
    if (selectedInvoice?.id === id) setSelectedInvoice(null);
    // #FIX: حذف حقيقى من قاعدة البيانات — كان يرجع بعد أى ريفريش
    try {
      await fetch(`/api/system-data?key=${SALES_INVOICES_KEY}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete invoice from server:', err);
    }
  };

  const handleDeleteReturn = async (id: string, num: string) => {
    if (!confirm(`هل أنت متأكد من حذف إذن مرتجع المبيعات (${num})؟`)) return;
    saveReturnsState(returns.filter(r => r.id !== id));
    try {
      await fetch(`/api/sales-returns?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete sales return from server:', err);
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
    setInvoices(updatedList);

    // #FIX: كان التعديل بيتحفظ فى blob مفتاحه مش متعرَّف عليه فى POST /api/system-data
    // فكان يرجع للحالة القديمة بعد أى ريفريش. دلوقتى بيتحفظ مباشرة فى جدول الفاتورة الحقيقى
    // (نفس الـ endpoint اللى فاتورة جديدة بتتحفظ بيه من fabric-sales/new).
    try {
      await fetch('/api/fabric-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedObj),
      });
    } catch (err) {
      console.error('Failed to save invoice update to server:', err);
    }

    setEditingInvoice(null);
    if (selectedInvoice?.id === editingInvoice.id) setSelectedInvoice(updatedObj);
  };

  // Item editing helpers for Edit Invoice Modal
  const handleEditItemChange = (index: number, field: keyof SalesInvoiceItem, value: any) => {
    if (!editingInvoice) return;
    const currentItems = Array.isArray(editingInvoice.items) ? [...editingInvoice.items] : [];
    if (!currentItems[index]) return;

    // #FIX (باغ "5 متر و53 سم" فى بوليصة الشحن): value جاي من e.target.value
    // نص خام دايمًا — كان بيتخزن كده زي ما هو (string) فى meters/pricePerMeter،
    // فأي جمع بعد كده (زي إجمالي الأمتار فى الطباعة) كان بيعمل concatenation
    // نصوص بدل جمع أرقام (3 + 2.5 + "3" = "5.53" مش 8.5) لأي بند اتعدّل من هنا.
    const numericValue = (field === 'meters' || field === 'pricePerMeter') ? (Number(value) || 0) : value;
    const updatedItem = { ...currentItems[index], [field]: numericValue };
    if (field === 'meters' || field === 'pricePerMeter') {
      const m = Number(field === 'meters' ? numericValue : updatedItem.meters) || 0;
      const p = Number(field === 'pricePerMeter' ? numericValue : updatedItem.pricePerMeter) || 0;
      updatedItem.totalPrice = Math.round(m * p * 100) / 100;
    }
    currentItems[index] = updatedItem;

    const newSubtotal = currentItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
    const disc = Number(editingInvoice.discountAmount) || 0;
    const newTotal = Math.max(0, Math.round((newSubtotal - disc) * 100) / 100);

    const wasFullyPaid = (Number(editingInvoice.paidAmount) || 0) >= (Number(editingInvoice.totalAmount) || 0);
    const newPaid = wasFullyPaid ? newTotal : Math.min(Number(editingInvoice.paidAmount) || 0, newTotal);
    const newRemaining = Math.max(0, newTotal - newPaid);

    setEditingInvoice({
      ...editingInvoice,
      items: currentItems,
      subtotal: newSubtotal,
      totalAmount: newTotal,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
    });
  };

  const handleEditAddItem = () => {
    if (!editingInvoice) return;
    const currentItems = Array.isArray(editingInvoice.items) ? [...editingInvoice.items] : [];
    const newItem: SalesInvoiceItem = {
      code: `ITEM-${Date.now().toString().slice(-4)}`,
      name: 'صنف قماش جديد',
      meters: 1,
      pricePerMeter: 100,
      totalPrice: 100,
    };
    currentItems.push(newItem);

    const newSubtotal = currentItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
    const disc = Number(editingInvoice.discountAmount) || 0;
    const newTotal = Math.max(0, Math.round((newSubtotal - disc) * 100) / 100);

    const wasFullyPaid = (Number(editingInvoice.paidAmount) || 0) >= (Number(editingInvoice.totalAmount) || 0);
    const newPaid = wasFullyPaid ? newTotal : Math.min(Number(editingInvoice.paidAmount) || 0, newTotal);
    const newRemaining = Math.max(0, newTotal - newPaid);

    setEditingInvoice({
      ...editingInvoice,
      items: currentItems,
      subtotal: newSubtotal,
      totalAmount: newTotal,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
    });
  };

  const handleEditDeleteItem = (index: number) => {
    if (!editingInvoice) return;
    const currentItems = Array.isArray(editingInvoice.items) ? [...editingInvoice.items] : [];
    currentItems.splice(index, 1);

    const newSubtotal = currentItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
    const disc = Number(editingInvoice.discountAmount) || 0;
    const newTotal = Math.max(0, Math.round((newSubtotal - disc) * 100) / 100);

    const wasFullyPaid = (Number(editingInvoice.paidAmount) || 0) >= (Number(editingInvoice.totalAmount) || 0);
    const newPaid = wasFullyPaid ? newTotal : Math.min(Number(editingInvoice.paidAmount) || 0, newTotal);
    const newRemaining = Math.max(0, newTotal - newPaid);

    setEditingInvoice({
      ...editingInvoice,
      items: currentItems,
      subtotal: newSubtotal,
      totalAmount: newTotal,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
    });
  };

  // Submit Sales Return
  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retCustName.trim() || retAmount <= 0) return;

    const retNum = `RET-2026-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
    const newRet: CustomerSalesReturn = {
      id: `RET-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      returnNumber: retNum,
      date: getTodayDateStr(),
      invoiceNumber: retInvNumber.trim() || '—',
      customerName: retCustName.trim(),
      customerPhone: retCustPhone.trim(),
      reason: retReason,
      itemsDetail: retItemsDetail.trim() || 'مرتجع قماش ستائر',
      refundAmount: retAmount,
      refundMethod: retMethod,
    };

    saveReturnsState([newRet, ...returns]);
    try {
      await fetch('/api/sales-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRet),
      });
    } catch (err) {
      console.error(err);
    }

    setShowAddReturnModal(false);
    setRetCustName('');
    setRetCustPhone('');
    setRetItemsDetail('');
    setRetAmount(500);
  };

  // Date & Branch helpers (Cairo local time 12:00 AM boundary)
  const matchesDate = (invDateStr: string | undefined): boolean => {
    if (!invDateStr) return dateFilter === 'all';
    const d = getTodayDateStr(invDateStr) || invDateStr.split('T')[0].split(' ')[0];
    const today = getTodayDateStr();

    if (dateFrom || dateTo) {
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    }

    if (dateFilter === 'today') return d === today;
    if (dateFilter === 'yesterday') {
      const yesterday = getYesterdayDateStr();
      return d === yesterday;
    }
    if (dateFilter === 'week') {
      const todayDate = new Date(today);
      const itemDate = new Date(d);
      const diffDays = (todayDate.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (dateFilter === 'month') {
      return d.substring(0, 7) === today.substring(0, 7);
    }
    return true;
  };

  const matchesBranch = (branchStr: string | undefined): boolean => {
    if (!branchFilter || branchFilter === 'ALL' || branchFilter === 'الكل') return true;
    return normalizeBranchName(branchStr) === normalizeBranchName(branchFilter);
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const custPhone = inv.phone || inv.customerPhone || '';
    const matchSearch =
      !search.trim() ||
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      custPhone.includes(search);

    const invMethod: string = (inv.paymentMethod || (inv as any).paymentType || 'نقدي') as string;
    const matchPayment =
      paymentFilter === 'all' ||
      invMethod === paymentFilter ||
      (paymentFilter === 'نقدي' && (invMethod === 'نقدي' || invMethod === 'كاش' || invMethod === 'نقدي (كاش)')) ||
      (paymentFilter === 'إنستاباي' && (invMethod.includes('إنستا') || invMethod.includes('انستا') || invMethod.toLowerCase().includes('insta'))) ||
      (paymentFilter === 'فودافون كاش' && (invMethod.includes('فودافون') || invMethod.toLowerCase().includes('vodafone'))) ||
      (paymentFilter === 'فيزا / كارت' && (invMethod.includes('فيزا') || invMethod.includes('كارت') || invMethod.toLowerCase().includes('visa'))) ||
      (paymentFilter === 'بالآجل / دفعات' && (invMethod.includes('آجل') || invMethod.includes('دفعات'))) ||
      (paymentFilter === 'دفع متعدد / مزيج' && (invMethod.includes('متعدد') || invMethod.includes('مزيج')));

    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchDate = matchesDate(inv.date);
    const matchBr = matchesBranch(inv.branch);

    return matchSearch && matchPayment && matchStatus && matchDate && matchBr;
  });

  // Filtered Online Invoices (الفرع التجاري أو شحن أونلاين)
  const filteredOnlineInvoices = invoices.filter(inv => {
    const isOnline = !!inv.isOnlineOrder;
    if (!isOnline) return false;

    const custPhone = inv.phone || inv.customerPhone || inv.receiverPhone || '';
    const matchSearch =
      !search.trim() ||
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (inv.trackingNumber && inv.trackingNumber.toLowerCase().includes(search.toLowerCase())) ||
      (inv.shippingAddress && inv.shippingAddress.toLowerCase().includes(search.toLowerCase())) ||
      custPhone.includes(search);

    const matchDate = matchesDate(inv.date);
    return matchSearch && matchDate;
  });

  // Filtered Returns
  const filteredReturns = returns.filter(ret => {
    const matchSearch =
      !search.trim() ||
      (ret.customerName && ret.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (ret.returnNumber && ret.returnNumber.toLowerCase().includes(search.toLowerCase())) ||
      (ret.invoiceNumber && ret.invoiceNumber.toLowerCase().includes(search.toLowerCase()));

    const matchDate = matchesDate(ret.date);
    return matchSearch && matchDate;
  });

  // Metrics
  const totalSalesRevenue = filteredInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  const totalSalesPaid = filteredInvoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
  const totalSalesRemaining = filteredInvoices.reduce((s, i) => s + (Number(i.remainingAmount) || 0), 0);
  const totalReturnsAmount = filteredReturns.reduce((s, r) => s + (Number(r.refundAmount) || 0), 0);

  // Online Metrics
  const totalOnlineRevenue = filteredOnlineInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  const totalOnlineShipping = filteredOnlineInvoices.reduce((s, i) => s + (Number(i.shippingFee) || (i.isOnlineOrder ? 110 : 0)), 0);
  const totalOnlinePaid = filteredOnlineInvoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
  const totalOnlineCOD = filteredOnlineInvoices.reduce((s, i) => s + (Number(i.remainingAmount) || 0), 0);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedInvoices = filteredInvoices.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  return (
    <PageShell title="فواتير المبيعات ومردودات العملاء">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12" id="print-area">

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row border-b border-slate-200 sm:justify-between items-stretch sm:items-center gap-2 pb-1">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('INVOICES')}
              className={`pb-2.5 px-3 sm:px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'INVOICES' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>🛒 فواتير المبيعات</span>
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">{invoices.length}</span>
            </button>

            {canViewOnlineTab && (
              <button
                type="button"
                onClick={() => setActiveTab('ONLINE')}
                className={`pb-2.5 px-3 sm:px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'ONLINE' ? 'border-blue-600 text-blue-950 font-black' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <span>📦 شحنات وفواتير الأونلاين</span>
                <span className="bg-blue-100 text-blue-950 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">
                  {invoices.filter(i => i.isOnlineOrder).length}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('RETURNS')}
              className={`pb-2.5 px-3 sm:px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'RETURNS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>↩️ مرتجعات العملاء</span>
              <span className="bg-rose-100 text-rose-950 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">{returns.length}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PdfPrintButton
              documentTitle={activeTab === 'INVOICES' ? 'قائمة-فواتير-المبيعات' : 'قائمة-مرتجعات-العملاء'}
              label="طباعة PDF"
            />
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

            {/* Quick Date Filters & Search / Advanced Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Quick Date Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200 text-xs font-bold overflow-x-auto">
                  {(
                    [
                      { key: 'yesterday', label: 'أمس' },
                      { key: 'today', label: 'اليوم' },
                      { key: 'week', label: 'الأسبوع' },
                      { key: 'month', label: 'الشهر' },
                      { key: 'all', label: 'الكل' },
                    ] as { key: DateFilterType; label: string }[]
                  ).map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setDateFilter(t.key);
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        dateFilter === t.key && !dateFrom && !dateTo
                          ? 'bg-amber-500 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Advanced Filter Button */}
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer ${
                    (paymentFilter !== 'all' || statusFilter !== 'all' || (branchFilter !== 'ALL' && branchFilter !== 'الكل') || dateFrom || dateTo)
                      ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  <span>تصفية الفواتير المتقدمة</span>
                  {(paymentFilter !== 'all' || statusFilter !== 'all' || (branchFilter !== 'ALL' && branchFilter !== 'الكل') || dateFrom || dateTo) && (
                    <span className="bg-amber-500 text-white text-[10px] w-4 h-4 rounded-full inline-flex items-center justify-center font-bold font-mono">
                      {(paymentFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + ((branchFilter !== 'ALL' && branchFilter !== 'الكل') ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* Live Search Input */}
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="بحث سريع برقم الفاتورة، اسم العميل، أو الهاتف..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs text-xs bg-slate-50"
                />
              </div>

              {/* Active Filter Badges Summary */}
              {(paymentFilter !== 'all' || statusFilter !== 'all' || (branchFilter !== 'ALL' && branchFilter !== 'الكل') || dateFrom || dateTo) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                  <span className="text-slate-400 font-bold">فلاتر نشطة:</span>
                  {branchFilter !== 'ALL' && branchFilter !== 'الكل' && (
                    <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      الفرع: {branchFilter}
                      <button type="button" onClick={() => setBranchFilter('ALL')} className="text-slate-400 hover:text-slate-700">✕</button>
                    </span>
                  )}
                  {paymentFilter !== 'all' && (
                    <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      الدفع: {paymentFilter}
                      <button type="button" onClick={() => setPaymentFilter('all')} className="text-slate-400 hover:text-slate-700">✕</button>
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      الحالة: {statusFilter}
                      <button type="button" onClick={() => setStatusFilter('all')} className="text-slate-400 hover:text-slate-700">✕</button>
                    </span>
                  )}
                  {(dateFrom || dateTo) && (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      التاريخ: {dateFrom || 'من البداية'} إلى {dateTo || 'الآن'}
                      <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-amber-700 hover:text-amber-950">✕</button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentFilter('all');
                      setStatusFilter('all');
                      setBranchFilter('ALL');
                      setDateFrom('');
                      setDateTo('');
                      setDateFilter('today');
                    }}
                    className="text-rose-600 hover:underline text-[10px] font-bold mr-1 cursor-pointer"
                  >
                    إلغاء كل الفلاتر
                  </button>
                </div>
              )}
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
                    {paginatedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد فواتير مبيعات مطابقة للفلاتر
                        </td>
                      </tr>
                    ) : (
                      paginatedInvoices.map(inv => {
                        const paid = Number(inv.paidAmount) || 0;
                        const remaining = Number(inv.remainingAmount) || 0;
                        const phone = inv.phone || inv.customerPhone || '';
                        const isFullyPaid = remaining <= 0;
                        const isPartial = paid > 0 && remaining > 0;
                        const pMethod = inv.paymentMethod || (inv as any).paymentType || 'نقدي';

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
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-sm">{inv.customerName}</span>
                                {inv.isOnlineOrder && (
                                  <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] px-1.5 py-0.2 rounded-md font-bold inline-flex items-center gap-0.5">
                                    <span>📦</span>
                                    <span>{inv.shippingCompany || 'أونلاين'}</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-1.5 mt-0.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{inv.branch}</span>
                                {phone && <span dir="ltr">{phone}</span>}
                              </div>
                            </td>

                            {/* Payment Method Badge */}
                            <td className="p-3.5 text-center">
                              {pMethod.includes('إنستا') || pMethod.includes('انستا') || pMethod.toLowerCase().includes('insta') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-3xs">
                                  <span>⚡</span>
                                  <span>إنستاباي</span>
                                </span>
                              ) : pMethod.includes('فودافون') || pMethod.toLowerCase().includes('vodafone') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-3xs">
                                  <span>📱</span>
                                  <span>فودافون كاش</span>
                                </span>
                              ) : pMethod.includes('فيزا') || pMethod.includes('كارت') || pMethod.toLowerCase().includes('visa') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 shadow-3xs">
                                  <span>💳</span>
                                  <span>فيزا / كارت</span>
                                </span>
                              ) : pMethod.includes('متعدد') || pMethod.includes('مزيج') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-3xs">
                                  <span>🔀</span>
                                  <span>دفع متعدد</span>
                                </span>
                              ) : pMethod.includes('آجل') || pMethod.includes('دفعات') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-3xs">
                                  <span>⏳</span>
                                  <span>بالآجل</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-3xs">
                                  <span>💵</span>
                                  <span>كاش / نقدي</span>
                                </span>
                              )}
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
                                {inv.isOnlineOrder && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="بوليصة الشحن (Waybill)"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="عرض وطباعة إيصال الفاتورة"
                                >
                                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingInvoice(inv)}
                                  className="text-amber-600 hover:text-amber-700 p-1 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                  title="تعديل الفاتورة المحفوظة"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
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

              {/* Pagination Controls */}
              <Pagination
                currentPage={safeCurrentPage}
                totalItems={filteredInvoices.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemName="فاتورة"
              />
            </div>
          </div>
        )}

        {/* TAB 2: ONLINE ORDERS & COMMERCIAL BRANCH */}
        {activeTab === 'ONLINE' && canViewOnlineTab && (
          <div className="space-y-4">
            {/* Online Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block text-[11px]">إجمالي قيمة الشحنات والطلبات</span>
                <strong className="text-lg font-black text-slate-900 mt-0.5 block font-mono">{totalOnlineRevenue.toLocaleString()} ج</strong>
              </div>

              <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 text-center shadow-3xs">
                <span className="text-blue-900 font-bold block text-[11px]">إجمالي رسوم الشحن (110 ج)</span>
                <strong className="text-lg font-black text-blue-950 mt-0.5 block font-mono">{totalOnlineShipping.toLocaleString()} ج</strong>
              </div>

              <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block text-[11px]">المحصل مسبقاً (إنستا/فيزا)</span>
                <strong className="text-lg font-black text-emerald-950 mt-0.5 block font-mono">{totalOnlinePaid.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block text-[11px]">متبقي للتحصيل عند الاستلام (COD)</span>
                <strong className="text-lg font-black text-amber-950 mt-0.5 block font-mono">{totalOnlineCOD.toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Online Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 pr-4">رقم الفاتورة والتاريخ</th>
                      <th className="p-3.5">العميل والمستلم</th>
                      <th className="p-3.5">عنوان التوصيل وشركة الشحن</th>
                      <th className="p-3.5 font-mono text-center">أصناف الطرد</th>
                      <th className="p-3.5 font-mono text-center">الإجمالي والشحن</th>
                      <th className="p-3.5 font-mono text-center">التحصيل (COD)</th>
                      <th className="p-3.5 text-center">حالة السداد</th>
                      <th className="p-3.5 text-center w-[120px]">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOnlineInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                          <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">local_shipping</span>
                          لا توجد شحنات أو فواتير أونلاين مسجلة بعد
                        </td>
                      </tr>
                    ) : (
                      filteredOnlineInvoices.map(inv => {
                        const paid = Number(inv.paidAmount) || 0;
                        const remaining = Number(inv.remainingAmount) || 0;
                        const isFullyPaid = remaining <= 0;
                        const isPartial = paid > 0 && remaining > 0;
                        const shipFee = Number(inv.shippingFee) || 110;

                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setSelectedInvoice(inv)}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                            title="اضغط لفتح بوليصة الشحن وتفاصيل الفاتورة"
                          >
                            {/* Invoice Number & Date */}
                            <td className="p-3.5 pr-4 font-mono font-bold">
                              <div className="text-blue-900 font-black text-xs group-hover:text-blue-700">{inv.invoiceNumber}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{inv.date ? formatDateOnly(inv.date) : 'اليوم'}</div>
                              {inv.orderSource && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-bold">
                                  {inv.orderSource}
                                </span>
                              )}
                            </td>

                            {/* Customer & Phone */}
                            <td className="p-3.5 text-slate-700">
                              <div className="font-bold text-slate-900 text-sm">{inv.customerName}</div>
                              <div className="text-[10px] text-slate-500 font-mono font-bold mt-0.5" dir="ltr">
                                {inv.phone || inv.customerPhone || '—'}
                              </div>
                              {inv.receiverPhone && inv.receiverPhone !== inv.phone && (
                                <div className="text-[10px] text-blue-700 font-mono font-bold" dir="ltr">
                                  مستلم: {inv.receiverPhone}
                                </div>
                              )}
                            </td>

                            {/* Shipping Address & Company */}
                            <td className="p-3.5 text-slate-700 max-w-[200px]">
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-blue-600 shrink-0">local_shipping</span>
                                <span>{inv.shippingCompany || 'بوسطة'}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 truncate mt-0.5" title={inv.shippingAddress || 'العنوان غير مدخل'}>
                                {inv.shippingAddress || 'لم يحدد عنوان'}
                              </div>
                              {inv.trackingNumber && (
                                <div className="text-[10px] font-mono text-slate-500 font-bold">
                                  تتبع: {inv.trackingNumber}
                                </div>
                              )}
                            </td>

                            {/* Items count */}
                            <td className="p-3.5 text-center font-mono text-xs">
                              <span className="bg-slate-100 px-2 py-1 rounded-lg font-bold text-slate-800 border border-slate-200">
                                {Array.isArray(inv.items) ? inv.items.length : 1} أصناف
                              </span>
                            </td>

                            {/* Total and shipping fee */}
                            <td className="p-3.5 text-center font-mono text-xs">
                              <div className="font-black text-slate-950 text-sm">{(Number(inv.totalAmount) || 0).toLocaleString()} ج</div>
                              <div className="text-[10px] text-blue-700 font-bold">شحن: +{shipFee.toLocaleString()} ج</div>
                            </td>

                            {/* Paid / COD */}
                            <td className="p-3.5 text-center font-mono text-xs">
                              {remaining > 0 ? (
                                <div className="text-amber-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 font-black">
                                  COD: {remaining.toLocaleString()} ج
                                </div>
                              ) : (
                                <div className="text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 font-bold">
                                  مدفوع بالكامل
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-3.5 text-center">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 whitespace-nowrap">
                                  مسدد بالكامل ✓
                                </span>
                              ) : isPartial ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap">
                                  مسدد جزئياً
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-200 whitespace-nowrap">
                                  تحصيل عند الاستلام
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] px-2 py-1 rounded-lg font-black flex items-center gap-1 shadow-3xs cursor-pointer"
                                  title="طباعة بوليصة الشحن (Waybill)"
                                >
                                  <span>📦</span>
                                  <span>بوليصة</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="عرض وطباعة إيصال الفاتورة"
                                >
                                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingInvoice(inv)}
                                  className="text-amber-600 hover:text-amber-700 p-1 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                  title="تعديل الفاتورة"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
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

      {/* 🖨️ Fabric Sales Invoice Printable Modal */}
      <FabricSalesPrintModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        data={selectedInvoice}
      />

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
      {/* ✏️ Modal: Edit Saved Invoice (تعديل الفاتورة المحفوظة للأدمن ومدير الفرع) */}
      {editingInvoice && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-xl">edit_note</span>
                <h3 className="font-bold text-slate-900 text-sm">
                  تعديل فاتورة المبيعات: <span className="font-mono text-amber-800">{editingInvoice.invoiceNumber}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">اسم العميل:</label>
                  <input
                    type="text"
                    required
                    value={editingInvoice.customerName}
                    onChange={e => setEditingInvoice({ ...editingInvoice, customerName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={editingInvoice.phone || editingInvoice.customerPhone || ''}
                    onChange={e => setEditingInvoice({ ...editingInvoice, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">الفرع:</label>
                  {/* #FIX: كانت قائمة يدوية قديمة فيها 'فرع التجمع' الوهمي (مش
                      فرع حقيقي أبدًا) وناقصة 'الفرع التجاري' الفعلي — بدّلتها
                      بالقائمة الموحّدة الحقيقية (BRANCHES_LIST) زي باقي الصفحة. */}
                  <BranchSelect
                    value={editingInvoice.branch || 'الفرع الرئيسي'}
                    onChange={v => setEditingInvoice({ ...editingInvoice, branch: v })}
                    isAdmin={isAdmin || isSuperAdmin}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                    lockedClassName="w-full border border-slate-200 rounded-xl px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">طريقة السداد:</label>
                  <select
                    value={editingInvoice.paymentMethod || 'نقدي'}
                    onChange={e => setEditingInvoice({ ...editingInvoice, paymentMethod: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="نقدي">💵 كاش / نقدي</option>
                    <option value="فيزا / كارت">💳 فيزا / كارت</option>
                    <option value="إنستاباي">⚡ إنستاباي (InstaPay)</option>
                    <option value="فودافون كاش">📱 فودافون كاش</option>
                    <option value="بالآجل / دفعات">⏳ بالآجل / دفعات</option>
                    <option value="دفع متعدد / مزيج">🔀 دفع متعدد (مزيج)</option>
                  </select>
                </div>
              </div>

              {/* 📦 Online Order Toggle — كانت isOnlineOrder وباقي بيانات الشحن
                  بتتبعت من شاشة البيع لكن الـ API كان بيتجاهلها تمامًا فمكانش
                  فيه أي طريقة تتعدّل بعد الحفظ. دلوقتى بتتحفظ فعليًا. */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!editingInvoice.isOnlineOrder}
                    onChange={e => setEditingInvoice({ ...editingInvoice, isOnlineOrder: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                  <span className="font-black text-slate-900">📦 طلب شحن أونلاين</span>
                  <span className="text-[11px] text-slate-500">(بدّل الحالة لو الفاتورة دي بيع مباشر مش شحن، أو العكس)</span>
                </label>

                {editingInvoice.isOnlineOrder && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-200">
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">شركة الشحن:</label>
                      <input
                        type="text"
                        value={editingInvoice.shippingCompany || ''}
                        onChange={e => setEditingInvoice({ ...editingInvoice, shippingCompany: e.target.value })}
                        placeholder="مثال: بوسطة (Bosta)"
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">مصاريف الشحن (ج):</label>
                      <input
                        type="number"
                        min="0"
                        value={editingInvoice.shippingFee ?? 0}
                        onChange={e => setEditingInvoice({ ...editingInvoice, shippingFee: Number(e.target.value) || 0 })}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">رقم التتبع (Tracking):</label>
                      <input
                        type="text"
                        value={editingInvoice.trackingNumber || ''}
                        onChange={e => setEditingInvoice({ ...editingInvoice, trackingNumber: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">هاتف المستلم:</label>
                      <input
                        type="text"
                        value={editingInvoice.receiverPhone || ''}
                        onChange={e => setEditingInvoice({ ...editingInvoice, receiverPhone: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-slate-700 font-bold block mb-1">عنوان الشحن:</label>
                      <input
                        type="text"
                        value={editingInvoice.shippingAddress || ''}
                        onChange={e => setEditingInvoice({ ...editingInvoice, shippingAddress: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 🧵 Items and Fabrics Breakdown in Invoice - Clean Inline Table */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center pb-1">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                    <span className="material-symbols-outlined text-amber-600 text-base">inventory_2</span>
                    <span>بنود الفاتورة ({(editingInvoice.items || []).length}):</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEditAddItem}
                    className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[11px] shadow-sm transition-colors cursor-pointer"
                  >
                    <span>➕</span>
                    <span>إضافة بند جديد</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2 text-center w-8">#</th>
                        <th className="p-2">الصنف</th>
                        <th className="p-2 text-center w-24">الكمية (متر)</th>
                        <th className="p-2 text-center w-24">سعر المتر</th>
                        <th className="p-2 text-center w-28">الإجمالي</th>
                        <th className="p-2 text-center w-10">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!editingInvoice.items || editingInvoice.items.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-slate-400 font-bold text-xs">
                            لا توجد بنود مسجلة — اضغط "إضافة بند جديد"
                          </td>
                        </tr>
                      ) : (
                        editingInvoice.items.map((item, idx) => {
                          const lineTotal = Number(item.totalPrice) || ((Number(item.meters) || 0) * (Number(item.pricePerMeter) || 0));
                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-2 text-center font-mono font-bold text-slate-400 text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.name || ''}
                                  placeholder="الصنف..."
                                  onChange={e => handleEditItemChange(idx, 'name', e.target.value)}
                                  className="w-full font-bold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 focus:bg-white bg-slate-50/50"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.meters}
                                  onChange={e => handleEditItemChange(idx, 'meters', e.target.value)}
                                  className="w-full bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono font-black text-slate-900 text-xs text-center focus:outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.pricePerMeter}
                                  onChange={e => handleEditItemChange(idx, 'pricePerMeter', e.target.value)}
                                  className="w-full bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono font-black text-slate-900 text-xs text-center focus:outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <span className="inline-block w-full font-mono font-black text-amber-950 bg-amber-50 border border-amber-200 rounded-lg py-1.5 px-2 text-xs">
                                  {lineTotal.toLocaleString()} ج
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleEditDeleteItem(idx)}
                                  className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer transition-colors inline-flex items-center justify-center"
                                  title="حذف هذا البند"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial & Payment Edit */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">إجمالي الفاتورة:</label>
                    <input
                      type="number"
                      min="0"
                      value={editingInvoice.totalAmount}
                      onChange={e => setEditingInvoice({ ...editingInvoice, totalAmount: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-1 font-mono font-black text-slate-900 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">المدفوع الآن:</label>
                    <input
                      type="number"
                      min="0"
                      value={editingInvoice.paidAmount}
                      onChange={e => setEditingInvoice({ ...editingInvoice, paidAmount: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-1 font-mono font-black text-emerald-700 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-bold block mb-1 text-[11px]">المتبقي بالآجل:</label>
                    <div className="bg-slate-200 border border-slate-300 rounded-xl px-2.5 py-1 font-mono font-black text-rose-800 text-xs flex items-center justify-between h-[29px]">
                      <span>{Math.max(0, editingInvoice.totalAmount - editingInvoice.paidAmount).toLocaleString()}</span>
                      <span className="text-[10px]">ج</span>
                    </div>
                  </div>
                </div>

                {/* If Payment method is Split Payment */}
                {(editingInvoice.paymentMethod as string) === 'دفع متعدد / مزيج' && (
                  <div className="bg-amber-100/70 border border-amber-300 p-2.5 rounded-xl space-y-2 text-xs">
                    <span className="font-black text-amber-950 block">توزيع المبالغ بين طرق الدفع المختلفة:</span>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="font-bold text-slate-700 block mb-0.5 text-[10px]">💵 كاش:</label>
                        <input
                          type="number"
                          min="0"
                          value={(editingInvoice as any).splitPayments?.cash || 0}
                          onChange={e => {
                            const val = Number(e.target.value);
                            const cur = (editingInvoice as any).splitPayments || { cash: 0, instapay: 0, vodafone: 0, visa: 0 };
                            const updatedSplit = { ...cur, cash: val };
                            const totalPaid = updatedSplit.cash + updatedSplit.instapay + updatedSplit.vodafone + updatedSplit.visa;
                            setEditingInvoice({
                              ...editingInvoice,
                              paidAmount: totalPaid,
                              splitPayments: updatedSplit,
                            } as any);
                          }}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 font-mono font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-0.5 text-[10px]">⚡ إنستاباي:</label>
                        <input
                          type="number"
                          min="0"
                          value={(editingInvoice as any).splitPayments?.instapay || 0}
                          onChange={e => {
                            const val = Number(e.target.value);
                            const cur = (editingInvoice as any).splitPayments || { cash: 0, instapay: 0, vodafone: 0, visa: 0 };
                            const updatedSplit = { ...cur, instapay: val };
                            const totalPaid = updatedSplit.cash + updatedSplit.instapay + updatedSplit.vodafone + updatedSplit.visa;
                            setEditingInvoice({
                              ...editingInvoice,
                              paidAmount: totalPaid,
                              splitPayments: updatedSplit,
                            } as any);
                          }}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 font-mono font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-0.5 text-[10px]">📱 فودافون:</label>
                        <input
                          type="number"
                          min="0"
                          value={(editingInvoice as any).splitPayments?.vodafone || 0}
                          onChange={e => {
                            const val = Number(e.target.value);
                            const cur = (editingInvoice as any).splitPayments || { cash: 0, instapay: 0, vodafone: 0, visa: 0 };
                            const updatedSplit = { ...cur, vodafone: val };
                            const totalPaid = updatedSplit.cash + updatedSplit.instapay + updatedSplit.vodafone + updatedSplit.visa;
                            setEditingInvoice({
                              ...editingInvoice,
                              paidAmount: totalPaid,
                              splitPayments: updatedSplit,
                            } as any);
                          }}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 font-mono font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-0.5 text-[10px]">💳 فيزا:</label>
                        <input
                          type="number"
                          min="0"
                          value={(editingInvoice as any).splitPayments?.visa || 0}
                          onChange={e => {
                            const val = Number(e.target.value);
                            const cur = (editingInvoice as any).splitPayments || { cash: 0, instapay: 0, vodafone: 0, visa: 0 };
                            const updatedSplit = { ...cur, visa: val };
                            const totalPaid = updatedSplit.cash + updatedSplit.instapay + updatedSplit.vodafone + updatedSplit.visa;
                            setEditingInvoice({
                              ...editingInvoice,
                              paidAmount: totalPaid,
                              splitPayments: updatedSplit,
                            } as any);
                          }}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ملاحظات الفاتورة:</label>
                <textarea
                  rows={2}
                  value={editingInvoice.notes || ''}
                  onChange={e => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none text-xs"
                  placeholder="ملاحظات..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow-gold text-xs"
                >
                  حفظ تعديلات الفاتورة ✓
                </button>
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-lg">tune</span>
                <span>تصفية فواتير المبيعات المتقدمة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Date From & To */}
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">الفترة الزمنية (من / إلى):</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">من تاريخ:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => {
                        setDateFrom(e.target.value);
                        setDateFilter('custom');
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 bg-slate-50 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">إلى تاريخ:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => {
                        setDateTo(e.target.value);
                        setDateFilter('custom');
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 bg-slate-50 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Branch Filter */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">الفرع:</label>
                <BranchSelect
                  value={branchFilter}
                  onChange={setBranchFilter}
                  isAdmin={isAdmin}
                  allValue="ALL"
                  allLabel="🌐 كل الفروع"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:border-amber-500 cursor-pointer"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة السداد:</label>
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">كل طرق الدفع</option>
                  <option value="نقدي">💵 نقدي (كاش)</option>
                  <option value="إنستاباي">⚡ إنستاباي</option>
                  <option value="فودافون كاش">📱 فودافون كاش</option>
                  <option value="فيزا / كارت">💳 فيزا / كارت</option>
                  <option value="بالآجل / دفعات">⏳ بالآجل / دفعات</option>
                  <option value="دفع متعدد / مزيج">🔀 دفع متعدد / مزيج</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">حالة السداد:</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">كل حالات السداد</option>
                  <option value="تم السداد بالكامل">تم السداد بالكامل</option>
                  <option value="مسدد جزئياً">مسدد جزئياً</option>
                  <option value="آجل / غير مسدد">آجل / غير مسدد</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow-gold transition-colors text-center"
                >
                  تطبيق الفلاتر ({filteredInvoices.length} نتيجة) ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentFilter('all');
                    setStatusFilter('all');
                    setBranchFilter('ALL');
                    setDateFrom('');
                    setDateTo('');
                    setDateFilter('today');
                    setSearch('');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إعادة ضبط
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
