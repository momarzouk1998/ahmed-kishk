'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { formatDateOnly } from '@/lib/dateUtils';
import PdfPrintButton from '@/components/PdfPrintButton';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  branch: string;
  categoriesSupplied: string[];
  totalPurchases: number;
  paidAmount: number;
  openingBalance: number;
  balanceOwed: number; // positive = we owe supplier (علينا للمورد)
  notes: string;
  createdAt: string;
}

// يحوّل صف Supplier القادم من /api/suppliers (عمود balance) إلى الشكل المستخدم فى الواجهة (balanceOwed)
function mapApiSupplier(raw: any): Supplier {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone || '',
    address: raw.address || '',
    branch: raw.branch || 'الفرع الرئيسي',
    categoriesSupplied: Array.isArray(raw.categoriesSupplied) ? raw.categoriesSupplied : ['أقمشة'],
    totalPurchases: Number(raw.totalPurchases) || 0,
    paidAmount: Number(raw.paidAmount) || 0,
    openingBalance: Number(raw.openingBalance) || 0,
    balanceOwed: Number(raw.balance) || 0,
    notes: raw.notes || '',
    createdAt: raw.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
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

interface SupplierLedgerEntry {
  id: string;
  date: string;
  type: 'فاتورة شراء' | 'سداد للمورد' | 'شيك بنكي' | 'مرتجع مشتريات';
  description: string;
  debit: number;  // مدين (-من المورد)
  credit: number; // دائن (+مستحق للمورد)
  balanceAfter: number;
}

const defaultSuppliers: Supplier[] = [];
const defaultPayments: SupplierPayment[] = [];
const defaultChecks: SupplierCheck[] = [];

const SUPPLIERS_KEY = 'ahmed_kishk_suppliers_v3';
const SPAYMENTS_KEY = 'ahmed_kishk_spayments_v3';
const SCHECKS_KEY = 'ahmed_kishk_schecks_v3';

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'PAYMENTS' | 'CHECKS'>('SUPPLIERS');

  const [suppliers, setSuppliers] = useState<Supplier[]>(defaultSuppliers);
  const [payments, setPayments] = useState<SupplierPayment[]>(defaultPayments);
  const [checks, setChecks] = useState<SupplierCheck[]>(defaultChecks);

  // Selected Supplier for Detail View & Statement Modal
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showBatchChecksModal, setShowBatchChecksModal] = useState(false);

  // Edit existing supplier (نفس حقول مودال الإضافة — يحفظ عبر POST /api/suppliers)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // New Supplier Form
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supCategories, setSupCategories] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [supBranch, setSupBranch] = useState('الفرع الرئيسي');
  const [supOpeningBalance, setSupOpeningBalance] = useState<number>(0);
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setSupBranch(currentUser.branch);
  }, [isAdmin, currentUser]);

  // New Payment Form
  const [paySupplierId, setPaySupplierId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(1000);
  const [payMethod, setPayMethod] = useState<'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك'>('نقدي');
  const [payTreasury, setPayTreasury] = useState('الخزينة الرئيسية');
  const [payNotes, setPayNotes] = useState('');

  // Batch / Multiple Checks Entry State
  const [batchSupplierId, setBatchSupplierId] = useState('');
  const [batchCheckRows, setBatchCheckRows] = useState<{
    checkNumber: string;
    bankName: string;
    amount: number;
    dueDate: string;
    notes: string;
  }[]>([
    { checkNumber: '', bankName: 'QNB', amount: 5000, dueDate: '2026-09-30', notes: '' },
    { checkNumber: '', bankName: 'QNB', amount: 3000, dueDate: '2026-10-15', notes: '' },
  ]);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await fetch('/api/suppliers', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.suppliers) && json.suppliers.length > 0) {
            const mapped = json.suppliers.map(mapApiSupplier);
            setSuppliers(mapped);
            localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(mapped));
          } else {
            const rawS = localStorage.getItem(SUPPLIERS_KEY);
            if (rawS) setSuppliers(JSON.parse(rawS));
          }
        }
      } catch (e) {
        console.error(e);
      }

      // #FIX: مدفوعات وشيكات الموردين كانت localStorage فقط (مفيش أى مزامنة سيرفر
      // إطلاقاً) — دلوقتى بتتحمل من الجداول الحقيقية.
      try {
        const payRes = await fetch('/api/supplier-payments', { cache: 'no-store' });
        if (payRes.ok) {
          const payJson = await payRes.json();
          if (payJson.success && Array.isArray(payJson.payments)) {
            setPayments(payJson.payments);
            localStorage.setItem(SPAYMENTS_KEY, JSON.stringify(payJson.payments));
          }
        }
      } catch {
        const rawP = localStorage.getItem(SPAYMENTS_KEY);
        if (rawP) { try { setPayments(JSON.parse(rawP)); } catch {} }
      }

      try {
        const chkRes = await fetch('/api/supplier-checks', { cache: 'no-store' });
        if (chkRes.ok) {
          const chkJson = await chkRes.json();
          if (chkJson.success && Array.isArray(chkJson.checks)) {
            setChecks(chkJson.checks);
            localStorage.setItem(SCHECKS_KEY, JSON.stringify(chkJson.checks));
          }
        }
      } catch {
        const rawC = localStorage.getItem(SCHECKS_KEY);
        if (rawC) { try { setChecks(JSON.parse(rawC)); } catch {} }
      }
    }

    loadSuppliers();
  }, []);

  // #FIX: كانت بتزامن مع /api/system-data بمفتاح غير متعرَّف عليه فى POST (blob ميت لا
  // تقرأه صفحة القائمة أبداً — القائمة بتقرأ من /api/suppliers الحقيقى). الآن state
  // محلى فقط؛ الحفظ الحقيقى يتم صراحةً فى كل دالة تستدعيها.
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
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    const newSup: Supplier = {
      id: `SUP-${Date.now()}`,
      name: supName.trim(),
      phone: supPhone.trim(),
      address: supAddress.trim(),
      branch: supBranch,
      categoriesSupplied: supCategories ? supCategories.split(',').map(c => c.trim()) : ['أقمشة'],
      totalPurchases: 0,
      paidAmount: 0,
      openingBalance: supOpeningBalance || 0,
      balanceOwed: supOpeningBalance || 0,
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
    setSupOpeningBalance(0);

    // #FIX: كان المورد الجديد يُحفظ فى blob ميت فقط ويختفى بعد أى ريفريش. دلوقتى بيتحفظ
    // مباشرة فى جدول Supplier الحقيقى.
    try {
      await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newSup.id,
          name: newSup.name,
          phone: newSup.phone,
          address: newSup.address,
          branch: newSup.branch,
          categoriesSupplied: newSup.categoriesSupplied,
          openingBalance: newSup.openingBalance,
          balance: newSup.balanceOwed,
          notes: newSup.notes,
        }),
      });
    } catch (err) {
      console.error('Failed to save new supplier to server:', err);
    }
  };

  // Submit Edit Supplier — يعدّل البيانات الوصفية فقط (اسم/هاتف/عنوان/خامات/ملاحظات/رصيد
  // افتتاحى). لا يمس totalPurchases أو paidAmount (مش مُرسَلين ⇒ الـ API يحافظ عليهم).
  // لو اتغيّر الرصيد الافتتاحى، يُعدَّل balanceOwed بنفس الفارق لإبقاء كشف الحساب متسقاً.
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;

    const prev = suppliers.find(s => s.id === editingSupplier.id);
    const openingDelta = (Number(editingSupplier.openingBalance) || 0) - (Number(prev?.openingBalance) || 0);
    const newBalanceOwed = Math.max(0, (Number(editingSupplier.balanceOwed) || 0) + openingDelta);

    const updatedObj: Supplier = {
      ...editingSupplier,
      name: editingSupplier.name.trim(),
      phone: editingSupplier.phone.trim(),
      address: editingSupplier.address.trim(),
      notes: editingSupplier.notes.trim(),
      categoriesSupplied: Array.isArray(editingSupplier.categoriesSupplied)
        ? editingSupplier.categoriesSupplied.map(c => c.trim()).filter(Boolean)
        : [],
      balanceOwed: newBalanceOwed,
    };

    saveSuppliersState(suppliers.map(s => (s.id === updatedObj.id ? updatedObj : s)));
    if (selectedSupplier?.id === updatedObj.id) setSelectedSupplier(updatedObj);
    setEditingSupplier(null);

    try {
      await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatedObj.id,
          name: updatedObj.name,
          phone: updatedObj.phone,
          address: updatedObj.address,
          branch: updatedObj.branch,
          categoriesSupplied: updatedObj.categoriesSupplied,
          openingBalance: updatedObj.openingBalance,
          balance: updatedObj.balanceOwed,
          notes: updatedObj.notes,
        }),
      });
    } catch (err) {
      console.error('Failed to update supplier on server:', err);
    }
  };

  // Submit Add Payment
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSup = suppliers.find(s => s.id === paySupplierId);
    if (!targetSup || payAmount <= 0) return;

    const newPay: SupplierPayment = {
      id: `SPAY-${Date.now()}`,
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
    const updatedPaid = targetSup.paidAmount + payAmount;
    const updatedBalance = Math.max(0, targetSup.balanceOwed - payAmount);
    const updatedSuppliers = suppliers.map(s => {
      if (s.id === targetSup.id) {
        const updatedObj = { ...s, paidAmount: updatedPaid, balanceOwed: updatedBalance };
        if (selectedSupplier?.id === s.id) setSelectedSupplier(updatedObj);
        return updatedObj;
      }
      return s;
    });
    saveSuppliersState(updatedSuppliers);

    setShowAddPaymentModal(false);
    setPayAmount(1000);
    setPayNotes('');

    // #FIX: سند السداد ورصيد المورد المُحدَّث كانا localStorage فقط بلا أى مزامنة سيرفر.
    try {
      await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPay),
      });
      await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetSup.id, paidAmount: updatedPaid, balance: updatedBalance }),
      });
    } catch (err) {
      console.error('Failed to sync payment to server:', err);
    }
  };

  // Submit Multiple Batch Checks
  const handleAddBatchChecksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSup = suppliers.find(s => s.id === batchSupplierId);
    if (!targetSup) return;

    const validRows = batchCheckRows.filter(r => r.checkNumber.trim() !== '' && r.amount > 0);
    if (validRows.length === 0) return;

    const createdChecks: SupplierCheck[] = validRows.map((r, idx) => ({
      id: `CHK-${Date.now()}-${idx}`,
      checkNumber: r.checkNumber.trim(),
      bankName: r.bankName,
      supplierId: targetSup.id,
      supplierName: targetSup.name,
      amount: r.amount,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: r.dueDate,
      status: 'قيد الانتظار',
      notes: r.notes.trim() || 'شيك متعدد مجمع',
    }));

    saveChecksState([...createdChecks, ...checks]);
    setShowBatchChecksModal(false);
    setBatchCheckRows([
      { checkNumber: '', bankName: 'QNB', amount: 5000, dueDate: '2026-09-30', notes: '' },
    ]);

    // #FIX: الشيكات المجمّعة كانت localStorage فقط بلا أى مزامنة سيرفر.
    try {
      await fetch('/api/supplier-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checks: createdChecks }),
      });
    } catch (err) {
      console.error('Failed to sync checks to server:', err);
    }
  };

  const handleToggleCheckStatus = async (chkId: string) => {
    const target = checks.find(c => c.id === chkId);
    if (!target) return;
    const nextStatus: SupplierCheck['status'] = target.status === 'قيد الانتظار' ? 'تم الصرف' : 'قيد الانتظار';
    const updated = checks.map(c => c.id === chkId ? { ...c, status: nextStatus } : c);
    saveChecksState(updated);
    try {
      await fetch('/api/supplier-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chkId, checkNumber: target.checkNumber, status: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to sync check status to server:', err);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المورد "${name}"؟`)) return;
    saveSuppliersState(suppliers.filter(s => s.id !== id));
    if (selectedSupplier?.id === id) setSelectedSupplier(null);
    // حذف حقيقى من قاعدة البيانات — نفس المفتاح المُعرَّف فى DELETE /api/system-data
    try {
      await fetch(`/api/system-data?key=${SUPPLIERS_KEY}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete supplier from server:', err);
    }
  };

  // Generate Dynamic Ledger Transactions for Selected Supplier
  const generateSupplierLedger = (sup: Supplier): SupplierLedgerEntry[] => {
    const entries: SupplierLedgerEntry[] = [];
    let runningBalance = sup.openingBalance || 0;

    if (sup.totalPurchases > 0) {
      runningBalance += sup.totalPurchases;
      entries.push({
        id: 'PUR-TOTAL',
        date: sup.createdAt,
        type: 'فاتورة شراء',
        description: `إجمالي فواتير ومشتريات الأقمشة والإكسسوارات من المورد`,
        debit: 0,
        credit: sup.totalPurchases,
        balanceAfter: runningBalance,
      });
    }

    const supPays = payments.filter(p => p.supplierId === sup.id || p.supplierName === sup.name);
    supPays.forEach(p => {
      runningBalance -= p.amount;
      entries.push({
        id: p.id,
        date: p.date,
        type: 'سداد للمورد',
        description: `إذن صرف مسدد (${p.method}) - ${p.notes || 'إذن سداد'}`,
        debit: p.amount,
        credit: 0,
        balanceAfter: runningBalance,
      });
    });

    const supChks = checks.filter(c => c.supplierId === sup.id || c.supplierName === sup.name);
    supChks.forEach(c => {
      entries.push({
        id: c.id,
        date: c.issueDate,
        type: 'شيك بنكي',
        description: `شيك مؤجل #${c.checkNumber} (${c.bankName}) - استحقاق: ${c.dueDate} - (${c.status})`,
        debit: c.status === 'تم الصرف' ? c.amount : 0,
        credit: 0,
        balanceAfter: c.status === 'تم الصرف' ? runningBalance - c.amount : runningBalance,
      });
    });

    return entries;
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
  const totalBalanceOwed = filteredSuppliers.reduce((s, c) => s + (Number(c.balanceOwed) || 0), 0);
  const suppliersOwedCount = filteredSuppliers.filter(s => (Number(s.balanceOwed) || 0) > 0).length;

  const totalPaymentsAmount = filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pendingChecksTotal = filteredChecks.filter(c => c.status === 'قيد الانتظار').reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return (
    <PageShell title="إدارة الموردين والحسابات">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto" id="print-area">
        <div className="flex justify-end no-print">
          <PdfPrintButton
            documentTitle={activeTab === 'SUPPLIERS' ? 'قائمة-الموردين' : activeTab === 'PAYMENTS' ? 'سندات-السداد-والمصروفات' : 'سجل-الشيكات-البنكية'}
            label="طباعة PDF"
          />
        </div>
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
              <span className="text-xs font-bold text-slate-500">إجمالي عدد الموردين: {filteredSuppliers.length} مورد (اضغط على السطر لفتح التقرير وكشف الحساب)</span>

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

            {/* Suppliers Table (Interactive Row Click) */}
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
                      <tr
                        key={sup.id}
                        onClick={() => setSelectedSupplier(sup)}
                        className="border-t border-slate-100 hover:bg-amber-50/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-900">
                          <span className="text-sm font-black text-indigo-950 block">{sup.name}</span>
                          <span className="text-[10px] text-amber-700 font-mono">اضغط لفتح كشف الحساب والتفاصيل 📋</span>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <div className="font-mono text-slate-900 font-bold" dir="ltr">{sup.phone}</div>
                          <div className="text-slate-500 text-[11px] truncate max-w-[200px]">{sup.address}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(sup.categoriesSupplied)
                              ? sup.categoriesSupplied
                              : typeof sup.categoriesSupplied === 'string'
                              ? (sup.categoriesSupplied as string).split(',').map(s => s.trim()).filter(Boolean)
                              : []
                            ).map((cat, i) => (
                              <span key={i} className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-3.5 text-center font-mono font-black text-slate-900">
                          {(Number(sup.totalPurchases) || 0).toLocaleString()} ج
                        </td>

                        <td className="p-3.5 text-center font-mono font-black text-sm">
                          <span className={(Number(sup.balanceOwed) || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                            {(Number(sup.balanceOwed) || 0).toLocaleString()} ج
                          </span>
                        </td>

                        <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedSupplier(sup)}
                              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              📋 تفاصيل
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPaySupplierId(sup.id);
                                setPayAmount(sup.balanceOwed > 0 ? sup.balanceOwed : 1000);
                                setShowAddPaymentModal(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              💸 سداد
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingSupplier(sup)}
                              className="bg-amber-100 text-amber-950 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-200 transition-colors"
                              title="تعديل بيانات المورد"
                            >
                              ✏️ تعديل
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
                        <td className="p-3.5 font-mono text-slate-700 font-bold">{pay.date ? formatDateOnly(pay.date) : 'غير محدد'}</td>
                        <td className="p-3.5 font-bold text-slate-900">{pay.supplierName}</td>
                        <td className="p-3.5 text-center font-mono font-black text-sm text-rose-700">
                          -{(Number(pay.amount) || 0).toLocaleString()} ج
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {pay.method}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 font-bold">{pay.treasury}</td>
                        <td className="p-3.5 text-slate-600">{pay.notes || '—'}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="bg-slate-900 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              title="طباعة إذن صرف"
                            >
                              🖨️
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const newAmountStr = prompt(`تعديل مبلغ السداد للمورد "${pay.supplierName}":`, pay.amount.toString());
                                if (newAmountStr !== null) {
                                  const newAmount = Number(newAmountStr);
                                  if (newAmount > 0) {
                                    const updated = payments.map(p => p.id === pay.id ? { ...p, amount: newAmount } : p);
                                    savePaymentsState(updated);
                                  }
                                }
                              }}
                              className="bg-amber-100 text-amber-950 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              title="تعديل السداد"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت أسر بالتأكيد من حذف إذن سداد بمبلغ ${pay.amount} ج للمورد "${pay.supplierName}"؟`)) {
                                  savePaymentsState(payments.filter(p => p.id !== pay.id));
                                }
                              }}
                              className="bg-rose-100 text-rose-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                              title="حذف السداد"
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

        {/* TAB 3: CHECKS */}
        {activeTab === 'CHECKS' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-500">متابعة الشيكات البنكية والمؤجلة للموردين</span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (suppliers.length > 0) setBatchSupplierId(suppliers[0].id);
                    setShowBatchChecksModal(true);
                  }}
                  className="bg-purple-900 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">library_add</span>
                  <span>+ إضافة شيكات متعددة (دفعة واحدة)</span>
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
                <span className="text-slate-500 font-bold block">إجمالي الشيكات الصادرة</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{filteredChecks.reduce((s, c) => s + (Number(c.amount) || 0), 0).toLocaleString()} ج</strong>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
                <span className="text-amber-900 font-bold block">شيكات قيد الانتظار (لم تصرف بعد)</span>
                <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">{pendingChecksTotal.toLocaleString()} ج</strong>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
                <span className="text-emerald-800 font-bold block">شيكات تم صرفها بالكامل</span>
                <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">
                  {filteredChecks.filter(c => c.status === 'تم الصرف').reduce((s, c) => s + (Number(c.amount) || 0), 0).toLocaleString()} ج
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
                            {(Number(chk.amount) || 0).toLocaleString()} ج
                          </td>

                          <td className="p-3.5 text-center font-mono text-slate-700">{chk.issueDate ? formatDateOnly(chk.issueDate) : 'غير محدد'}</td>

                          <td className="p-3.5 text-center font-mono font-bold text-rose-800">{chk.dueDate ? formatDateOnly(chk.dueDate) : 'غير محدد'}</td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${statusBadgeClass}`}>
                              {chk.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleCheckStatus(chk.id)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                              >
                                {chk.status === 'تم الصرف' ? 'إعادة لقيد الانتظار ↩' : 'تأكيد الصرف ✓'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const newNum = prompt(`تعديل رقم الشيك للمورد "${chk.supplierName}":`, chk.checkNumber);
                                  if (newNum !== null && newNum.trim()) {
                                    const updated = checks.map(c => c.id === chk.id ? { ...c, checkNumber: newNum.trim() } : c);
                                    saveChecksState(updated);
                                  }
                                }}
                                className="bg-amber-100 text-amber-950 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                                title="تعديل الشيك"
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`هل أنت أسر بالتأكيد من حذف الشيك رقم #${chk.checkNumber} للمورد "${chk.supplierName}"؟`)) {
                                    saveChecksState(checks.filter(c => c.id !== chk.id));
                                  }
                                }}
                                className="bg-rose-100 text-rose-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                                title="حذف الشيك"
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
      </div>

      {/* 🔍 Interactive Full Supplier Details & Printable Statement Modal */}
      {selectedSupplier && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-supplier-statement, #printable-supplier-statement * { visibility: visible !important; }
              #printable-supplier-statement { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div id="printable-supplier-statement" className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-5 text-slate-900 border border-slate-200 my-auto shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Control Header */}
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">store</span>
                <span>كشف حساب وتفاصيل المورد: {selectedSupplier.name}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  🖨️ طباعة كشف حساب المورد (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
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
                <p className="text-xs font-bold text-amber-800">كشف حساب وتفاصيل المستحقات المالية للمورد</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>تاريخ التقرير:</strong> {formatDateOnly(new Date())}</div>
                <div><strong>كود المورد:</strong> {selectedSupplier.id}</div>
              </div>
            </div>

            {/* Supplier Information Cards */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div><strong>اسم المورد:</strong> {selectedSupplier.name}</div>
              <div><strong>رقم الهاتف:</strong> {selectedSupplier.phone}</div>
              <div><strong>العنوان:</strong> {selectedSupplier.address}</div>
              <div><strong>الخامات الموردة:</strong> {Array.isArray(selectedSupplier.categoriesSupplied) ? selectedSupplier.categoriesSupplied.join(', ') : selectedSupplier.categoriesSupplied || '—'}</div>
              <div><strong>ملاحظات وشروط التوريد:</strong> {selectedSupplier.notes || '—'}</div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-500 font-bold block">الرصيد الافتتاحي</span>
                <strong className="text-base font-black text-slate-900 font-mono">{(Number(selectedSupplier.openingBalance) || 0).toLocaleString()} ج</strong>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
                <span className="text-emerald-800 font-bold block">إجمالي المشتريات التوريدية</span>
                <strong className="text-base font-black text-emerald-950 font-mono">{(Number(selectedSupplier.totalPurchases) || 0).toLocaleString()} ج</strong>
              </div>
              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center">
                <span className="text-rose-800 font-bold block">الرصيد المستحق (علينا للمورد)</span>
                <strong className="text-base font-black text-rose-950 font-mono">{(Number(selectedSupplier.balanceOwed) || 0).toLocaleString()} ج</strong>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-slate-950 border-r-4 border-amber-500 pr-2">
                سجل التعاملات وحركات كشف حساب المورد:
              </h4>
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300">التاريخ</th>
                    <th className="p-2 border border-slate-300">نوع الحركة</th>
                    <th className="p-2 border border-slate-300">التفاصيل والبيان</th>
                    <th className="p-2 border border-slate-300 text-center font-mono text-emerald-900">مدين (-مسدد للمورد)</th>
                    <th className="p-2 border border-slate-300 text-center font-mono text-rose-900">دائن (+مستحق للمورد)</th>
                    <th className="p-2 border border-slate-300 text-center font-mono">الرصيد المستحق</th>
                  </tr>
                </thead>
                <tbody>
                  {generateSupplierLedger(selectedSupplier).map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-mono">{entry.date ? formatDateOnly(entry.date) : 'غير محدد'}</td>
                      <td className="p-2 border border-slate-300 font-bold">{entry.type}</td>
                      <td className="p-2 border border-slate-300 text-slate-700">{entry.description}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-emerald-800">
                        {entry.debit > 0 ? `${(Number(entry.debit) || 0).toLocaleString()} ج` : '—'}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-800">
                        {entry.credit > 0 ? `${(Number(entry.credit) || 0).toLocaleString()} ج` : '—'}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-black text-slate-950">
                        {(Number(entry.balanceAfter) || 0).toLocaleString()} ج
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
                  setPaySupplierId(selectedSupplier.id);
                  setPayAmount(selectedSupplier.balanceOwed > 0 ? selectedSupplier.balanceOwed : 1000);
                  setShowAddPaymentModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                💸 تسجيل سداد للمورد الآن
              </button>

              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧾 Modal: Add Batch / Multiple Checks */}
      {showBatchChecksModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-purple-600">library_add</span>
                <span>إضافة شيكات متعددة للمورد (تسجيل دفعة شيكات دفعة واحدة)</span>
              </h3>
              <button onClick={() => setShowBatchChecksModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddBatchChecksSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اختر المورد المستفيد للشيكات:</label>
                <select
                  value={batchSupplierId}
                  onChange={e => setBatchSupplierId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المورد المستفيد --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Check Rows */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-purple-50/70 p-3 rounded-2xl border border-purple-200">
                  <div>
                    <label className="text-purple-950 font-black text-xs block">
                      جدول الشيكات المطلوب تسجيلها ({batchCheckRows.length} من أصل 15 كحد أقصى):
                    </label>
                    <span className="text-[10px] text-slate-500 font-bold block">يمكنك إضافة حتى 15 شيكاً بنكياً في المرة الواحدة</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (batchCheckRows.length >= 15) return;
                        setBatchCheckRows([
                          ...batchCheckRows,
                          { checkNumber: '', bankName: 'QNB', amount: 5000, dueDate: '2026-10-30', notes: '' }
                        ]);
                      }}
                      className="bg-purple-900 text-white hover:bg-purple-800 px-3 py-1 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ إضافة شيك آخر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const needed = 15 - batchCheckRows.length;
                        if (needed <= 0) return;
                        const newRows = Array.from({ length: 15 }, (_, i) => ({
                          checkNumber: i < batchCheckRows.length ? batchCheckRows[i].checkNumber : '',
                          bankName: i < batchCheckRows.length ? batchCheckRows[i].bankName : 'البنك الأهلي المصري',
                          amount: i < batchCheckRows.length ? batchCheckRows[i].amount : 5000,
                          dueDate: i < batchCheckRows.length ? batchCheckRows[i].dueDate : `2026-${String(Math.min(12, 9 + Math.floor(i / 3))).padStart(2, '0')}-30`,
                          notes: i < batchCheckRows.length ? batchCheckRows[i].notes : `شيك رقم ${i + 1}`,
                        }));
                        setBatchCheckRows(newRows);
                      }}
                      className="bg-amber-400 text-slate-950 hover:bg-amber-300 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs cursor-pointer"
                    >
                      مُؤشر 15 شيكاً كاملة 🔥
                    </button>
                  </div>
                </div>

                {batchCheckRows.map((row, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs relative">
                    <div className="sm:col-span-3">
                      <label className="text-slate-500 font-bold block mb-1">رقم الشيك #{idx + 1}:</label>
                      <input
                        type="text"
                        required
                        placeholder="رقم الشيك..."
                        value={row.checkNumber}
                        onChange={e => {
                          const updated = [...batchCheckRows];
                          updated[idx].checkNumber = e.target.value;
                          setBatchCheckRows(updated);
                        }}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-slate-500 font-bold block mb-1">البنك:</label>
                      <select
                        value={row.bankName}
                        onChange={e => {
                          const updated = [...batchCheckRows];
                          updated[idx].bankName = e.target.value;
                          setBatchCheckRows(updated);
                        }}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none bg-white"
                      >
                        <option value="QNB">بنك QNB</option>
                        <option value="البنك الأهلي المصري">البنك الأهلي المصري</option>
                        <option value="بنك مصر">بنك مصر</option>
                        <option value="CIB">البنك التجاري الدولي CIB</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-500 font-bold block mb-1">المبلغ (ج.م):</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.amount}
                        onChange={e => {
                          const updated = [...batchCheckRows];
                          updated[idx].amount = Number(e.target.value);
                          setBatchCheckRows(updated);
                        }}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-slate-500 font-bold block mb-1">تاريخ الاستحقاق:</label>
                      <input
                        type="date"
                        required
                        value={row.dueDate}
                        onChange={e => {
                          const updated = [...batchCheckRows];
                          updated[idx].dueDate = e.target.value;
                          setBatchCheckRows(updated);
                        }}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none bg-white"
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end justify-center">
                      {batchCheckRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBatchCheckRows(batchCheckRows.filter((_, i) => i !== idx))}
                          className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center justify-center font-bold text-xs mb-0.5 cursor-pointer"
                          title="حذف الشيك"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-purple-900 hover:bg-purple-800 text-white py-3 rounded-2xl font-black text-xs shadow-xs cursor-pointer">
                  تأكيد وتجميع كافة الشيكات ({batchCheckRows.length}) دفعة واحدة ✓
                </button>
                <button type="button" onClick={() => setShowBatchChecksModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ➕ Modal: Add Supplier */}
      {showAddSupplierModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">إضافة مورد جديد</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
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
                <label className="text-slate-700 font-bold block mb-1">الفرع:</label>
                <BranchSelect
                  value={supBranch}
                  onChange={setSupBranch}
                  isAdmin={isAdmin}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
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
                <label className="text-slate-700 font-bold block mb-1">رصيد افتتاحى (مديونية سابقة، اختيارى):</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={supOpeningBalance || ''}
                  onChange={e => setSupOpeningBalance(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
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

      {/* ✏️ Modal: Edit Supplier */}
      {editingSupplier && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">تعديل بيانات المورد</h3>
              <button onClick={() => setEditingSupplier(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم المورد / الشركة:</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الهاتف التواصل:</label>
                <input
                  type="text"
                  value={editingSupplier.phone}
                  onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">عنوان المورد أو المصنع:</label>
                <input
                  type="text"
                  value={editingSupplier.address}
                  onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الفرع:</label>
                <BranchSelect
                  value={editingSupplier.branch}
                  onChange={b => setEditingSupplier({ ...editingSupplier, branch: b })}
                  isAdmin={isAdmin}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الخامات الموردة (مفصولة بفارزة):</label>
                <input
                  type="text"
                  value={Array.isArray(editingSupplier.categoriesSupplied) ? editingSupplier.categoriesSupplied.join(', ') : ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, categoriesSupplied: e.target.value.split(',').map(c => c.trim()) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رصيد افتتاحى (مديونية سابقة):</label>
                <input
                  type="number"
                  min="0"
                  value={editingSupplier.openingBalance || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, openingBalance: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  تغيير الرصيد الافتتاحى يعدّل الرصيد المستحق بنفس الفارق. إجمالى المشتريات والمسدد لا يتأثران.
                </span>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">شروط وملاحظات التوريد:</label>
                <textarea
                  rows={2}
                  value={editingSupplier.notes}
                  onChange={e => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow-gold cursor-pointer">
                  حفظ التعديلات ✓
                </button>
                <button type="button" onClick={() => setEditingSupplier(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
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
              <button onClick={() => setShowAddPaymentModal(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer">✕</button>
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
    </PageShell>
  );
}
