'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter, useParams } from 'next/navigation';
import { formatDateOnly, getTodayDateStr } from '@/lib/dateUtils';
import { BRANCHES_LIST, getBranchTreasury, BRANCH_TREASURIES } from '@/lib/branches';
import { useCurrentUser } from '@/lib/useCurrentUser';

interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  branch?: string;
  inspectionsCount: number;
  ordersCount: number;
  totalSpent: number;
  totalDeposits?: number;
  totalPaid?: number;
  openingBalance: number;
  balance: number;
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

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const { user: currentUser, isAdmin } = useCurrentUser();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allCollections, setAllCollections] = useState<CustomerCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit Customer Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBranch, setEditBranch] = useState('الفرع الرئيسي');
  const [editOpeningBalance, setEditOpeningBalance] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  // Quick Collection Modal State
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [colAmount, setColAmount] = useState<number>(1000);
  const [colMethod, setColMethod] = useState<'نقدي' | 'إنستاباي' | 'فيزا' | 'فودافون كاش' | 'تحويل بنكي' | 'شيك'>('نقدي');
  const [colTreasury, setColTreasury] = useState('خزينة الفرع الرئيسي (سعد زغلول)');
  const [colDate, setColDate] = useState(() => getTodayDateStr());
  const [colNotes, setColNotes] = useState('');
  const [isSavingCol, setIsSavingCol] = useState(false);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.customers)) {
          if (Array.isArray(json.collections)) {
            setAllCollections(json.collections);
          }
          const found = json.customers.find((c: Customer) => 
            c.id === rawId || 
            c.phone === rawId || 
            c.phone.replace(/\D/g, '') === rawId.replace(/\D/g, '') ||
            c.name === rawId
          );
          if (found) {
            setCustomer(found);
            setEditName(found.name || '');
            setEditPhone(found.phone || '');
            setEditAddress(found.address || '');
            setEditBranch(found.city || found.branch || 'الفرع الرئيسي');
            setEditOpeningBalance(found.openingBalance || 0);
            setEditNotes(found.notes || '');
            setColTreasury(getBranchTreasury(found.city || found.branch || currentUser?.branch));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [rawId]);

  // Handle Save Customer Edit
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) {
      alert('يرجى كتابة اسم العميل ورقم هاتفه');
      return;
    }

    try {
      setIsSaving(true);
      setSaveSuccess(false);
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: customer?.id,
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          city: editBranch,
          balance: Number(editOpeningBalance) || 0,
          notes: editNotes.trim(),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        await loadCustomerData();
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'حدث خطأ أثناء حفظ بيانات العميل');
      }
    } catch (err) {
      console.error(err);
      alert('فشل في الاتصال بالخادم لحفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Customer
  const handleDeleteCustomer = async () => {
    if (!customer) return;
    const confirmMsg = `هل أنت متأكد تماماً من حذف العميل (${customer.name})؟ سيتم مسح بياناته من النظام.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(customer.id)}&phone=${encodeURIComponent(customer.phone)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('تم حذف العميل بنجاح');
        router.push('/customers');
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'تعذر حذف العميل');
      }
    } catch (err) {
      console.error(err);
      alert('فشل في حذف العميل');
    }
  };

  // Handle Quick Collection Submit
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || colAmount <= 0) return;

    try {
      setIsSavingCol(true);
      const newCol: CustomerCollection = {
        id: `COL-${Date.now()}`,
        date: colDate || getTodayDateStr(),
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        amount: colAmount,
        method: colMethod,
        treasury: colTreasury,
        notes: colNotes.trim(),
      };

      const updatedCollections = [newCol, ...allCollections];
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: updatedCollections }),
      });

      if (res.ok) {
        setShowAddCollectionModal(false);
        setColNotes('');
        setColAmount(1000);
        await loadCustomerData();
      } else {
        alert('حدث خطأ أثناء تسجيل سند التحصيل');
      }
    } catch (err) {
      console.error(err);
      alert('فشل في حفظ سند التحصيل');
    } finally {
      setIsSavingCol(false);
    }
  };

  if (loading) {
    return (
      <PageShell noHeader fullWidth>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-600 font-bold text-sm">جاري تحميل ملف وكشف حساب العميل...</span>
        </div>
      </PageShell>
    );
  }

  if (!customer) {
    return (
      <PageShell noHeader fullWidth>
        <div className="w-full max-w-4xl mx-auto py-12 text-center space-y-4">
          <div className="text-5xl">👤</div>
          <h2 className="text-lg font-black text-slate-900">لم يتم العثور على هذا العميل</h2>
          <p className="text-xs text-slate-500 font-medium">قد يكون تم حذف العميل أو أن المعرف المطلوب غير صحيح.</p>
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="bg-brand-gold hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-gold cursor-pointer transition-colors"
          >
            ↩️ العودة لقائمة العملاء
          </button>
        </div>
      </PageShell>
    );
  }

  const isOwed = customer.balance > 0;
  const isCredit = customer.balance < 0;

  return (
    <PageShell noHeader fullWidth>
      <div className="w-full max-w-6xl mx-auto space-y-4 pb-12 pt-1 text-right">
        {/* Header Bar */}
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/customers')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-slate-200"
              title="رجوع لقائمة العملاء"
            >
              <span>↩️ قائمة العملاء</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900">{customer.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {customer.phone}
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-900 border border-amber-200">
                  {customer.city || customer.branch || 'الفرع الرئيسي'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">تاريخ التسجيل: {formatDateOnly(customer.createdAt)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors print:hidden"
            >
              <span>🖨️ طباعة كشف الحساب</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCollectionModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors print:hidden"
            >
              <span>+ تسجيل تحصيل 💵</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteCustomer}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors print:hidden"
              title="حذف العميل نهائياً"
            >
              <span>🗑️ حذف</span>
            </button>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
            <span className="text-slate-500 font-bold block">إجمالي المسحوبات والمشتريات</span>
            <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">
              {(Number(customer.totalSpent) || 0).toLocaleString()} ج
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">شامل الرصيد الافتتاحي</span>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
            <span className="text-emerald-800 font-bold block">إجمالي المسدد والمحصل</span>
            <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">
              {(Number(customer.totalPaid) || 0).toLocaleString()} ج
            </strong>
            <span className="text-[10px] text-emerald-600 block mt-0.5">عربون + تحصيلات نقدية</span>
          </div>

          <div className={`p-4 rounded-2xl border text-center shadow-3xs ${
            isOwed ? 'bg-rose-50/80 border-rose-200 text-rose-950' :
            isCredit ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950' :
            'bg-slate-50 border-slate-200 text-slate-900'
          }`}>
            <span className="font-bold block text-xs">
              {isOwed ? 'الرصيد المتبقي (مستحق لنا)' : isCredit ? 'رصيد دائن (له مبالغ زائدة)' : 'حساب خالص مسدد'}
            </span>
            <strong className="text-xl font-black mt-1 block font-mono">
              {Math.abs(Number(customer.balance) || 0).toLocaleString()} ج
            </strong>
            <span className="text-[10px] block mt-0.5 font-bold">
              {isOwed ? '⚠️ مطلوب تحصيله' : isCredit ? '💡 رصيد للعميل' : '✓ الحساب صفر'}
            </span>
          </div>

          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-center shadow-3xs">
            <span className="text-amber-900 font-bold block">الطلبات والمعاينات</span>
            <strong className="text-xl font-black text-amber-950 mt-1 block font-mono">
              {customer.ordersCount || 0} طلبات
            </strong>
            <span className="text-[10px] text-amber-700 block mt-0.5">{customer.inspectionsCount || 0} معاينات ومقاسات</span>
          </div>
        </div>

        {/* SECTION 1: Horizontal Customer Profile & Complete Edit Card (Full Width) */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-soft p-5 space-y-4 print:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span className="text-amber-600 text-lg">📝</span>
              <span>تعديل بيانات العميل والرصيد الافتتاحي</span>
            </h3>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 flex items-center gap-1 shadow-3xs animate-fade-in">
                <span>✓</span> تم حفظ التعديلات بنجاح
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
            {/* Top Row: 4 Essential Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="اسم العميل الكامل"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-brand-gold outline-hidden shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-brand-gold outline-hidden shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">فرع العميل</label>
                <select
                  value={editBranch}
                  onChange={e => setEditBranch(e.target.value)}
                  disabled={!isAdmin && !!currentUser?.branch}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-brand-gold outline-hidden disabled:bg-slate-100 shadow-2xs"
                >
                  {BRANCHES_LIST.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* 💰 الرصيد الافتتاحي */}
              <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-amber-950 font-black block">الرصيد الافتتاحي السابق (ج.م):</label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded">مستحق قديم</span>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editOpeningBalance}
                  onChange={e => setEditOpeningBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full border border-amber-300 bg-white rounded-lg px-3 py-1.5 font-mono font-black text-slate-900 text-sm focus:border-brand-gold outline-hidden shadow-2xs"
                />
              </div>
            </div>

            {/* Bottom Row: Address + Notes + Save Button */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
              <div className="sm:col-span-4">
                <label className="text-slate-700 font-bold block mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder="العنوان، الشارع، رقم العمارة..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-brand-gold outline-hidden shadow-2xs"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="text-slate-700 font-bold block mb-1">ملاحظات وتفضيلات العميل</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="أية تفاصيل خاصة بالعميل أو التعامل..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-brand-gold outline-hidden shadow-2xs"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm shadow-gold cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات ✓'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* SECTION 2: Detailed Account Statement / Ledger Table (Full Width) */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-lg">account_balance_wallet</span>
              <h3 className="font-black text-slate-900 text-sm">كشف الحساب المالي التفصيلي</h3>
              <span className="bg-amber-100 text-amber-950 text-xs px-2 py-0.5 rounded-full font-mono font-bold border border-amber-300">
                {customer.ledger?.length || 0} حركة
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">مرتبة تصاعدياً حسب تاريخ الحركة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-3 pr-4 w-28">التاريخ</th>
                  <th className="p-3 w-40">نوع الحركة</th>
                  <th className="p-3 min-w-[280px]">البيان والتفاصيل</th>
                  <th className="p-3 text-center w-32 text-rose-700 font-bold">مدين (عليه)</th>
                  <th className="p-3 text-center w-32 text-emerald-700 font-bold">دائن (مسدد)</th>
                  <th className="p-3 text-center w-36 text-slate-900 font-black">الرصيد بعد الحركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {!customer.ledger || customer.ledger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      لا توجد حركات مالية مسجلة لهذا العميل حتى الآن.
                    </td>
                  </tr>
                ) : (
                  customer.ledger.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pr-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                        {formatDateOnly(item.date)}
                      </td>
                      <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                        {item.type}
                      </td>
                      <td className="p-3 text-slate-700 font-medium leading-relaxed">
                        {item.description}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                        {item.debit > 0 ? `${item.debit.toLocaleString()} ج` : '—'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {item.credit > 0 ? `${item.credit.toLocaleString()} ج` : '—'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-950 whitespace-nowrap bg-slate-50/50">
                        {item.balanceAfter.toLocaleString()} ج
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Statement Summary Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-6 text-slate-600 font-bold">
              <span>إجمالي المدين (المطلوب): <b className="text-slate-900 font-mono text-sm">{(Number(customer.totalSpent) || 0).toLocaleString()} ج</b></span>
              <span>إجمالي الدائن (المسدد): <b className="text-emerald-700 font-mono text-sm">{(Number(customer.totalPaid) || 0).toLocaleString()} ج</b></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">صافي رصيد الحساب:</span>
              <span className={`font-mono font-black text-sm sm:text-base px-3.5 py-1.5 rounded-xl border ${
                isOwed ? 'bg-rose-100 text-rose-950 border-rose-300' :
                isCredit ? 'bg-indigo-100 text-indigo-950 border-indigo-300' :
                'bg-emerald-100 text-emerald-950 border-emerald-300'
              }`}>
                {customer.balance.toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* Modal: Quick Add Collection */}
        {showAddCollectionModal && (
          <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-right">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">تسجيل سند تحصيل / دفعة مالية للعميل</h3>
                <button
                  onClick={() => setShowAddCollectionModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCollection} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">العميل:</label>
                  <div className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50">
                    {customer.name} ({customer.phone})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">المبلغ المحصل (ج.م) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={colAmount}
                      onChange={e => setColAmount(parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-black text-slate-900 focus:border-brand-gold outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">تاريخ التحصيل</label>
                    <input
                      type="date"
                      value={colDate}
                      onChange={e => setColDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:border-brand-gold outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">طريقة السداد / وسيلة الدفع *</label>
                  <select
                    value={colMethod}
                    onChange={e => setColMethod(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:border-brand-gold outline-hidden"
                  >
                    <option value="نقدي">💵 1. نقدي (كاش بالخزينة)</option>
                    <option value="إنستاباي">⚡ 2. إنستاباي (InstaPay)</option>
                    <option value="فيزا">💳 3. فيزا / ماستركارد</option>
                    <option value="فودافون كاش">📱 4. فودافون كاش / محافظ إلكترونية</option>
                    <option value="تحويل بنكي">🏦 5. تحويل بنكي</option>
                    <option value="شيك">🧾 6. شيك بنكي</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">خزينة الفرع المودع بها *</label>
                  <select
                    value={colTreasury}
                    onChange={e => setColTreasury(e.target.value)}
                    disabled={!isAdmin && !!currentUser?.branch}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:border-brand-gold outline-hidden disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                      🔒 يتم الإيداع تلقائياً في خزينة فرعك ({currentUser?.branch || 'الفرع الرئيسي'}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">ملاحظات السند / رقم التحويل</label>
                  <input
                    type="text"
                    value={colNotes}
                    onChange={e => setColNotes(e.target.value)}
                    placeholder="رقم العملية، اسم صاحب الحساب، ملاحظات..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-brand-gold outline-hidden"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingCol}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black text-xs shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSavingCol ? 'جاري التسجيل...' : 'تسجيل السند وإضافته للحساب ✓'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCollectionModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
