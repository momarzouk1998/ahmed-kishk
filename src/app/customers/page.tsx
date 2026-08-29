'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { formatDateOnly } from '@/lib/dateUtils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  inspectionsCount: number;
  ordersCount: number;
  totalSpent: number;
  openingBalance: number;
  balance: number; // positive = owed by customer (لينا), negative = credit (علينا)
  notes: string;
  createdAt: string;
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

interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: 'مقايسة ستائر' | 'فاتورة مبيعات' | 'سداد / تحصيل' | 'مرتجع مبيعات';
  description: string;
  debit: number;  // مدين (علي العميل)
  credit: number; // دائن (من العميل)
  balanceAfter: number;
}

const defaultCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    city: 'القاهرة الجديدة',
    inspectionsCount: 2,
    ordersCount: 1,
    totalSpent: 12600,
    openingBalance: 0,
    balance: 5600,
    notes: 'عميل فيلا — يفضل أقمشة السوارية الثقيلة',
    createdAt: '2026-08-20',
  },
  {
    id: 'CUST-002',
    name: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    city: '6 أكتوبر',
    inspectionsCount: 1,
    ordersCount: 1,
    totalSpent: 8500,
    openingBalance: 0,
    balance: 3800,
    notes: 'طلب معاينة قيد المتابعة',
    createdAt: '2026-08-22',
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
    openingBalance: 0,
    balance: 0,
    notes: 'حساب تجاري شركي — سداد بشيكات',
    createdAt: '2026-08-15',
  },
  {
    id: 'CUST-004',
    name: 'م/ طارق عبد المحسن',
    phone: '01144556677',
    address: 'المعادي، دجلة',
    city: 'القاهرة',
    inspectionsCount: 1,
    ordersCount: 1,
    totalSpent: 7200,
    openingBalance: 0,
    balance: 3200,
    notes: 'تم الدفع جزئياً',
    createdAt: '2026-08-25',
  },
];

const defaultCollections: CustomerCollection[] = [
  {
    id: 'COL-101',
    date: '2026-08-28',
    customerId: 'CUST-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    amount: 7000,
    method: 'نقدي',
    treasury: 'الخزينة الرئيسية',
    notes: 'عربون مقايسة الصالة الرئيسية',
  },
  {
    id: 'COL-102',
    date: '2026-08-27',
    customerId: 'CUST-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    amount: 4700,
    method: 'إنستاباي',
    treasury: 'حساب إنستاباي البنكي',
    notes: 'عربون خياطة ستائر الشيخ زايد',
  },
];

const CUSTOMERS_KEY = 'ahmed_kishk_customers_v3';
const COLLECTIONS_KEY = 'ahmed_kishk_collections_v3';

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'COLLECTIONS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<Customer[]>(defaultCustomers);
  const [collections, setCollections] = useState<CustomerCollection[]>(defaultCollections);

  // Selected Customer for Full Details & Statement Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [printableStatement, setPrintableStatement] = useState<Customer | null>(null);

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

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch('/api/customers', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.customers) && json.customers.length > 0) {
            setCustomers(json.customers);
            localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(json.customers));
          } else {
            const rawC = localStorage.getItem(CUSTOMERS_KEY);
            if (rawC) setCustomers(JSON.parse(rawC));
          }
        }
      } catch (e) {
        console.error(e);
      }

      try {
        const rawCol = localStorage.getItem(COLLECTIONS_KEY);
        if (rawCol) setCollections(JSON.parse(rawCol));
      } catch {}
    }

    loadCustomers();
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

  const saveCollectionsState = (list: CustomerCollection[]) => {
    setCollections(list);
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(list));
  };

  // Add Customer Submit
  const handleAddCustomer = (e: React.FormEvent) => {
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
      openingBalance: 0,
      balance: 0,
      notes: custNotes.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveCustomersState([newC, ...customers]);
    setShowAddCustomerModal(false);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustNotes('');
    alert('تم إضافة العميل بنجاح ✓');
  };

  // Add Collection Submit
  const handleAddCollection = (e: React.FormEvent) => {
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

    saveCollectionsState([newCol, ...collections]);

    // Deduct balance from customer
    const updatedCustomers = customers.map(c => {
      if (c.id === targetCustomer.id) {
        const updatedB = Math.max(0, c.balance - colAmount);
        const updatedObj = { ...c, balance: updatedB };
        if (selectedCustomer?.id === c.id) setSelectedCustomer(updatedObj);
        return updatedObj;
      }
      return c;
    });
    saveCustomersState(updatedCustomers);

    setShowAddCollectionModal(false);
    setColAmount(1000);
    setColNotes('');
    alert(`تم تسجيل تحصيل مبلغ ${colAmount.toLocaleString()} ج من العميل "${targetCustomer.name}" بنجاح ✓`);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف بيانات العميل "${name}"؟`)) {
      const filteredC = customers.filter(c => c.id !== id);
      saveCustomersState(filteredC);
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    }
  };

  // Generate Dynamic Ledger Transactions for Selected Customer
  const generateCustomerLedger = (cust: Customer): CustomerLedgerEntry[] => {
    const entries: CustomerLedgerEntry[] = [];
    let runningBalance = cust.openingBalance || 0;

    if (cust.openingBalance > 0) {
      entries.push({
        id: 'INIT-1',
        date: cust.createdAt,
        type: 'مقايسة ستائر',
        description: 'رصيد افتتاحي سابق',
        debit: cust.openingBalance,
        credit: 0,
        balanceAfter: runningBalance,
      });
    }

    if (cust.totalSpent > 0) {
      runningBalance += cust.totalSpent;
      entries.push({
        id: 'INV-TOTAL',
        date: cust.createdAt,
        type: 'مقايسة ستائر',
        description: `إجمالي مقايسة وتوريد أقمشة ستائر (${cust.ordersCount} أوردر)`,
        debit: cust.totalSpent,
        credit: 0,
        balanceAfter: runningBalance,
      });
    }

    const custCols = collections.filter(c => c.customerId === cust.id || c.customerName === cust.name);
    custCols.forEach(col => {
      runningBalance -= col.amount;
      entries.push({
        id: col.id,
        date: col.date,
        type: 'سداد / تحصيل',
        description: `دفعة سداد تحصيل (${col.method}) - ${col.notes || 'إيصال استلام'}`,
        debit: 0,
        credit: col.amount,
        balanceAfter: runningBalance,
      });
    });

    return entries;
  };

  // Filtered Customers
  const filteredCustomers = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) || c.address.toLowerCase().includes(search.toLowerCase());
    
    let matchStatus = true;
    if (statusFilter === 'unpaid') matchStatus = c.balance > 0.01;
    else if (statusFilter === 'overpaid') matchStatus = c.balance < -0.01;
    else if (statusFilter === 'cleared') matchStatus = Math.abs(c.balance) <= 0.01;

    return matchSearch && matchStatus;
  });

  // Filtered Collections
  const filteredCollections = collections.filter(col => {
    const matchSearch = col.customerName.toLowerCase().includes(search.toLowerCase()) ||
      col.phone.includes(search) || col.notes.toLowerCase().includes(search.toLowerCase());
    const matchMethod = methodFilter === 'all' || col.method === methodFilter;
    return matchSearch && matchMethod;
  });

  // Financial Metrics
  const totalDebtsLina = filteredCustomers.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);
  const totalPrepaidAleena = filteredCustomers.reduce((s, c) => s + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
  const totalDebtorsCount = filteredCustomers.filter(c => c.balance > 0.01).length;

  const totalCollectionsAmount = filteredCollections.reduce((s, col) => s + col.amount, 0);
  const cashCollectionsAmount = filteredCollections.filter(c => c.method === 'نقدي').reduce((s, c) => s + c.amount, 0);

  return (
    <PageShell title="إدارة العملاء والتحصيلات">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Navigation Tabs (2 Tabs) */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'CUSTOMERS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>👥 العملاء والديون</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{customers.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COLLECTIONS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'COLLECTIONS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>💰 سجل التحصيلات</span>
            <span className="bg-emerald-100 text-emerald-950 px-2 rounded-full text-[11px] font-mono font-bold">{collections.length}</span>
          </button>
        </div>

        {/* TAB 1: CUSTOMERS */}
        {activeTab === 'CUSTOMERS' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي عدد العملاء المسجلين: {filteredCustomers.length} عميل (اضغط على السطر لفتح التقرير وكشف الحساب)</span>

              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>+ إضافة عميل جديد</span>
              </button>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">عدد العملاء</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredCustomers.length}</strong>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
                <span className="text-rose-800 font-bold block">إجمالي الديون (لينا)</span>
                <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalDebtsLina.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">عملاء مدينين</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{totalDebtorsCount} عميل</strong>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block">مدفوعات مقدمة (علينا)</span>
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
                  <option value="unpaid">لم يتم السداد (عملاء مدينين)</option>
                  <option value="overpaid">مدفوعات زائدة (علينا)</option>
                  <option value="cleared">حساب خالص (خالي من الديون)</option>
                </select>
              </div>
            </div>

            {/* Customers Table View (Interactive Row Click) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">اسم العميل</th>
                      <th className="p-3.5">الهاتف والعنوان</th>
                      <th className="p-3.5 text-center">المقايسات والأوامر</th>
                      <th className="p-3.5 text-center font-mono">إجمالي المشتريات</th>
                      <th className="p-3.5 text-center font-mono">الرصيد المتبقي</th>
                      <th className="p-3.5 text-center">الحالة المالية</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map(cust => {
                      const statusLabel = cust.balance > 0.01 ? 'لم يتم السداد' : cust.balance < -0.01 ? 'مدفوعات زائدة' : 'حساب خالص';
                      const badgeClass = cust.balance > 0.01 ? 'bg-rose-100 text-rose-900 border-rose-200' : cust.balance < -0.01 ? 'bg-blue-100 text-blue-900 border-blue-200' : 'bg-emerald-100 text-emerald-900 border-emerald-200';

                      return (
                        <tr
                          key={cust.id}
                          onClick={() => setSelectedCustomer(cust)}
                          className="border-t border-slate-100 hover:bg-amber-50/40 cursor-pointer transition-colors"
                        >
                          <td className="p-3.5 font-bold text-slate-900">
                            <span className="text-sm font-black text-indigo-950 block">{cust.name}</span>
                            <span className="text-[10px] text-amber-700 font-mono">اضغط لفتح كشف الحساب والتفاصيل 📋</span>
                          </td>

                          <td className="p-3.5 text-slate-700">
                            <div className="font-mono text-slate-900 font-bold" dir="ltr">{cust.phone}</div>
                            <div className="text-slate-500 text-[11px] truncate max-w-[220px]">{cust.address}</div>
                          </td>

                          <td className="p-3.5 text-center font-mono font-bold">
                            {cust.ordersCount} طلبات ({cust.inspectionsCount} معاينات)
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-slate-900">
                            {cust.totalSpent.toLocaleString()} ج
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-sm">
                            <span className={cust.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                              {cust.balance.toLocaleString()} ج
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${badgeClass}`}>
                              {statusLabel}
                            </span>
                          </td>

                          <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedCustomer(cust)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                📋 تفاصيل
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setColCustomerId(cust.id);
                                  setColAmount(cust.balance > 0 ? cust.balance : 1000);
                                  setShowAddCollectionModal(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
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
                    })}
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
              <span className="text-xs font-bold text-slate-500">إجمالي عمليات التحصيل: {filteredCollections.length} عملية</span>

              <button
                type="button"
                onClick={() => setShowAddCollectionModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span>+ تسجيل تحصيل جديد</span>
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
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
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
                    {filteredCollections.map(col => (
                      <tr key={col.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-slate-700 font-bold">{col.date ? formatDateOnly(col.date) : 'غير محدد'}</td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{col.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{col.phone}</div>
                        </td>
                        <td className="p-3.5 text-center font-mono font-black text-sm text-emerald-700">
                          +{col.amount.toLocaleString()} ج
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
                              onClick={() => alert(`إيصال تحصيل رقم (${col.id})\nالعميل: ${col.customerName}\nالمبلغ: ${col.amount} ج`)}
                              className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              title="طباعة إيصال"
                            >
                              🖨️
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const newAmountStr = prompt(`تعديل مبلغ التحصيل للعميل "${col.customerName}":`, col.amount.toString());
                                if (newAmountStr !== null) {
                                  const newAmount = Number(newAmountStr);
                                  if (newAmount > 0) {
                                    const updated = collections.map(c => c.id === col.id ? { ...c, amount: newAmount } : c);
                                    saveCollectionsState(updated);
                                    alert('تم تعديل قيمة التحصيل بنجاح ✓');
                                  }
                                }
                              }}
                              className="bg-amber-100 text-amber-950 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              title="تعديل التحصيل"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت أسر بالتأكيد من حذف سداد التحصيل بمبلغ ${col.amount} ج للعميل "${col.customerName}"؟`)) {
                                  saveCollectionsState(collections.filter(c => c.id !== col.id));
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
                    ))}
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
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
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
                <p className="text-xs font-bold text-amber-800">كشف حساب وتاريخ التعاملات المالية للعميل</p>
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
              <div><strong>العنوان:</strong> {selectedCustomer.address}</div>
              <div><strong>المدينة / الفرع:</strong> {selectedCustomer.city}</div>
              <div><strong>عدد المقايسات والطلبات:</strong> {selectedCustomer.ordersCount} طلبات</div>
              <div><strong>ملاحظات العميل:</strong> {selectedCustomer.notes || '—'}</div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-500 font-bold block">الرصيد الافتتاحي</span>
                <strong className="text-base font-black text-slate-900 font-mono">{selectedCustomer.openingBalance.toLocaleString()} ج</strong>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
                <span className="text-emerald-800 font-bold block">إجمالي المشتريات والمقايسات</span>
                <strong className="text-base font-black text-emerald-950 font-mono">{selectedCustomer.totalSpent.toLocaleString()} ج</strong>
              </div>
              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center">
                <span className="text-rose-800 font-bold block">الرصيد الحالي المستحق (لينا)</span>
                <strong className="text-base font-black text-rose-950 font-mono">{selectedCustomer.balance.toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-slate-950 border-r-4 border-amber-500 pr-2">
                سجل التعاملات وحركات كشف الحساب التفصيلي:
              </h4>
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300">التاريخ</th>
                    <th className="p-2 border border-slate-300">نوع الحركة</th>
                    <th className="p-2 border border-slate-300">التفاصيل والبيان</th>
                    <th className="p-2 border border-slate-300 text-center font-mono text-rose-900">مدين (+علي العميل)</th>
                    <th className="p-2 border border-slate-300 text-center font-mono text-emerald-900">دائن (-مسدد)</th>
                    <th className="p-2 border border-slate-300 text-center font-mono">الرصيد بعد الحركة</th>
                  </tr>
                </thead>
                <tbody>
                  {generateCustomerLedger(selectedCustomer).map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-mono">{entry.date ? formatDateOnly(entry.date) : 'غير محدد'}</td>
                      <td className="p-2 border border-slate-300 font-bold">{entry.type}</td>
                      <td className="p-2 border border-slate-300 text-slate-700">{entry.description}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-800">
                        {entry.debit > 0 ? `${entry.debit.toLocaleString()} ج` : '—'}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-emerald-800">
                        {entry.credit > 0 ? `${entry.credit.toLocaleString()} ج` : '—'}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-black text-slate-950">
                        {entry.balanceAfter.toLocaleString()} ج
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Action Footer in Modal */}
            <div className="no-print pt-3 border-t border-slate-200 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setColCustomerId(selectedCustomer.id);
                  setColAmount(selectedCustomer.balance > 0 ? selectedCustomer.balance : 1000);
                  setShowAddCollectionModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                💰 تسجيل دفعة تحصيل الآن
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
                  placeholder="المنطقة، الشارع، رقم العمارة..."
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المدينة / المنطقة:</label>
                <select
                  value={custCity}
                  onChange={e => setCustCity(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="القاهرة">القاهرة</option>
                  <option value="التجمع الخامس">التجمع الخامس</option>
                  <option value="6 أكتوبر">6 أكتوبر</option>
                  <option value="الشيخ زايد">الشيخ زايد</option>
                  <option value="المعادي">المعادي</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ملاحظات العميل:</label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل تفضيلية للعميل..."
                  value={custNotes}
                  onChange={e => setCustNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow-gold cursor-pointer">
                  حفظ العميل ✓
                </button>
                <button type="button" onClick={() => setShowAddCustomerModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
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
              <h3 className="font-bold text-slate-900 text-sm">تسجيل دفعة تحصيل جديدة</h3>
              <button onClick={() => setShowAddCollectionModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddCollection} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اختر العميل:</label>
                <select
                  value={colCustomerId}
                  onChange={e => {
                    setColCustomerId(e.target.value);
                    const target = customers.find(c => c.id === e.target.value);
                    if (target && target.balance > 0) setColAmount(target.balance);
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                  required
                >
                  <option value="">-- اختر العميل --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) — {c.balance > 0 ? `متبقي عليه: ${c.balance} ج` : 'حساب خالص'}
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة السداد:</label>
                <select
                  value={colMethod}
                  onChange={e => setColMethod(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="إنستاباي">إنستاباي</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="شيك">شيك</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">إيداع في خزينة / حساب:</label>
                <input
                  type="text"
                  value={colTreasury}
                  onChange={e => setColTreasury(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ملاحظات ورقم العملية:</label>
                <input
                  type="text"
                  placeholder="مثال: عربون مقايسة الستائر..."
                  value={colNotes}
                  onChange={e => setColNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs shadow-xs cursor-pointer">
                  تأكيد وتسجيل التحصيل ✓
                </button>
                <button type="button" onClick={() => setShowAddCollectionModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
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
