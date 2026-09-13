'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { formatDateOnly, getTodayDateStr } from '@/lib/dateUtils';
import PdfPrintButton from '@/components/PdfPrintButton';
import { useCurrentUser } from '@/lib/useCurrentUser';
import Pagination from '@/components/Pagination';
import BranchSelect from '@/components/BranchSelect';
import { BRANCHES_LIST, BRANCH_TREASURIES, getBranchTreasury, normalizeBranchName } from '@/lib/branches';

interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: number;  // مدين (علي العميل)
  credit: number; // دائن (من العميل)
  balanceAfter: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  inspectionsCount: number;
  ordersCount: number;
  totalSpent: number;
  totalDeposits?: number;
  totalPaid?: number;
  openingBalance: number;
  balance: number; // positive = owed by customer (لينا), negative = credit (علينا)
  notes: string;
  createdAt: string;
  ledger?: CustomerLedgerEntry[];
}

interface CustomerCollection {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  phone: string;
  amount: number;
  method: 'نقدي' | 'إنستاباي' | 'فيزا' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك';
  treasury: string;
  notes: string;
}

const CUSTOMERS_KEY = 'ahmed_kishk_customers_v3';

export default function CustomersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'COLLECTIONS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collections, setCollections] = useState<CustomerCollection[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Customer for Full Details & Statement Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Inline Editing State for Collections Tab
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [inlineColForm, setInlineColForm] = useState<{
    date: string;
    amount: number;
    method: 'نقدي' | 'إنستاباي' | 'فيزا' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك';
    treasury: string;
    notes: string;
  }>({
    date: '',
    amount: 0,
    method: 'نقدي',
    treasury: 'خزينة الفرع الرئيسي (سعد زغلول)',
    notes: '',
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overpaid' | 'cleared'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);

  // New Customer Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCity, setCustCity] = useState('الفرع الرئيسي');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const { user: currentUser, isAdmin } = useCurrentUser();
  // موظف مقيّد بفرع: أى عميل جديد يُسجَّل على فرعه، والخزينة تلقائياً خزينته، والفلترة على فرعه فقط
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) {
      setCustCity(currentUser.branch);
      setColTreasury(getBranchTreasury(currentUser.branch));
      setSelectedBranch(currentUser.branch);
    }
  }, [isAdmin, currentUser]);
  const [custNotes, setCustNotes] = useState('');

  // New Collection Form
  const [colCustomerId, setColCustomerId] = useState('');
  const [colAmount, setColAmount] = useState<number>(1000);
  const [colMethod, setColMethod] = useState<'نقدي' | 'إنستاباي' | 'فيزا' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك'>('نقدي');
  const [colTreasury, setColTreasury] = useState('خزينة الفرع الرئيسي (سعد زغلول)');
  const [colDate, setColDate] = useState(() => getTodayDateStr());
  const [colNotes, setColNotes] = useState('');

  // #FIX: كان بيرجع لنسخة قديمة محفوظة على قرص الجهاز (localStorage) لو فشل الطلب —
  // ده اللي بيسبب ظهور بيانات قديمة/غلط. دلوقتى لو الطلب فشل، القائمة تفضل فاضية
  // (مع رسالة تحميل واضحة) بدل ما تعرض بيانات مضلِّلة.
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.customers)) {
          setCustomers(json.customers);
          if (Array.isArray(json.collections)) {
            setCollections(json.collections);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load customers from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveCustomersState = async (list: Customer[]) => {
    setCustomers(list);
    try {
      await fetch('/api/system-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: CUSTOMERS_KEY, data: list }),
      });
    } catch (err) {
      console.error('Failed to sync customers with server:', err);
    }
  };

  // ⚠️ كل سند تحصيل بيتحفظ الآن كصف مستقل عبر /api/customer-collections (بدل
  // إعادة إرسال مصفوفة التحصيلات كاملة لكل العملاء) — يمنع ضياع سند لعميل تاني
  // لو مستخدمين اتنين حفظوا فى نفس اللحظة تقريبًا. راجع src/app/api/customer-collections/route.ts.
  const saveOneCollection = async (col: CustomerCollection): Promise<boolean> => {
    try {
      const res = await fetch('/api/customer-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(col),
      });
      const json = await res.json().catch(() => null);
      return !!json?.success;
    } catch (err) {
      console.error('Failed to sync collection with server:', err);
      return false;
    }
  };

  const deleteOneCollection = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customer-collections?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      return !!json?.success;
    } catch (err) {
      console.error('Failed to delete collection on server:', err);
      return false;
    }
  };

  // Add Customer Submit
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) return;

    const newC: Customer = {
      id: `CUST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      name: custName.trim(),
      phone: custPhone.trim(),
      address: custAddress.trim(),
      city: custCity,
      inspectionsCount: 0,
      ordersCount: 0,
      totalSpent: 0,
      totalDeposits: 0,
      totalPaid: 0,
      openingBalance: 0,
      balance: 0,
      notes: custNotes.trim(),
      createdAt: getTodayDateStr(),
      ledger: [],
    };

    const updated = [newC, ...customers];
    saveCustomersState(updated);

    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newC),
    }).catch(console.error);

    setShowAddCustomerModal(false);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustNotes('');
  };

  // Add Collection Submit
  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustomer = customers.find(c => c.id === colCustomerId);
    if (!targetCustomer || colAmount <= 0) return;

    const newCol: CustomerCollection = {
      id: `COL-${Date.now()}`,
      date: colDate || getTodayDateStr(),
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      phone: targetCustomer.phone,
      amount: colAmount,
      method: colMethod,
      treasury: colTreasury,
      notes: colNotes.trim(),
    };

    await saveOneCollection(newCol);
    await loadData();

    setShowAddCollectionModal(false);
    setColAmount(1000);
    setColNotes('');
  };

  // Inline Collection Editing Handlers
  const handleStartInlineEdit = (col: CustomerCollection) => {
    setEditingColId(col.id);
    setInlineColForm({
      date: col.date ? (col.date.includes('T') ? col.date.split('T')[0] : col.date) : getTodayDateStr(),
      amount: Number(col.amount) || 0,
      method: col.method || 'نقدي',
      treasury: col.treasury || getBranchTreasury(currentUser?.branch),
      notes: col.notes || '',
    });
  };

  const handleSaveInlineEdit = async (colId: string) => {
    if ((Number(inlineColForm.amount) || 0) <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const original = collections.find(c => c.id === colId);
    if (!original) return;

    const updatedCol: CustomerCollection = {
      ...original,
      date: inlineColForm.date,
      amount: Number(inlineColForm.amount) || 0,
      method: inlineColForm.method,
      treasury: inlineColForm.treasury,
      notes: inlineColForm.notes.trim(),
    };

    await saveOneCollection(updatedCol);
    setEditingColId(null);
    await loadData();
  };

  const handleCancelInlineEdit = () => {
    setEditingColId(null);
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف العميل "${name}"؟`)) return;
    const filteredC = customers.filter(c => c.id !== id);
    saveCustomersState(filteredC);
    if (selectedCustomer?.id === id) setSelectedCustomer(null);
    try {
      await fetch(`/api/customers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete customer from server:', err);
    }
  };

  // Filtered Customers
  const filteredCustomers = customers.filter(c => {
    if (selectedBranch !== 'ALL' && selectedBranch !== 'الكل') {
      const custBranch = c.city || (c as any).branch || '';
      if (normalizeBranchName(custBranch) !== normalizeBranchName(selectedBranch)) return false;
    }

    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()));
    
    let matchStatus = true;
    if (statusFilter === 'unpaid') matchStatus = (Number(c.balance) || 0) > 0.01;
    else if (statusFilter === 'overpaid') matchStatus = (Number(c.balance) || 0) < -0.01;
    else if (statusFilter === 'cleared') matchStatus = Math.abs(Number(c.balance) || 0) <= 0.01;

    return matchSearch && matchStatus;
  });

  // Filtered Collections (Only shows transactions of the selected branch treasury)
  const filteredCollections = collections.filter(col => {
    if (selectedBranch !== 'ALL' && selectedBranch !== 'الكل') {
      const targetTreasury = getBranchTreasury(selectedBranch);
      const matchTreasury = col.treasury === targetTreasury ||
        (col.treasury && normalizeBranchName(col.treasury) === normalizeBranchName(selectedBranch)) ||
        (col.treasury && col.treasury.includes(selectedBranch));
      const cust = customers.find(c => c.phone === col.phone || c.id === col.customerId);
      const matchCustBranch = cust && normalizeBranchName(cust.city || (cust as any).branch) === normalizeBranchName(selectedBranch);
      if (!matchTreasury && !matchCustBranch) return false;
    }

    const matchSearch =
      col.customerName.toLowerCase().includes(search.toLowerCase()) ||
      col.phone.includes(search) ||
      (col.notes && col.notes.toLowerCase().includes(search.toLowerCase())) ||
      (col.treasury && col.treasury.toLowerCase().includes(search.toLowerCase()));
    const matchMethod = methodFilter === 'all' || col.method === methodFilter;
    return matchSearch && matchMethod;
  });

  // Pagination (30 لكل صفحة)
  const PAGE_SIZE = 30;
  const [custPage, setCustPage] = useState(1);
  const [colPage, setColPage] = useState(1);

  // Reset pagination on filter changes
  useEffect(() => {
    setCustPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setColPage(1);
  }, [search, methodFilter]);

  const paginatedCustomers = filteredCustomers.slice((custPage - 1) * PAGE_SIZE, custPage * PAGE_SIZE);
  const paginatedCollections = filteredCollections.slice((colPage - 1) * PAGE_SIZE, colPage * PAGE_SIZE);

  // Financial Metrics
  const totalDebtsLina = filteredCustomers.reduce((s, c) => s + ((Number(c.balance) || 0) > 0 ? (Number(c.balance) || 0) : 0), 0);
  const totalPrepaidAleena = filteredCustomers.reduce((s, c) => s + ((Number(c.balance) || 0) < 0 ? Math.abs(Number(c.balance) || 0) : 0), 0);
  const totalDebtorsCount = filteredCustomers.filter(c => (Number(c.balance) || 0) > 0.01).length;

  const totalCollectionsAmount = filteredCollections.reduce((s, col) => s + (Number(col.amount) || 0), 0);
  const cashCollectionsAmount = filteredCollections.filter(c => c.method === 'نقدي').reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return (
    <PageShell title="العملاء والحسابات المالية">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12" id="print-area">

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 justify-between items-center gap-2 pb-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'CUSTOMERS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>👥 العملاء</span>
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">{customers.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('COLLECTIONS')}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'COLLECTIONS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>💰 التحصيلات</span>
              <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">{collections.length}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <PdfPrintButton
              documentTitle={activeTab === 'CUSTOMERS' ? 'قائمة-العملاء-والديون' : 'سندات-التحصيل'}
              label="طباعة PDF"
            />
            <button
              type="button"
              onClick={() => setShowAddCollectionModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[17px]">payments</span>
              <span>تسجيل تحصيل</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[17px]">person_add</span>
              <span>إضافة عميل</span>
            </button>
          </div>
        </div>

        {/* TAB 1: CUSTOMERS */}
        {activeTab === 'CUSTOMERS' && (
          <div className="space-y-4">
            
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block text-[11px]">إجمالي العملاء</span>
                <strong className="text-lg font-black text-slate-900 mt-0.5 block font-mono">{filteredCustomers.length}</strong>
              </div>

              <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200 text-center shadow-3xs">
                <span className="text-rose-800 font-bold block text-[11px]">إجمالي المتبقي (لينا)</span>
                <strong className="text-lg font-black text-rose-950 mt-0.5 block font-mono">{totalDebtsLina.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block text-[11px]">عملاء عليهم متبقي</span>
                <strong className="text-lg font-black text-amber-950 mt-0.5 block font-mono">{totalDebtorsCount} عميل</strong>
              </div>

              <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block text-[11px]">حسابات خالصة</span>
                <strong className="text-lg font-black text-emerald-950 mt-0.5 block font-mono">
                  {filteredCustomers.filter(c => Math.abs(Number(c.balance) || 0) <= 0.01).length} عميل
                </strong>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className={`relative ${isAdmin ? 'sm:col-span-5' : 'sm:col-span-8'}`}>
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="بحث سريع باسم العميل، رقم الهاتف أو العنوان..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div className={isAdmin ? 'sm:col-span-4' : 'sm:col-span-4'}>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل الحالات المالية</option>
                  <option value="unpaid">عليهم متبقي (مدينين)</option>
                  <option value="cleared">حساب خالص (خالي من الديون)</option>
                  <option value="overpaid">مدفوعات زائدة (علينا)</option>
                </select>
              </div>

              {isAdmin && (
                <div className="sm:col-span-3">
                  <BranchSelect
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                    isAdmin={isAdmin}
                    allValue="ALL"
                    allLabel="🌐 جميع الفروع والخزائن"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Clean, Elegant Customers Table (Click row to view full file & statement) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 pr-4">العميل</th>
                      <th className="p-3.5">الهاتف والعنوان</th>
                      <th className="p-3.5 text-center">الطلبات والمعاينات</th>
                      <th className="p-3.5 text-center font-mono">إجمالي الحساب</th>
                      <th className="p-3.5 text-center font-mono">المدفوع</th>
                      <th className="p-3.5 text-center font-mono">المتبقي</th>
                      <th className="p-3.5 text-center">الحالة</th>
                      <th className="p-3.5 text-center w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          لا يوجد عملاء مطابقين لمعايير البحث
                        </td>
                      </tr>
                    ) : (
                      paginatedCustomers.map(cust => {
                        const bal = Number(cust.balance) || 0;
                        const isCleared = Math.abs(bal) <= 0.01;
                        const isDebtor = bal > 0.01;
                        
                        return (
                          <tr
                            key={cust.id}
                            onClick={() => router.push('/customers/' + encodeURIComponent(cust.phone || cust.id))}
                            className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                            title="اضغط لفتح صفحة العميل وتعديل البيانات وكشف الحساب"
                          >
                            {/* Customer Name & Avatar */}
                            <td className="p-3.5 pr-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                  {cust.name.slice(0, 1)}
                                </div>
                                <div>
                                  <div className="font-black text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                                    {cust.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {cust.city || 'الفرع الرئيسي'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Phone & Address */}
                            <td className="p-3.5 text-slate-700">
                              <div className="font-mono text-slate-900 font-bold text-xs" dir="ltr">{cust.phone}</div>
                              <div className="text-slate-400 text-[11px] truncate max-w-[180px]">{cust.address || '—'}</div>
                            </td>

                            {/* Orders & Inspections */}
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-200 font-mono">
                                <span>{cust.ordersCount} طلب</span>
                                <span className="text-slate-300">•</span>
                                <span>{cust.inspectionsCount} معاينة</span>
                              </span>
                            </td>

                            {/* Total Spent */}
                            <td className="p-3.5 text-center font-mono font-bold text-slate-900">
                              {(Number(cust.totalSpent) || 0).toLocaleString()} ج
                            </td>

                            {/* Paid Amount */}
                            <td className="p-3.5 text-center font-mono font-bold text-emerald-700">
                              {(Number(cust.totalPaid) || 0).toLocaleString()} ج
                            </td>

                            {/* Remaining Balance */}
                            <td className="p-3.5 text-center font-mono font-black text-sm">
                              <span className={isDebtor ? 'text-rose-700' : 'text-emerald-700'}>
                                {bal.toLocaleString()} ج
                              </span>
                            </td>

                            {/* Financial Status Badge */}
                            <td className="p-3.5 text-center">
                              {isDebtor ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-200 whitespace-nowrap">
                                  عليه متبقي
                                </span>
                              ) : isCleared ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 whitespace-nowrap">
                                  خالص ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200 whitespace-nowrap">
                                  رصيد دائن
                                </span>
                              )}
                            </td>

                            {/* Action: Open Page / Delete */}
                            <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => router.push('/customers/' + encodeURIComponent(cust.phone || cust.id))}
                                  className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                  title="فتح ملف العميل وتعديل البيانات"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                                  className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="حذف العميل"
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

              <Pagination
                currentPage={custPage}
                totalItems={filteredCustomers.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCustPage}
                itemName="عميل"
              />
            </div>
          </div>
        )}

        {/* TAB 2: COLLECTIONS */}
        {activeTab === 'COLLECTIONS' && (
          <div className="space-y-4">
            
            {/* Collection Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block text-[11px]">إجمالي المحصل</span>
                <strong className="text-lg font-black text-emerald-950 mt-0.5 block font-mono">{totalCollectionsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block text-[11px]">عدد السندات</span>
                <strong className="text-lg font-black text-slate-900 mt-0.5 block font-mono">{filteredCollections.length} عملية</strong>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block text-[11px]">تحصيلات كاش (نقدي)</span>
                <strong className="text-lg font-black text-amber-950 mt-0.5 block font-mono">{cashCollectionsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 text-center shadow-3xs">
                <span className="text-blue-900 font-bold block text-[11px]">تحصيلات بنك / إلكتروني</span>
                <strong className="text-lg font-black text-blue-950 mt-0.5 block font-mono">{(totalCollectionsAmount - cashCollectionsAmount).toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Search & Method Filter */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className={`relative ${isAdmin ? 'sm:col-span-5' : 'sm:col-span-8'}`}>
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="ابحث باسم العميل، الهاتف، أو الملاحظات..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div className={isAdmin ? 'sm:col-span-4' : 'sm:col-span-4'}>
                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل طرق السداد</option>
                  <option value="نقدي">💵 نقدي (كاش)</option>
                  <option value="إنستاباي">⚡ إنستاباي</option>
                  <option value="فودافون كاش">📱 فودافون كاش</option>
                  <option value="فيزا">💳 فيزا</option>
                  <option value="تحويل بنكي">🏦 تحويل بنكي</option>
                  <option value="شيك">🧾 شيك</option>
                </select>
              </div>

              {isAdmin && (
                <div className="sm:col-span-3">
                  <BranchSelect
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                    isAdmin={isAdmin}
                    allValue="ALL"
                    allLabel="🌐 جميع الفروع والخزائن"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Collections Table View */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">التاريخ</th>
                      <th className="p-3.5">اسم العميل</th>
                      <th className="p-3.5 font-mono text-center">المبلغ المحصل</th>
                      <th className="p-3.5 text-center">طريقة السداد</th>
                      <th className="p-3.5">الخزينة / الحساب</th>
                      <th className="p-3.5">الملاحظات</th>
                      <th className="p-3.5 text-center w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCollections.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد سندات تحصيل مسجلة
                        </td>
                      </tr>
                    ) : (
                      paginatedCollections.map(col => {
                        const isEditingThis = editingColId === col.id;

                        if (isEditingThis) {
                          return (
                            <tr key={col.id} className="bg-amber-50/60 border-2 border-amber-400/80">
                              {/* Date Input */}
                              <td className="p-2.5">
                                <input
                                  type="date"
                                  value={inlineColForm.date}
                                  onChange={e => setInlineColForm({ ...inlineColForm, date: e.target.value })}
                                  className="border border-slate-300 rounded-lg px-2 py-1.5 font-mono font-bold text-slate-900 text-xs bg-white w-32 focus:border-amber-500 outline-hidden"
                                />
                              </td>

                              {/* Customer (Read-only) */}
                              <td className="p-2.5 font-bold text-slate-900">
                                <div>{col.customerName}</div>
                                <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{col.phone}</div>
                              </td>

                              {/* Amount Input */}
                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="1"
                                  value={inlineColForm.amount}
                                  onChange={e => setInlineColForm({ ...inlineColForm, amount: parseFloat(e.target.value) || 0 })}
                                  className="border border-emerald-400 rounded-lg px-2 py-1.5 font-mono font-black text-emerald-950 text-xs bg-emerald-50 w-28 text-center focus:border-emerald-600 outline-hidden"
                                />
                              </td>

                              {/* Method Select */}
                              <td className="p-2.5 text-center">
                                <select
                                  value={inlineColForm.method}
                                  onChange={e => setInlineColForm({ ...inlineColForm, method: e.target.value as any })}
                                  className="border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-900 text-xs bg-white focus:border-amber-500 outline-hidden"
                                >
                                  <option value="نقدي">نقدي (كاش)</option>
                                  <option value="إنستاباي">إنستاباي</option>
                                  <option value="فيزا">فيزا</option>
                                  <option value="فودافون كاش">فودافون كاش</option>
                                  <option value="تحويل بنكي">تحويل بنكي</option>
                                  <option value="شيك">شيك</option>
                                </select>
                              </td>

                              {/* Treasury Select */}
                              <td className="p-2.5">
                                <select
                                  value={inlineColForm.treasury}
                                  onChange={e => setInlineColForm({ ...inlineColForm, treasury: e.target.value })}
                                  disabled={!isAdmin && !!currentUser?.branch}
                                  className="border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-900 text-xs bg-white focus:border-amber-500 outline-hidden max-w-[200px] disabled:bg-slate-100 disabled:cursor-not-allowed"
                                >
                                  {isAdmin ? (
                                    BRANCH_TREASURIES.map(bt => (
                                      <option key={bt.branch} value={bt.treasury}>
                                        {bt.treasury}
                                      </option>
                                    ))
                                  ) : (
                                    <option value={getBranchTreasury(currentUser?.branch)}>
                                      {getBranchTreasury(currentUser?.branch)}
                                    </option>
                                  )}
                                </select>
                              </td>

                              {/* Notes Input */}
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={inlineColForm.notes}
                                  onChange={e => setInlineColForm({ ...inlineColForm, notes: e.target.value })}
                                  placeholder="ملاحظات..."
                                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 text-xs bg-white w-full focus:border-amber-500 outline-hidden"
                                />
                              </td>

                              {/* Actions: Save / Cancel */}
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineEdit(col.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-xs cursor-pointer transition-colors"
                                    title="حفظ التعديل"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelInlineEdit}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                    title="إلغاء"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3.5 font-mono text-slate-700 font-bold">{col.date ? formatDateOnly(col.date) : 'غير محدد'}</td>
                            <td className="p-3.5 font-bold text-slate-900">
                              <div>{col.customerName}</div>
                              <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{col.phone}</div>
                            </td>
                            <td className="p-3.5 text-center font-mono font-black text-sm text-emerald-700">
                              +{(Number(col.amount) || 0).toLocaleString()} ج
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {col.method}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-700 font-bold">{col.treasury}</td>
                            <td className="p-3.5 text-slate-600">{col.notes || '—'}</td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartInlineEdit(col)}
                                  className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                  title="تعديل السند مباشرة (Inline Edit)"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`هل أنت متأكد من حذف سند التحصيل بمبلغ ${col.amount} ج للعميل "${col.customerName}"؟`)) {
                                      await deleteOneCollection(col.id);
                                      await loadData();
                                    }
                                  }}
                                  className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="حذف التحصيل"
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

              <Pagination
                currentPage={colPage}
                totalItems={filteredCollections.length}
                pageSize={PAGE_SIZE}
                onPageChange={setColPage}
                itemName="سند تحصيل"
              />
            </div>
          </div>
        )}
      </div>

      {/* 🔍 Interactive Full Customer Details & Printable Statement Modal */}
      {selectedCustomer && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-customer-statement, #printable-customer-statement * { visibility: visible !important; }
              #printable-customer-statement { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div id="printable-customer-statement" className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-5 text-slate-900 border border-slate-200 my-auto shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                  <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-950">
                    كشف حساب وتفاصيل العميل: <span className="text-amber-800">{selectedCustomer.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">سجل المقايسات، العربون، الفواتير، والتحصيلات</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>طباعة كشف الحساب (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Header for Print */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-900">
              <div>
                <h2 className="font-display font-black text-xl text-slate-950">مؤسسة أحمد كشك للأقمشة والستائر</h2>
                <p className="text-xs font-bold text-amber-800">كشف حساب وتاريخ التعاملات والمقايسات المالية للعميل</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>تاريخ التقرير:</strong> {formatDateOnly(new Date())}</div>
                <div><strong>كود العميل:</strong> {selectedCustomer.id}</div>
              </div>
            </div>

            {/* Customer Information Cards */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div><strong>اسم العميل:</strong> {selectedCustomer.name}</div>
              <div><strong>رقم الهاتف:</strong> {selectedCustomer.phone}</div>
              <div><strong>العنوان:</strong> {selectedCustomer.address || '—'}</div>
              <div><strong>الفرع / المدينة:</strong> {selectedCustomer.city || 'الفرع الرئيسي'}</div>
              <div><strong>عدد المقايسات والطلبات:</strong> {selectedCustomer.ordersCount} طلب ({selectedCustomer.inspectionsCount} معاينة)</div>
              <div><strong>ملاحظات العميل:</strong> {selectedCustomer.notes || '—'}</div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-600 font-bold block text-[11px]">إجمالي المقايسات والطلبات</span>
                <strong className="text-base font-black text-slate-950 font-mono">{(Number(selectedCustomer.totalSpent) || 0).toLocaleString()} ج</strong>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
                <span className="text-emerald-800 font-bold block text-[11px]">إجمالي المسدد (العربون + التحصيلات)</span>
                <strong className="text-base font-black text-emerald-950 font-mono">{(Number(selectedCustomer.totalPaid) || 0).toLocaleString()} ج</strong>
              </div>
              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center">
                <span className="text-rose-800 font-bold block text-[11px]">المتبقي المستحق (الديون)</span>
                <strong className="text-base font-black text-rose-950 font-mono">{(Number(selectedCustomer.balance) || 0).toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-slate-950 border-r-4 border-amber-500 pr-2">
                سجل الحركات المالية والمقايسات:
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">نوع الحركة</th>
                      <th className="p-2.5">التفاصيل والبيان</th>
                      <th className="p-2.5 text-center font-mono text-rose-900">مدين (+علي العميل)</th>
                      <th className="p-2.5 text-center font-mono text-emerald-900">دائن (-مسدد)</th>
                      <th className="p-2.5 text-center font-mono">الرصيد بعد الحركة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!selectedCustomer.ledger || selectedCustomer.ledger.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">
                          لا توجد حركات مسجلة على حساب العميل حتى الآن
                        </td>
                      </tr>
                    ) : (
                      selectedCustomer.ledger.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 font-mono font-bold text-slate-700">{entry.date ? formatDateOnly(entry.date) : 'غير محدد'}</td>
                          <td className="p-2.5 font-black text-slate-900">{entry.type}</td>
                          <td className="p-2.5 text-slate-700 font-medium">{entry.description}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-rose-800">
                            {entry.debit > 0 ? `+${(Number(entry.debit) || 0).toLocaleString()} ج` : '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-800">
                            {entry.credit > 0 ? `-${(Number(entry.credit) || 0).toLocaleString()} ج` : '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-black text-slate-950">
                            {(Number(entry.balanceAfter) || 0).toLocaleString()} ج
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Action Footer in Modal */}
            <div className="no-print pt-3 border-t border-slate-200 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setColCustomerId(selectedCustomer.id);
                  const bal = Number(selectedCustomer.balance) || 0;
                  setColAmount(bal > 0 ? bal : 1000);
                  setShowAddCollectionModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span>تسجيل دفعة تحصيل نقدية / بنكية</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ➕ Modal: Add Customer */}
      {showAddCustomerModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">إضافة عميل جديد</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم العميل بالكامل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ. أحمد عبد العزيز"
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الهاتف (واتساب):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 01012345678"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">العنوان التفصيلي:</label>
                <input
                  type="text"
                  placeholder="مثال: حي النرجس، فيلا 12، التجمع الخامس"
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الفرع / المدينة:</label>
                {isAdmin ? (
                  <select
                    value={custCity}
                    onChange={e => setCustCity(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none"
                  >
                    <option value="الفرع الرئيسي">الفرع الرئيسي (سعد زغلول)</option>
                    <option value="فرع عرابي">فرع عرابي</option>
                    <option value="فرع عمر أفندي">فرع عمر أفندي</option>
                    <option value="فرع الثلاثيني">فرع الثلاثيني</option>
                  </select>
                ) : (
                  <div className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 bg-slate-100 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">lock</span>
                    {custCity}
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول تفضيلات العميل أو الحساب..."
                  value={custNotes}
                  onChange={e => setCustNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow-gold text-xs"
                >
                  حفظ العميل ✓
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ➕ Modal: Add Collection */}
      {showAddCollectionModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تسجيل سند تحصيل / سداد جديد</h3>
              <button onClick={() => setShowAddCollectionModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddCollection} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اختر العميل:</label>
                <select
                  required
                  value={colCustomerId}
                  onChange={e => {
                    setColCustomerId(e.target.value);
                    const target = customers.find(c => c.id === e.target.value);
                    if (target && target.balance > 0) setColAmount(target.balance);
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none"
                >
                  <option value="">-- اختر العميل من القائمة --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) — متبقي: {(Number(c.balance) || 0).toLocaleString()} ج
                    </option>
                  ))}
                </select>
              </div>

              {colCustomerId && (() => {
                const target = customers.find(c => c.id === colCustomerId);
                return target ? (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between items-center text-amber-950 font-black">
                      <span>إجمالي رصيد العميل المستحق:</span>
                      <span className="font-mono text-xs font-bold text-rose-700">{(Number(target.balance) || 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="text-slate-600 font-medium">
                      ✨ يتم تحديث طلبات الستائر والتسعير وأمر الشغل تلقائياً وتنزيل هذا المبلغ من المتبقي.
                    </div>
                  </div>
                ) : null;
              })()}

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المحصل (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={colAmount}
                  onChange={e => setColAmount(Number(e.target.value))}
                  className="w-full border border-emerald-300 rounded-xl px-3 py-2 font-mono font-black text-emerald-950 bg-emerald-50/50 focus:outline-none text-base"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة السداد والتحصيل:</label>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {(['نقدي', 'إنستاباي', 'فيزا', 'فودافون كاش', 'تحويل بنكي', 'شيك'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setColMethod(m)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        colMethod === m ? 'bg-amber-400 text-slate-950 font-black border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الخزينة المستلمة:</label>
                <select
                  value={colTreasury}
                  onChange={e => setColTreasury(e.target.value)}
                  disabled={!isAdmin && !!currentUser?.branch}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {isAdmin ? (
                    BRANCH_TREASURIES.map(bt => (
                      <option key={bt.branch} value={bt.treasury}>
                        {bt.treasury}
                      </option>
                    ))
                  ) : (
                    <option value={getBranchTreasury(currentUser?.branch)}>
                      {getBranchTreasury(currentUser?.branch)}
                    </option>
                  )}
                </select>
                {!isAdmin && (
                  <p className="text-[11px] text-amber-700 font-bold mt-1">
                    🔒 مقيد تلقائياً بخزينة فرعك المخصص ({currentUser?.branch || 'الفرع الرئيسي'}).
                  </p>
                )}
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ملاحظات السند / رقم الإيصال:</label>
                <input
                  type="text"
                  placeholder="مثال: دفعة استلام الستائر / رقم الإيصال 402"
                  value={colNotes}
                  onChange={e => setColNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl cursor-pointer shadow-xs text-xs"
                >
                  تأكيد وحفظ التحصيل ✓
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCollectionModal(false)}
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
