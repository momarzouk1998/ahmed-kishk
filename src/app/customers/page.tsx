'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { formatDateOnly } from '@/lib/dateUtils';

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
  method: 'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك';
  treasury: string;
  notes: string;
}

const defaultCustomers: Customer[] = [];
const defaultCollections: CustomerCollection[] = [];

const CUSTOMERS_KEY = 'ahmed_kishk_customers_v3';
const COLLECTIONS_KEY = 'ahmed_kishk_collections_v3';

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'COLLECTIONS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<Customer[]>(defaultCustomers);
  const [collections, setCollections] = useState<CustomerCollection[]>(defaultCollections);
  const [loading, setLoading] = useState(true);

  // Selected Customer for Full Details & Statement Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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
  const [custCity, setCustCity] = useState('القاهرة');
  const [custNotes, setCustNotes] = useState('');

  // New Collection Form
  const [colCustomerId, setColCustomerId] = useState('');
  const [colAmount, setColAmount] = useState<number>(1000);
  const [colMethod, setColMethod] = useState<'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك'>('نقدي');
  const [colTreasury, setColTreasury] = useState('الخزينة الرئيسية');
  const [colNotes, setColNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.customers)) {
          setCustomers(json.customers);
          localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(json.customers));
          
          if (Array.isArray(json.collections)) {
            setCollections(json.collections);
            localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(json.collections));
          }
        }
      } else {
        // Fallback to local storage
        const rawC = localStorage.getItem(CUSTOMERS_KEY);
        if (rawC) setCustomers(JSON.parse(rawC));
        const rawCol = localStorage.getItem(COLLECTIONS_KEY);
        if (rawCol) setCollections(JSON.parse(rawCol));
      }
    } catch (e) {
      console.error('Failed to load customers from API:', e);
      const rawC = localStorage.getItem(CUSTOMERS_KEY);
      if (rawC) setCustomers(JSON.parse(rawC));
      const rawCol = localStorage.getItem(COLLECTIONS_KEY);
      if (rawCol) setCollections(JSON.parse(rawCol));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveCustomersState = async (list: Customer[]) => {
    setCustomers(list);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
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

  const saveCollectionsState = async (list: CustomerCollection[]) => {
    setCollections(list);
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(list));
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: list }),
      });
    } catch (err) {
      console.error('Failed to sync collections with server:', err);
    }
  };

  // Add Customer Submit
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) return;

    const newC: Customer = {
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
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
      createdAt: new Date().toISOString().split('T')[0],
      ledger: [],
    };

    const updated = [newC, ...customers];
    saveCustomersState(updated);

    // Save to DB
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
      id: `COL-${100 + collections.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      phone: targetCustomer.phone,
      amount: colAmount,
      method: colMethod,
      treasury: colTreasury,
      notes: colNotes.trim(),
    };

    const updatedCollections = [newCol, ...collections];
    await saveCollectionsState(updatedCollections);

    // Reload full data to re-calculate aggregated balances and statement
    await loadData();

    // If modal was open, refresh selected customer
    const refreshed = customers.find(c => c.id === targetCustomer.id || c.phone === targetCustomer.phone);
    if (refreshed) setSelectedCustomer(refreshed);

    setShowAddCollectionModal(false);
    setColAmount(1000);
    setColNotes('');
    alert(`✅ تم تسجيل سند التحصيل بمبلغ ${colAmount.toLocaleString()} ج بنجاح!`);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف بيانات العميل "${name}"؟`)) {
      const filteredC = customers.filter(c => c.id !== id);
      saveCustomersState(filteredC);
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    }
  };

  // Filtered Customers
  const filteredCustomers = customers.filter(c => {
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

  // Filtered Collections
  const filteredCollections = collections.filter(col => {
    const matchSearch =
      col.customerName.toLowerCase().includes(search.toLowerCase()) ||
      col.phone.includes(search) ||
      (col.notes && col.notes.toLowerCase().includes(search.toLowerCase()));
    const matchMethod = methodFilter === 'all' || col.method === methodFilter;
    return matchSearch && matchMethod;
  });

  // Financial Metrics
  const totalDebtsLina = filteredCustomers.reduce((s, c) => s + ((Number(c.balance) || 0) > 0 ? (Number(c.balance) || 0) : 0), 0);
  const totalPrepaidAleena = filteredCustomers.reduce((s, c) => s + ((Number(c.balance) || 0) < 0 ? Math.abs(Number(c.balance) || 0) : 0), 0);
  const totalDebtorsCount = filteredCustomers.filter(c => (Number(c.balance) || 0) > 0.01).length;

  const totalCollectionsAmount = filteredCollections.reduce((s, col) => s + (Number(col.amount) || 0), 0);
  const cashCollectionsAmount = filteredCollections.filter(c => c.method === 'نقدي').reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return (
    <PageShell title="إدارة العملاء والديون والتحصيلات">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12">
        {/* Navigation Tabs (2 Tabs) */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'CUSTOMERS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>👥 العملاء والديون وحسابات الستائر</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{customers.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COLLECTIONS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'COLLECTIONS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>💰 سجل التحصيلات والسندات</span>
            <span className="bg-emerald-100 text-emerald-950 px-2 rounded-full text-[11px] font-mono font-bold">{collections.length}</span>
          </button>
        </div>

        {/* TAB 1: CUSTOMERS */}
        {activeTab === 'CUSTOMERS' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                إجمالي العملاء: {filteredCustomers.length} عميل (اضغط على السطر لفتح كشف الحساب وتفاصيل مقايسات الستائر والعربون)
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadData}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>تحديث البيانات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>+ إضافة عميل جديد</span>
                </button>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">عدد العملاء</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredCustomers.length}</strong>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
                <span className="text-rose-800 font-bold block">إجمالي الديون المتبقية (لينا)</span>
                <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalDebtsLina.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">عملاء عليهم متبقي</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{totalDebtorsCount} عميل</strong>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block">مدفوعات مقدمة / زيادة</span>
                <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">{totalPrepaidAleena.toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="relative sm:col-span-8">
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="ابحث باسم العميل، رقم الهاتف، أو العنوان..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل الحالات المالية</option>
                  <option value="unpaid">عليهم متبقي ديون (لم يسدد بالكامل)</option>
                  <option value="cleared">حساب خالص (مسدد بالكامل)</option>
                  <option value="overpaid">مدفوعات زائدة (علينا)</option>
                </select>
              </div>
            </div>

            {/* Customers Table View (Interactive Row Click) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[850px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">اسم العميل</th>
                      <th className="p-3.5">الهاتف والفرع</th>
                      <th className="p-3.5 text-center">المقايسات والأوامر</th>
                      <th className="p-3.5 text-center font-mono">إجمالي المقايسات والطلبات</th>
                      <th className="p-3.5 text-center font-mono">المدفوع / العربون</th>
                      <th className="p-3.5 text-center font-mono">الرصيد المتبقي (الديون)</th>
                      <th className="p-3.5 text-center">الحالة المالية</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          لا يوجد عملاء مطابقين لمعايير البحث
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map(cust => {
                        const bal = Number(cust.balance) || 0;
                        const statusLabel = bal > 0.01 ? 'عليه متبقي' : bal < -0.01 ? 'رصيد دائن' : 'حساب خالص ✓';
                        const badgeClass =
                          bal > 0.01
                            ? 'bg-rose-100 text-rose-900 border-rose-300 font-black'
                            : bal < -0.01
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';

                        return (
                          <tr
                            key={cust.id}
                            onClick={() => setSelectedCustomer(cust)}
                            className="border-t border-slate-100 hover:bg-amber-50/50 cursor-pointer transition-colors"
                          >
                            <td className="p-3.5 font-bold text-slate-900">
                              <span className="text-sm font-black text-slate-950 block">{cust.name}</span>
                              <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">receipt_long</span>
                                <span>اضغط لعرض كشف الحساب التفصيلي</span>
                              </span>
                            </td>

                            <td className="p-3.5 text-slate-700">
                              <div className="font-mono text-slate-900 font-bold text-xs" dir="ltr">{cust.phone}</div>
                              <div className="text-slate-500 text-[11px] truncate max-w-[200px]">{cust.address || cust.city}</div>
                            </td>

                            <td className="p-3.5 text-center font-mono font-bold">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                {cust.ordersCount} طلبات ({cust.inspectionsCount} معاينات)
                              </span>
                            </td>

                            <td className="p-3.5 text-center font-mono font-black text-slate-900">
                              {(Number(cust.totalSpent) || 0).toLocaleString()} ج
                            </td>

                            <td className="p-3.5 text-center font-mono font-bold text-emerald-700">
                              {(Number(cust.totalPaid) || 0).toLocaleString()} ج
                            </td>

                            <td className="p-3.5 text-center font-mono font-black text-sm">
                              <span className={bal > 0.01 ? 'text-rose-700 font-black' : 'text-emerald-700'}>
                                {bal.toLocaleString()} ج
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] border ${badgeClass}`}>
                                {statusLabel}
                              </span>
                            </td>

                            <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomer(cust)}
                                  className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer shadow-2xs"
                                  title="فتح كشف الحساب"
                                >
                                  📋 كشف الحساب
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setColCustomerId(cust.id);
                                    setColAmount(bal > 0 ? bal : 1000);
                                    setShowAddCollectionModal(true);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors shadow-2xs"
                                  title="تسجيل دفعة تحصيل"
                                >
                                  💰 تحصيل
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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
            </div>
          </div>
        )}

        {/* TAB 2: COLLECTIONS */}
        {activeTab === 'COLLECTIONS' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي عمليات التحصيل المسجلة: {filteredCollections.length} عملية</span>

              <button
                type="button"
                onClick={() => setShowAddCollectionModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span>+ تسجيل سند تحصيل جديد</span>
              </button>
            </div>

            {/* Collection Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي المبالغ المحصلة</span>
                <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">{totalCollectionsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">عدد العمليات</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredCollections.length} عملية</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">تحصيلات كاش (نقدي)</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{cashCollectionsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 text-center shadow-3xs">
                <span className="text-blue-900 font-bold block">تحصيلات إلكترونية/بنكية</span>
                <strong className="text-xl font-black text-blue-950 mt-1 block font-mono">{(totalCollectionsAmount - cashCollectionsAmount).toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Search & Method Filter */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="relative sm:col-span-8">
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="ابحث باسم العميل، الهاتف، أو الملاحظات..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">كل طرق السداد</option>
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="إنستاباي">إنستاباي</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="شيك">شيك</option>
                </select>
              </div>
            </div>

            {/* Collections Table View */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">التاريخ</th>
                      <th className="p-3.5">اسم العميل</th>
                      <th className="p-3.5 font-mono text-center">المبلغ المحصل</th>
                      <th className="p-3.5 text-center">طريقة السداد</th>
                      <th className="p-3.5">الخزينة / الحساب</th>
                      <th className="p-3.5">الملاحظات</th>
                      <th className="p-3.5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCollections.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد سندات تحصيل مسجلة
                        </td>
                      </tr>
                    ) : (
                      filteredCollections.map(col => (
                        <tr key={col.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono text-slate-700 font-bold">{col.date ? formatDateOnly(col.date) : 'غير محدد'}</td>
                          <td className="p-3.5 font-bold text-slate-900">
                            <div>{col.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{col.phone}</div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-sm text-emerald-700">
                            +{(Number(col.amount) || 0).toLocaleString()} ج
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {col.method}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700 font-bold">{col.treasury}</td>
                          <td className="p-3.5 text-slate-600">{col.notes || '—'}</td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => window.print()}
                                className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                                title="طباعة إيصال"
                              >
                                🖨️
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`هل أنت متأكد من حذف سند التحصيل بمبلغ ${col.amount} ج للعميل "${col.customerName}"؟`)) {
                                    const updated = collections.filter(c => c.id !== col.id);
                                    await saveCollectionsState(updated);
                                    await loadData();
                                  }
                                }}
                                className="bg-rose-100 text-rose-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                                title="حذف التحصيل"
                              >
                                🗑️
                              </button>
                            </div>
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
            {/* Modal Control Header */}
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">account_balance_wallet</span>
                <span>كشف حساب وتفاصيل العميل: {selectedCustomer.name}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  🖨️ طباعة كشف الحساب (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Header */}
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
              <div><strong>المدينة / الفرع:</strong> {selectedCustomer.city || 'الفرع الرئيسي'}</div>
              <div><strong>عدد المقايسات والطلبات:</strong> {selectedCustomer.ordersCount} طلبات ({selectedCustomer.inspectionsCount} معاينات)</div>
              <div><strong>ملاحظات العميل:</strong> {selectedCustomer.notes || '—'}</div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-600 font-bold block">إجمالي المقايسات والطلبات</span>
                <strong className="text-base font-black text-slate-950 font-mono">{(Number(selectedCustomer.totalSpent) || 0).toLocaleString()} ج</strong>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
                <span className="text-emerald-800 font-bold block">إجمالي المسدد (العربون + التحصيلات)</span>
                <strong className="text-base font-black text-emerald-950 font-mono">{(Number(selectedCustomer.totalPaid) || 0).toLocaleString()} ج</strong>
              </div>
              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center">
                <span className="text-rose-800 font-bold block">الرصيد المتبقي المستحق (لينا)</span>
                <strong className="text-base font-black text-rose-950 font-mono">{(Number(selectedCustomer.balance) || 0).toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-slate-950 border-r-4 border-amber-500 pr-2">
                سجل التعاملات وحركات كشف الحساب التفصيلي (المقايسات، العربون، الفواتير، وسندات التحصيل):
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
                <span>💰 تسجيل دفعة تحصيل نقدية / بنكية</span>
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
                <select
                  value={custCity}
                  onChange={e => setCustCity(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none"
                >
                  <option value="الفرع الرئيسي">الفرع الرئيسي — القاهرة</option>
                  <option value="فرع عرابي">فرع عرابي — الشيخ زايد</option>
                  <option value="فرع التجمع">فرع التجمع الخامس</option>
                  <option value="فرع الثلاثيني">فرع الثلاثيني</option>
                  <option value="فرع عمر أفندي">فرع عمر أفندي</option>
                </select>
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
                  {(['نقدي', 'إنستاباي', 'فودافون كاش', 'تحويل بنكي', 'شيك'] as const).map(m => (
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:outline-none"
                >
                  <option value="الخزينة الرئيسية">الخزينة الرئيسية — القاهرة</option>
                  <option value="خزينة فرع عرابي">خزينة فرع عرابي</option>
                  <option value="خزينة فرع التجمع">خزينة فرع التجمع الخامس</option>
                  <option value="حساب بنك مصر">حساب بنك مصر</option>
                  <option value="حساب CIB">حساب البنك التجاري الدولي (CIB)</option>
                  <option value="محفظة إنستاباي">محفظة إنستاباي المؤسسة</option>
                </select>
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
