'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { normalizeBranchName, branchLabel } from '@/lib/branches';
import { getTodayDateStr, getYesterdayDateStr, formatDateOnly } from '@/lib/dateUtils';
import Pagination from '@/components/Pagination';

interface Expense {
  id: string;
  date: string;
  branch: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  createdByName?: string;
  createdAt: string;
}

const EXPENSE_CATEGORIES = ['إيجار', 'كهرباء ومياه', 'صيانة', 'مواصلات وشحن', 'رواتب وسلف', 'أدوات ومستلزمات', 'دعاية وإعلان', 'أخرى'];
const PAYMENT_METHODS = ['نقدي', 'إنستاباي', 'فودافون كاش', 'فيزا / كارت'];
const MULTI_PAYMENT_OPTION = 'متعدد / مزيج';

type DateFilterType = 'yesterday' | 'today' | 'week' | 'month' | 'all';

export default function ExpensesPage() {
  const { user, isAdmin, isSuperAdmin } = useCurrentUser();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Add-expense form
  const [showAddModal, setShowAddModal] = useState(false);
  const [formDate, setFormDate] = useState(() => getTodayDateStr());
  const [formBranch, setFormBranch] = useState('الفرع الرئيسي');
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);

  // دفع متعدد (متاح للأدمن فقط): يفتح رصيد الفرع الفعلي بكل طريقة دفع، ويسيب
  // الأدمن يوزّع مبلغ المصروف على أكتر من طريقة بدل ما يكون كله من طريقة واحدة —
  // بيتخزن كسطر مصروف مستقل لكل طريقة (نفس التصنيف/الوصف/التاريخ)، فحسابات
  // التقارير والورديات (اللي بتقرأ كل سطر مصروف بطريقة دفعه الفعلية) تتخصم صح
  // من غير أي تعديل عليها.
  const [branchBalance, setBranchBalance] = useState<{ cash: number; instapay: number; vodafone: number; visa: number } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [splitCash, setSplitCash] = useState<number | ''>('');
  const [splitInstapay, setSplitInstapay] = useState<number | ''>('');
  const [splitVodafone, setSplitVodafone] = useState<number | ''>('');
  const [splitVisa, setSplitVisa] = useState<number | ''>('');
  const isMultiPayment = formPaymentMethod === MULTI_PAYMENT_OPTION;
  const splitTotal = (Number(splitCash) || 0) + (Number(splitInstapay) || 0) + (Number(splitVodafone) || 0) + (Number(splitVisa) || 0);

  useEffect(() => {
    if (!isMultiPayment || !formBranch) { setBranchBalance(null); return; }
    setLoadingBalance(true);
    fetch(`/api/branch-balance?branch=${encodeURIComponent(formBranch)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(json => { if (json?.success) setBranchBalance(json.balance); })
      .catch(() => {})
      .finally(() => setLoadingBalance(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiPayment, formBranch]);

  const isAdminView = isAdmin || isSuperAdmin;

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data?.expenses)) setExpenses(data.expenses);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadExpenses(); }, []);

  useEffect(() => {
    if (!isAdminView && user?.branch) {
      setFormBranch(user.branch);
      setBranchFilter(user.branch);
    }
  }, [isAdminView, user]);

  useEffect(() => { setCurrentPage(1); }, [dateFilter, branchFilter, search]);

  const matchesDate = (dateStr: string): boolean => {
    if (!dateStr) return dateFilter === 'all';
    const d = dateStr.split('T')[0];
    const today = getTodayDateStr();
    if (dateFilter === 'yesterday') return d === getYesterdayDateStr();
    if (dateFilter === 'today') return d === today;
    if (dateFilter === 'week') {
      const diffDays = (new Date(today).getTime() - new Date(d).getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (dateFilter === 'month') return d.substring(0, 7) === today.substring(0, 7);
    return true;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!matchesDate(e.date)) return false;
      if (branchFilter !== 'ALL' && branchFilter !== 'الكل' && normalizeBranchName(e.branch) !== normalizeBranchName(branchFilter)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!e.description.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, dateFilter, branchFilter, search]);

  const totalAmount = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!formDescription.trim()) {
      alert('يرجى إدخال وصف مختصر للمصروف');
      return;
    }

    if (isMultiPayment) {
      if (Math.abs(splitTotal - Number(formAmount)) > 0.01) {
        alert(`مجموع التوزيع (${splitTotal.toLocaleString()} ج) لازم يساوي مبلغ المصروف (${Number(formAmount).toLocaleString()} ج) بالظبط`);
        return;
      }
      const parts: { amount: number; method: string }[] = [
        { amount: Number(splitCash) || 0, method: 'نقدي' },
        { amount: Number(splitInstapay) || 0, method: 'إنستاباي' },
        { amount: Number(splitVodafone) || 0, method: 'فودافون كاش' },
        { amount: Number(splitVisa) || 0, method: 'فيزا / كارت' },
      ].filter(p => p.amount > 0);
      if (parts.length < 2) {
        alert('الدفع المتعدد لازم يوزّع المبلغ على طريقتين على الأقل — لو طريقة واحدة بس اختارها مباشرة');
        return;
      }
      setSaving(true);
      try {
        for (const part of parts) {
          const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: formDate,
              branch: formBranch,
              category: formCategory,
              description: formDescription.trim(),
              amount: part.amount,
              paymentMethod: part.method,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            alert(`فشل حفظ جزء الدفع (${part.method}): ${data?.error || 'خطأ غير معروف'} — راجع السجل، الأجزاء اللي اتحفظت قبل كده متسجلة بالفعل`);
            await loadExpenses();
            setSaving(false);
            return;
          }
        }
        setShowAddModal(false);
        setFormDescription('');
        setFormAmount('');
        setSplitCash(''); setSplitInstapay(''); setSplitVodafone(''); setSplitVisa('');
        await loadExpenses();
      } catch (err: any) {
        alert('خطأ فى الاتصال بالسيرفر: ' + (err?.message || ''));
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          branch: formBranch,
          category: formCategory,
          description: formDescription.trim(),
          amount: Number(formAmount),
          paymentMethod: formPaymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.error || 'فشل حفظ المصروف');
        return;
      }
      setShowAddModal(false);
      setFormDescription('');
      setFormAmount('');
      await loadExpenses();
    } catch (err: any) {
      alert('خطأ فى الاتصال بالسيرفر: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`هل أنت متأكد من حذف مصروف "${description}"؟`)) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.error || 'فشل الحذف');
        return;
      }
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert('خطأ فى الاتصال: ' + (err?.message || ''));
    }
  };

  return (
    <PageShell title="مصروفات الفروع">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">مصروفات الفروع</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {isAdminView ? 'كل مصروفات كل الفروع' : `مصروفات ${branchLabel(user?.branch || 'فرعك')} فقط`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 shadow-3xs">
            <span className="text-rose-800 font-bold block text-[11px]">إجمالي المصروفات ({filteredExpenses.length} مصروف)</span>
            <strong className="text-2xl font-black text-rose-950 mt-0.5 block font-mono">{totalAmount.toLocaleString()} ج</strong>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
            <span className="text-slate-500 font-bold block text-[11px]">إجمالي كل المصروفات المسجّلة</span>
            <strong className="text-2xl font-black text-slate-900 mt-0.5 block font-mono">{expenses.length} مصروف</strong>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200 text-xs font-bold overflow-x-auto">
              {([
                { key: 'yesterday', label: 'أمس' },
                { key: 'today', label: 'اليوم' },
                { key: 'week', label: 'الأسبوع' },
                { key: 'month', label: 'الشهر' },
                { key: 'all', label: 'الكل' },
              ] as { key: DateFilterType; label: string }[]).map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setDateFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === t.key ? 'bg-amber-500 text-white font-black shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {isAdminView && (
              <BranchSelect
                value={branchFilter}
                onChange={setBranchFilter}
                isAdmin={true}
                allValue="ALL"
                allLabel="🌐 كل الفروع"
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
              />
            )}
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالوصف أو التصنيف..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pr-9 pl-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">التاريخ</th>
                  {isAdminView && <th className="p-3">الفرع</th>}
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">الوصف</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3 text-center">المبلغ</th>
                  <th className="p-3">بواسطة</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="p-10 text-center text-slate-400 font-bold">جارِ التحميل...</td></tr>
                ) : paginatedExpenses.length === 0 ? (
                  <tr><td colSpan={8} className="p-10 text-center text-slate-400 font-bold">لا توجد مصروفات مسجّلة فى هذه الفترة</td></tr>
                ) : (
                  paginatedExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 text-slate-600 font-mono whitespace-nowrap">{formatDateOnly(exp.date)}</td>
                      {isAdminView && (
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold whitespace-nowrap">
                            {branchLabel(exp.branch)}
                          </span>
                        </td>
                      )}
                      <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{exp.category}</td>
                      <td className="p-3 text-slate-700">{exp.description}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{exp.paymentMethod}</td>
                      <td className="p-3 text-center font-mono font-black text-rose-700 whitespace-nowrap">{Number(exp.amount).toLocaleString()} ج</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{exp.createdByName || '—'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id, exp.description)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف المصروف"
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

          <Pagination
            currentPage={currentPage}
            totalItems={filteredExpenses.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemName="مصروف"
          />
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-xl">payments</span>
                تسجيل مصروف جديد
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">التاريخ:</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">الفرع:</label>
                  <BranchSelect
                    value={formBranch}
                    onChange={setFormBranch}
                    isAdmin={isAdminView}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                    lockedClassName="w-full border border-slate-200 rounded-xl px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">التصنيف:</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">طريقة الدفع:</label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    {isAdminView && <option value={MULTI_PAYMENT_OPTION}>🔀 {MULTI_PAYMENT_OPTION}</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الوصف:</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="مثال: فاتورة كهرباء شهر سبتمبر"
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">المبلغ (ج):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-black text-rose-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              {isMultiPayment && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
                  <div className="text-slate-700 font-black text-[11px] flex items-center gap-1.5">
                    <span>💰</span>
                    <span>رصيد {formBranch} الحالي بكل طريقة — حدد المبلغ المخصوم من كل واحدة:</span>
                  </div>
                  {loadingBalance ? (
                    <div className="text-center text-slate-400 py-2">...جاري تحميل الرصيد</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '💵 نقدي', balance: branchBalance?.cash, value: splitCash, setter: setSplitCash },
                        { label: '⚡ إنستاباي', balance: branchBalance?.instapay, value: splitInstapay, setter: setSplitInstapay },
                        { label: '📱 فودافون كاش', balance: branchBalance?.vodafone, value: splitVodafone, setter: setSplitVodafone },
                        { label: '💳 فيزا / كارت', balance: branchBalance?.visa, value: splitVisa, setter: setSplitVisa },
                      ].map(row => (
                        <div key={row.label} className="bg-white border border-slate-200 rounded-xl p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-700">{row.label}</span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              متاح: {(row.balance ?? 0).toLocaleString()} ج
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.value}
                            onChange={e => row.setter(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1 font-mono font-black text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={`flex items-center justify-between px-1 font-bold ${
                    Math.abs(splitTotal - (Number(formAmount) || 0)) < 0.01 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    <span>إجمالي الموزّع: {splitTotal.toLocaleString()} ج</span>
                    <span>مبلغ المصروف: {(Number(formAmount) || 0).toLocaleString()} ج</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-gold hover:bg-amber-400 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl font-black shadow-gold cursor-pointer"
                >
                  {saving ? 'جارِ الحفظ...' : 'حفظ المصروف'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold cursor-pointer"
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
