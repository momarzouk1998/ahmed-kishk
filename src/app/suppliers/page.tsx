'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  categoriesSupplied: string[];
  totalPurchases: number;
  paidAmount: number;
  balanceOwed: number; // positive = we owe supplier (علينا للمورد)
  notes: string;
  createdAt: string;
}

interface SupplierPayment {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  method: 'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك';
  treasury: string;
  notes: string;
}

interface SupplierCheck {
  id: string;
  checkNumber: string;
  bankName: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'قيد الانتظار' | 'تم الصرف' | 'مرتد / ملغي';
  notes: string;
}

const defaultSuppliers: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'شركة النيل للأقمشة والمنسوجات',
    phone: '01099988877',
    address: 'القاهرة — شارع المعز',
    categoriesSupplied: ['قطيفة تركي', 'حرير سواريه', 'كريب ممتاز'],
    totalPurchases: 85000,
    paidAmount: 79800,
    balanceOwed: 5200,
    notes: 'مورد رئيسي لخامات السوارية. التوريد بشيك 30 يوم.',
    createdAt: '2026-08-01',
  },
  {
    id: 'SUP-002',
    name: 'مصنع الدلتا لإكسسوارات الستائر',
    phone: '01011223344',
    address: 'المنصورة — المنطقة الصناعية',
    categoriesSupplied: ['بلاك آوت', 'تول', 'مواسير فورجيه', 'تراكات سقف'],
    totalPurchases: 42000,
    paidAmount: 40200,
    balanceOwed: 1800,
    notes: 'مورد مواسير وإكسسوارات التراك.',
    createdAt: '2026-08-10',
  },
  {
    id: 'SUP-003',
    name: 'مستورد الشرق للتول والشيفون',
    phone: '01244556677',
    address: 'الإسكندرية — المنشية',
    categoriesSupplied: ['شيفون ناعم', 'أشرطة كشكشة 3 فتلة', 'شريط ويفي'],
    totalPurchases: 28000,
    paidAmount: 28000,
    balanceOwed: 0,
    notes: 'مسدد بالكامل.',
    createdAt: '2026-08-15',
  },
];

const defaultPayments: SupplierPayment[] = [
  {
    id: 'SPAY-101',
    date: '2026-08-25',
    supplierId: 'SUP-001',
    supplierName: 'شركة النيل للأقمشة والمنسوجات',
    amount: 15000,
    method: 'تحويل بنكي',
    treasury: 'حساب البنك الأهلي',
    notes: 'دفعة حساب توريد ثوب القطيفة التركي',
  },
  {
    id: 'SPAY-102',
    date: '2026-08-20',
    supplierId: 'SUP-002',
    supplierName: 'مصنع الدلتا لإكسسوارات الستائر',
    amount: 8000,
    method: 'نقدي',
    treasury: 'الخزينة الرئيسية',
    notes: 'سداد شحنة أشرطة ومواسير فورجيه',
  },
];

const defaultChecks: SupplierCheck[] = [
  {
    id: 'CHK-501',
    checkNumber: '8879401',
    bankName: 'البنك الأهلي المصري',
    supplierId: 'SUP-001',
    supplierName: 'شركة النيل للأقمشة والمنسوجات',
    amount: 5200,
    issueDate: '2026-08-20',
    dueDate: '2026-09-15',
    status: 'قيد الانتظار',
    notes: 'شيك مؤجل مستحق منتصف سبتمبر',
  },
  {
    id: 'CHK-502',
    checkNumber: '4451209',
    bankName: 'بنك مصر',
    supplierId: 'SUP-002',
    supplierName: 'مصنع الدلتا لإكسسوارات الستائر',
    amount: 1800,
    issueDate: '2026-08-10',
    dueDate: '2026-08-30',
    status: 'تم الصرف',
    notes: 'تم الخصم والصرف بنجاح',
  },
];

const SUPPLIERS_KEY = 'ahmed_kishk_suppliers_v2';
const SPAYMENTS_KEY = 'ahmed_kishk_spayments_v2';
const SCHECKS_KEY = 'ahmed_kishk_schecks_v2';

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'PAYMENTS' | 'CHECKS'>('SUPPLIERS');

  const [suppliers, setSuppliers] = useState<Supplier[]>(defaultSuppliers);
  const [payments, setPayments] = useState<SupplierPayment[]>(defaultPayments);
  const [checks, setChecks] = useState<SupplierCheck[]>(defaultChecks);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddCheckModal, setShowAddCheckModal] = useState(false);

  // New Supplier Form
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supCategories, setSupCategories] = useState('');
  const [supNotes, setSupNotes] = useState('');

  // New Payment Form
  const [paySupplierId, setPaySupplierId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(1000);
  const [payMethod, setPayMethod] = useState<'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك'>('نقدي');
  const [payTreasury, setPayTreasury] = useState('الخزينة الرئيسية');
  const [payNotes, setPayNotes] = useState('');

  // New Check Form
  const [chkNumber, setChkNumber] = useState('');
  const [chkBank, setChkBank] = useState('البنك الأهلي المصري');
  const [chkSupplierId, setChkSupplierId] = useState('');
  const [chkAmount, setChkAmount] = useState<number>(5000);
  const [chkDueDate, setChkDueDate] = useState('2026-09-30');
  const [chkNotes, setChkNotes] = useState('');

  useEffect(() => {
    try {
      const rawS = localStorage.getItem(SUPPLIERS_KEY);
      if (rawS) setSuppliers(JSON.parse(rawS));

      const rawP = localStorage.getItem(SPAYMENTS_KEY);
      if (rawP) setPayments(JSON.parse(rawP));

      const rawC = localStorage.getItem(SCHECKS_KEY);
      if (rawC) setChecks(JSON.parse(rawC));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveSuppliersState = (list: Supplier[]) => {
    setSuppliers(list);
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(list));
  };

  const savePaymentsState = (list: SupplierPayment[]) => {
    setPayments(list);
    localStorage.setItem(SPAYMENTS_KEY, JSON.stringify(list));
  };

  const saveChecksState = (list: SupplierCheck[]) => {
    setChecks(list);
    localStorage.setItem(SCHECKS_KEY, JSON.stringify(list));
  };

  // Submit Add Supplier
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    const newSup: Supplier = {
      id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
      name: supName.trim(),
      phone: supPhone.trim(),
      address: supAddress.trim(),
      categoriesSupplied: supCategories ? supCategories.split(',').map(c => c.trim()) : ['أقمشة'],
      totalPurchases: 0,
      paidAmount: 0,
      balanceOwed: 0,
      notes: supNotes.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveSuppliersState([newSup, ...suppliers]);
    setShowAddSupplierModal(false);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
    setSupCategories('');
    setSupNotes('');
    alert('تم إضافة المورد بنجاح ✓');
  };

  // Submit Add Payment
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSup = suppliers.find(s => s.id === paySupplierId);
    if (!targetSup || payAmount <= 0) return;

    const newPay: SupplierPayment = {
      id: `SPAY-${100 + payments.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      supplierId: targetSup.id,
      supplierName: targetSup.name,
      amount: payAmount,
      method: payMethod,
      treasury: payTreasury,
      notes: payNotes.trim(),
    };

    savePaymentsState([newPay, ...payments]);

    // Deduct balance owed
    const updatedSuppliers = suppliers.map(s => {
      if (s.id === targetSup.id) {
        return {
          ...s,
          paidAmount: s.paidAmount + payAmount,
          balanceOwed: Math.max(0, s.balanceOwed - payAmount),
        };
      }
      return s;
    });
    saveSuppliersState(updatedSuppliers);

    setShowAddPaymentModal(false);
    setPayAmount(1000);
    setPayNotes('');
    alert(`تم تسجيل إذن سداد بمبلغ ${payAmount.toLocaleString()} ج للمورد "${targetSup.name}" بنجاح ✓`);
  };

  // Submit Add Check
  const handleAddCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSup = suppliers.find(s => s.id === chkSupplierId);
    if (!targetSup || !chkNumber.trim() || chkAmount <= 0) return;

    const newCheck: SupplierCheck = {
      id: `CHK-${500 + checks.length + 1}`,
      checkNumber: chkNumber.trim(),
      bankName: chkBank,
      supplierId: targetSup.id,
      supplierName: targetSup.name,
      amount: chkAmount,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: chkDueDate,
      status: 'قيد الانتظار',
      notes: chkNotes.trim(),
    };

    saveChecksState([newCheck, ...checks]);
    setShowAddCheckModal(false);
    setChkNumber('');
    setChkAmount(5000);
    setChkNotes('');
    alert('تم تسجيل الشيك المؤجل بنجاح ✓');
  };

  const handleToggleCheckStatus = (chkId: string) => {
    const updated = checks.map(c => {
      if (c.id === chkId) {
        const nextStatus: SupplierCheck['status'] = c.status === 'قيد الانتظار' ? 'تم الصرف' : 'قيد الانتظار';
        return { ...c, status: nextStatus };
      }
      return c;
    });
    saveChecksState(updated);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف المورد "${name}"؟`)) {
      saveSuppliersState(suppliers.filter(s => s.id !== id));
    }
  };

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter(s => {
    return s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) || s.address.toLowerCase().includes(search.toLowerCase());
  });

  // Filtered Payments
  const filteredPayments = payments.filter(p => {
    return p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      p.notes.toLowerCase().includes(search.toLowerCase());
  });

  // Filtered Checks
  const filteredChecks = checks.filter(c => {
    const matchSearch = c.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      c.checkNumber.includes(search) || c.bankName.includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Metrics
  const totalBalanceOwed = filteredSuppliers.reduce((s, c) => s + c.balanceOwed, 0);
  const suppliersOwedCount = filteredSuppliers.filter(s => s.balanceOwed > 0).length;

  const totalPaymentsAmount = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const pendingChecksTotal = filteredChecks.filter(c => c.status === 'قيد الانتظار').reduce((s, c) => s + c.amount, 0);

  return (
    <PageShell title="إدارة الموردين والحسابات">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Navigation Tabs (3 Tabs) */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SUPPLIERS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>🏭 الموردين</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{suppliers.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYMENTS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PAYMENTS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>💸 السداد والمصروفات</span>
            <span className="bg-emerald-100 text-emerald-950 px-2 rounded-full text-[11px] font-mono font-bold">{payments.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CHECKS')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'CHECKS' ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>🧾 الشيكات البنكية</span>
            <span className="bg-purple-100 text-purple-950 px-2 rounded-full text-[11px] font-mono font-bold">{checks.length}</span>
          </button>
        </div>

        {/* TAB 1: SUPPLIERS */}
        {activeTab === 'SUPPLIERS' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي عدد الموردين: {filteredSuppliers.length} مورد</span>

              <button
                type="button"
                onClick={() => setShowAddSupplierModal(true)}
                className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                <span>+ إضافة مورد جديد</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">عدد الموردين المسجلين</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredSuppliers.length} مورد</strong>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
                <span className="text-rose-800 font-bold block">إجمالي المستحقات (علينا للموردين)</span>
                <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalBalanceOwed.toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">موردين لهم مستحقات</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{suppliersOwedCount} مورد</strong>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder="ابحث باسم المورد، رقم الهاتف، أو الخامات التابعة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs text-xs"
                />
              </div>
            </div>

            {/* Suppliers Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">اسم المورد</th>
                      <th className="p-3.5">الهاتف والعنوان</th>
                      <th className="p-3.5">الخامات والأصناف الموردة</th>
                      <th className="p-3.5 text-center font-mono">إجمالي المشتريات</th>
                      <th className="p-3.5 text-center font-mono">المستحق (علينا)</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map(sup => (
                      <tr key={sup.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <span className="text-sm font-black text-slate-950 block">{sup.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{sup.id}</span>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <div className="font-mono text-slate-900 font-bold" dir="ltr">{sup.phone}</div>
                          <div className="text-slate-500 text-[11px] truncate max-w-[200px]">{sup.address}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {sup.categoriesSupplied.map((cat, i) => (
                              <span key={i} className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-3.5 text-center font-mono font-black text-slate-900">
                          {sup.totalPurchases.toLocaleString()} ج
                        </td>

                        <td className="p-3.5 text-center font-mono font-black text-sm">
                          <span className={sup.balanceOwed > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                            {sup.balanceOwed.toLocaleString()} ج
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPaySupplierId(sup.id);
                                setPayAmount(sup.balanceOwed > 0 ? sup.balanceOwed : 1000);
                                setShowAddPaymentModal(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              💸 تسجيل سداد
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف المورد"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
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

        {/* TAB 2: PAYMENTS */}
        {activeTab === 'PAYMENTS' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي مدفوعات الموردين: {filteredPayments.length} عملية سداد</span>

              <button
                type="button"
                onClick={() => setShowAddPaymentModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">outbox</span>
                <span>+ تسجيل سداد جديد</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي المبالغ المسددة</span>
                <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">{totalPaymentsAmount.toLocaleString()} ج</strong>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">عدد عمليات السداد</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredPayments.length} عملية</strong>
              </div>

              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 text-center shadow-3xs">
                <span className="text-blue-900 font-bold block">متوسط السداد لكل مورد</span>
                <strong className="text-xl font-black text-blue-950 mt-1 block font-mono">
                  {suppliers.length > 0 ? Math.round(totalPaymentsAmount / suppliers.length).toLocaleString() : 0} ج
                </strong>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">التاريخ</th>
                      <th className="p-3.5">اسم المورد</th>
                      <th className="p-3.5 font-mono text-center">المبلغ المسدد</th>
                      <th className="p-3.5 text-center">طريقة السداد</th>
                      <th className="p-3.5">الخزينة / الحساب المسحوب منه</th>
                      <th className="p-3.5">الملاحظات والتفاصيل</th>
                      <th className="p-3.5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(pay => (
                      <tr key={pay.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-slate-700 font-bold">{pay.date}</td>
                        <td className="p-3.5 font-bold text-slate-900">{pay.supplierName}</td>
                        <td className="p-3.5 text-center font-mono font-black text-sm text-rose-700">
                          -{pay.amount.toLocaleString()} ج
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {pay.method}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 font-bold">{pay.treasury}</td>
                        <td className="p-3.5 text-slate-600">{pay.notes || '—'}</td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => alert(`إذن صرف رقم (${pay.id})\nالمورد: ${pay.supplierName}\nالمبلغ: ${pay.amount} ج`)}
                            className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            🖨️ إذن صرف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CHECKS */}
        {activeTab === 'CHECKS' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">متابعة الشيكات البنكية والمؤجلة للموردين</span>

              <button
                type="button"
                onClick={() => setShowAddCheckModal(true)}
                className="bg-purple-900 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">news</span>
                <span>+ تسجيل شيك بنكي جديد</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي الشيكات الصادرة</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredChecks.reduce((s, c) => s + c.amount, 0).toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">شيكات قيد الانتظار (لم تصرف بعد)</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{pendingChecksTotal.toLocaleString()} ج</strong>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block">شيكات تم صرفها بالكامل</span>
                <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">
                  {filteredChecks.filter(c => c.status === 'تم الصرف').reduce((s, c) => s + c.amount, 0).toLocaleString()} ج
                </strong>
              </div>
            </div>

            {/* Checks Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">رقم الشيك والبنك</th>
                      <th className="p-3.5">اسم المورد المستفيد</th>
                      <th className="p-3.5 font-mono text-center">قيمة الشيك</th>
                      <th className="p-3.5 font-mono text-center">تاريخ الإصدار</th>
                      <th className="p-3.5 font-mono text-center">تاريخ الاستحقاق</th>
                      <th className="p-3.5 text-center">حالة الشيك</th>
                      <th className="p-3.5 text-center">تحديث الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChecks.map(chk => {
                      const statusBadgeClass = chk.status === 'تم الصرف' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-200';

                      return (
                        <tr key={chk.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="font-mono text-indigo-950 text-sm font-black">#{chk.checkNumber}</div>
                            <div className="text-[11px] text-slate-500 font-bold">{chk.bankName}</div>
                          </td>

                          <td className="p-3.5 font-bold text-slate-900">{chk.supplierName}</td>

                          <td className="p-3.5 text-center font-mono font-black text-sm text-purple-950">
                            {chk.amount.toLocaleString()} ج
                          </td>

                          <td className="p-3.5 text-center font-mono text-slate-700">{chk.issueDate}</td>

                          <td className="p-3.5 text-center font-mono font-bold text-rose-800">{chk.dueDate}</td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${statusBadgeClass}`}>
                              {chk.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCheckStatus(chk.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              {chk.status === 'تم الصرف' ? 'إعادة لقيد الانتظار ↩' : 'تأكيد الصرف ✓'}
                            </button>
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
      </div>

      {/* ➕ Modal: Add Supplier */}
      {showAddSupplierModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">إضافة مورد جديد</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">✕</button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم المورد / الشركة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة النيل للأقمشة"
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الهاتف التواصل:</label>
                <input
                  type="text"
                  placeholder="مثال: 01099988877"
                  value={supPhone}
                  onChange={e => setSupPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">عنوان المورد أو المصنع:</label>
                <input
                  type="text"
                  placeholder="المدينة، الشارع، المصنع..."
                  value={supAddress}
                  onChange={e => setSupAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الخامات الموردة (مفصولة بفارزة):</label>
                <input
                  type="text"
                  placeholder="مثال: قطيفة تركي, بلاك آوت, مواسير"
                  value={supCategories}
                  onChange={e => setSupCategories(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">شروط وملاحظات التوريد:</label>
                <textarea
                  rows={2}
                  placeholder="طريقة الدفع، مواعيد الشحن..."
                  value={supNotes}
                  onChange={e => setSupNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow-gold cursor-pointer">
                  حفظ المورد ✓
                </button>
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ➕ Modal: Add Payment */}
      {showAddPaymentModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تسجيل سداد للمورد</h3>
              <button onClick={() => setShowAddPaymentModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">✕</button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اختر المورد:</label>
                <select
                  value={paySupplierId}
                  onChange={e => {
                    setPaySupplierId(e.target.value);
                    const target = suppliers.find(s => s.id === e.target.value);
                    if (target && target.balanceOwed > 0) setPayAmount(target.balanceOwed);
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المورد --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.balanceOwed > 0 ? `مستحق له: ${s.balanceOwed} ج` : 'حساب خالص'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ المسدد (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">طريقة السداد:</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="إنستاباي">إنستاباي</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="شيك">شيك مؤجل</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الخصم من خزينة / حساب:</label>
                <input
                  type="text"
                  value={payTreasury}
                  onChange={e => setPayTreasury(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ملاحظات والتفاصيل:</label>
                <input
                  type="text"
                  placeholder="سداد فاتورة أقمشة رقم..."
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs shadow-xs cursor-pointer">
                  تأكيد وتسجيل السداد ✓
                </button>
                <button type="button" onClick={() => setShowAddPaymentModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ➕ Modal: Add Check */}
      {showAddCheckModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تسجيل شيك بنكي جديد للمورد</h3>
              <button onClick={() => setShowAddCheckModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">✕</button>
            </div>

            <form onSubmit={handleAddCheck} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الشيك:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 8879401"
                  value={chkNumber}
                  onChange={e => setChkNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم البنك المسحوب عليه:</label>
                <select
                  value={chkBank}
                  onChange={e => setChkBank(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="البنك الأهلي المصري">البنك الأهلي المصري</option>
                  <option value="بنك مصر">بنك مصر</option>
                  <option value="البنك تجاري الدولي (CIB)">البنك التجاري الدولي (CIB)</option>
                  <option value="بنك القاهرة">بنك القاهرة</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المورد المستفيد:</label>
                <select
                  value={chkSupplierId}
                  onChange={e => setChkSupplierId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المورد --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">مبلغ الشيك (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={chkAmount}
                  onChange={e => setChkAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">تاريخ الاستحقاق:</label>
                <input
                  type="date"
                  required
                  value={chkDueDate}
                  onChange={e => setChkDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ملاحظات الشيك:</label>
                <input
                  type="text"
                  placeholder="ملاحظات..."
                  value={chkNotes}
                  onChange={e => setChkNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-purple-900 hover:bg-purple-800 text-white py-2.5 rounded-xl font-black text-xs shadow-xs cursor-pointer">
                  تأكيد وتجميع الشيك ✓
                </button>
                <button type="button" onClick={() => setShowAddCheckModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
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
