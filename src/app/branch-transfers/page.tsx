'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { BRANCHES_LIST, normalizeBranchName } from '@/lib/branches';
import { getTodayDateStr, formatDateOnly } from '@/lib/dateUtils';

interface TransferItem {
  code: string;
  name: string;
  category?: string;
  unit?: string;
  meters: number;
  unitCost: number;
  totalCost: number;
}

interface BranchTransfer {
  id: string;
  date: string;
  kind: string;
  fromBranch: string;
  toBranch: string;
  items: TransferItem[];
  totalValue: number;
  notes?: string;
  createdByName?: string;
  createdAt: string;
}

interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  costPrice: number;
  sellPrice: number;
  branch: string;
}

export default function BranchTransfersPage() {
  const { user, isAdmin, isSuperAdmin } = useCurrentUser();
  const isAdminView = isAdmin || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<'log' | 'ledger'>('log');
  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<InventoryProduct[]>([]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/branch-transfers', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data?.transfers)) setTransfers(data.transfers);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadTransfers();
    fetch('/api/inventory', { cache: 'no-store' })
      .then(res => res.json())
      .then(json => { if (Array.isArray(json?.items)) setProducts(json.items); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger' && !isAdminView) setActiveTab('log');
  }, [activeTab, isAdminView]);

  // ── New Transfer Modal ──────────────────────────────────────────────
  const [showNewModal, setShowNewModal] = useState(false);
  const [formDate, setFormDate] = useState(() => getTodayDateStr());
  const [fromBranch, setFromBranch] = useState(() => user?.branch || 'الفرع الرئيسي');
  const [toBranch, setToBranch] = useState('فرع عرابي');
  const [cart, setCart] = useState<TransferItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.branch && !isAdminView) setFromBranch(user.branch);
  }, [user, isAdminView]);

  const sourceProducts = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p => normalizeBranchName(p.branch) === normalizeBranchName(fromBranch))
      .filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, itemSearch, fromBranch]);

  const addToCart = (p: InventoryProduct) => {
    if (cart.some(c => c.code === p.code)) return;
    setCart(prev => [...prev, {
      code: p.code, name: p.name, category: p.category, unit: p.unit,
      meters: 1, unitCost: Number(p.costPrice) || 0, totalCost: Number(p.costPrice) || 0,
    }]);
    setItemSearch('');
  };

  const updateCartItem = (code: string, field: 'meters' | 'unitCost', value: number) => {
    setCart(prev => prev.map(c => {
      if (c.code !== code) return c;
      const updated = { ...c, [field]: value };
      updated.totalCost = Math.round((updated.meters || 0) * (updated.unitCost || 0) * 100) / 100;
      return updated;
    }));
  };

  const removeFromCart = (code: string) => setCart(prev => prev.filter(c => c.code !== code));
  const cartTotal = cart.reduce((s, c) => s + (Number(c.totalCost) || 0), 0);

  const resetForm = () => {
    setCart([]);
    setItemSearch('');
    setFormNotes('');
    setFormDate(getTodayDateStr());
  };

  const handleSaveTransfer = async () => {
    if (normalizeBranchName(fromBranch) === normalizeBranchName(toBranch)) {
      alert('لازم الفرع المرسل والمستلم يكونوا مختلفين');
      return;
    }
    if (cart.length === 0) {
      alert('أضف صنف واحد على الأقل');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/branch-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          kind: 'نقل بضاعة',
          fromBranch, toBranch,
          items: cart,
          totalValue: cartTotal,
          notes: formNotes.trim(),
          createdByName: user?.name || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.error || 'فشل حفظ التحويل');
        return;
      }
      setShowNewModal(false);
      resetForm();
      await loadTransfers();
      // Refresh inventory snapshot so the next transfer's search reflects updated stock
      fetch('/api/inventory', { cache: 'no-store' }).then(r => r.json()).then(j => {
        if (Array.isArray(j?.items)) setProducts(j.items);
      }).catch(() => {});
    } catch (err: any) {
      alert('خطأ فى الاتصال بالسيرفر: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // ── Settlement Modal (Admin) — بتتقسم على طرق الدفع فعليًا، وبتتخصم من رصيد
  // الفرع الدافع وتتضاف لرصيد الفرع المستلم فى كل حسابات الخزينة فعليًا.
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('');
  const [savingSettle, setSavingSettle] = useState(false);
  const [fromBranchBalance, setFromBranchBalance] = useState<{ cash: number; instapay: number; vodafone: number; visa: number } | null>(null);
  const [loadingFromBalance, setLoadingFromBalance] = useState(false);
  const [settleSplitCash, setSettleSplitCash] = useState<number | ''>('');
  const [settleSplitInstapay, setSettleSplitInstapay] = useState<number | ''>('');
  const [settleSplitVodafone, setSettleSplitVodafone] = useState<number | ''>('');
  const [settleSplitVisa, setSettleSplitVisa] = useState<number | ''>('');
  const settleSplitTotal = (Number(settleSplitCash) || 0) + (Number(settleSplitInstapay) || 0) + (Number(settleSplitVodafone) || 0) + (Number(settleSplitVisa) || 0);

  const openSettle = (debtor: string, creditor: string, amount: number) => {
    setSettleFrom(debtor);
    setSettleTo(creditor);
    setSettleAmount(amount);
    setSettleNotes('');
    setSettleSplitCash(''); setSettleSplitInstapay(''); setSettleSplitVodafone(''); setSettleSplitVisa('');
    setShowSettleModal(true);
  };

  useEffect(() => {
    if (!showSettleModal || !settleFrom) { setFromBranchBalance(null); return; }
    setLoadingFromBalance(true);
    fetch(`/api/branch-balance?branch=${encodeURIComponent(settleFrom)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(json => { if (json?.success) setFromBranchBalance(json.balance); })
      .catch(() => {})
      .finally(() => setLoadingFromBalance(false));
  }, [showSettleModal, settleFrom]);

  const handleSaveSettlement = async () => {
    if (!settleAmount || Number(settleAmount) <= 0) {
      alert('أدخل مبلغ صحيح أكبر من صفر');
      return;
    }
    if (Math.abs(settleSplitTotal - Number(settleAmount)) > 0.01) {
      alert(`مجموع التوزيع (${settleSplitTotal.toLocaleString()} ج) لازم يساوي مبلغ التسوية (${Number(settleAmount).toLocaleString()} ج) بالظبط`);
      return;
    }
    setSavingSettle(true);
    try {
      const res = await fetch('/api/branch-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: getTodayDateStr(),
          kind: 'تسوية نقدية',
          fromBranch: settleFrom, toBranch: settleTo,
          items: [],
          totalValue: Number(settleAmount),
          splitPayments: {
            cash: Number(settleSplitCash) || 0,
            instapay: Number(settleSplitInstapay) || 0,
            vodafone: Number(settleSplitVodafone) || 0,
            visa: Number(settleSplitVisa) || 0,
          },
          notes: settleNotes.trim(),
          createdByName: user?.name || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.error || 'فشل حفظ التسوية');
        return;
      }
      setShowSettleModal(false);
      await loadTransfers();
    } catch (err: any) {
      alert('خطأ فى الاتصال بالسيرفر: ' + (err?.message || ''));
    } finally {
      setSavingSettle(false);
    }
  };

  // ── Ledger: net balance per branch pair ─────────────────────────────
  // owes(X, Y) = كام X مديون لـ Y صافي (سالب معناه Y هو المديون).
  const ledger = useMemo(() => {
    const branchNames = BRANCHES_LIST.map(b => b.name);
    const pairs: { a: string; b: string; net: number }[] = [];
    for (let i = 0; i < branchNames.length; i++) {
      for (let j = i + 1; j < branchNames.length; j++) {
        const a = branchNames[i], b = branchNames[j];
        let net = 0; // موجب: a مديون لـ b. سالب: b مديون لـ a.
        transfers.forEach(t => {
          const isAB = normalizeBranchName(t.fromBranch) === normalizeBranchName(b) && normalizeBranchName(t.toBranch) === normalizeBranchName(a);
          const isBA = normalizeBranchName(t.fromBranch) === normalizeBranchName(a) && normalizeBranchName(t.toBranch) === normalizeBranchName(b);
          if (t.kind === 'نقل بضاعة') {
            if (isAB) net += t.totalValue; // b نقل لـ a => a مديون لـ b
            if (isBA) net -= t.totalValue; // a نقل لـ b => b مديون لـ a
          } else if (t.kind === 'تسوية نقدية') {
            // fromBranch = المدين اللي بيسدد، toBranch = الدائن
            if (normalizeBranchName(t.fromBranch) === normalizeBranchName(a) && normalizeBranchName(t.toBranch) === normalizeBranchName(b)) net -= t.totalValue;
            if (normalizeBranchName(t.fromBranch) === normalizeBranchName(b) && normalizeBranchName(t.toBranch) === normalizeBranchName(a)) net += t.totalValue;
          }
        });
        if (Math.abs(net) > 0.01) pairs.push({ a, b, net });
      }
    }
    return pairs;
  }, [transfers]);

  return (
    <PageShell title="تحويلات بين الفروع" badge={`${transfers.length} تحويل`}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('log')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'log' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>🔀</span>
              <span>سجل التحويلات</span>
            </button>
            {isAdminView && (
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'ledger' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>📒</span>
                <span>كشف الحساب بين الفروع</span>
              </button>
            )}
          </div>

          {activeTab === 'log' && (
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer w-full md:w-auto justify-center"
            >
              <span>➕</span>
              <span>تحويل جديد</span>
            </button>
          )}
        </div>

        {/* TAB: LOG */}
        {activeTab === 'log' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">من فرع</th>
                    <th className="p-3">إلى فرع</th>
                    <th className="p-3">الأصناف</th>
                    <th className="p-3 text-center">القيمة</th>
                    <th className="p-3">سجّله</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">...جاري التحميل</td></tr>
                  ) : transfers.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا توجد تحويلات مسجلة بعد</td></tr>
                  ) : (
                    transfers.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-mono text-slate-600">{formatDateOnly(t.date)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.kind === 'تسوية نقدية' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.kind === 'تسوية نقدية' ? '💵 تسوية' : '📦 نقل بضاعة'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">{t.fromBranch}</td>
                        <td className="p-3 font-bold text-slate-900">{t.toBranch}</td>
                        <td className="p-3 text-slate-600">
                          {t.items?.length > 0 ? `${t.items.length} صنف — ${t.items.map(i => i.name).slice(0, 2).join('، ')}${t.items.length > 2 ? '...' : ''}` : '—'}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-slate-900">{t.totalValue.toLocaleString()} ج</td>
                        <td className="p-3 text-slate-500">{t.createdByName || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: LEDGER (Admin Only) */}
        {activeTab === 'ledger' && isAdminView && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <span>📒</span>
              <span>صافي المديونية بين الفروع</span>
            </h3>
            {ledger.length === 0 ? (
              <div className="text-center text-slate-400 py-8 text-xs font-bold">مفيش ديون مستحقة بين أي فروع حاليًا</div>
            ) : (
              <div className="space-y-2">
                {ledger.map(({ a, b, net }) => {
                  const debtor = net > 0 ? a : b;
                  const creditor = net > 0 ? b : a;
                  const amount = Math.abs(net);
                  return (
                    <div key={`${a}-${b}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
                      <div className="font-bold text-rose-900">
                        <span className="text-slate-900">{debtor}</span> مديون لـ <span className="text-slate-900">{creditor}</span> بـ{' '}
                        <span className="font-mono font-black">{amount.toLocaleString()} ج</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openSettle(debtor, creditor, amount)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer whitespace-nowrap"
                      >
                        💵 تسوية
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: New Transfer */}
      {showNewModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>🔀</span>
                تحويل بضاعة بين فرعين
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">التاريخ:</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">من فرع (المرسل):</label>
                <select
                  value={fromBranch}
                  onChange={e => setFromBranch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                >
                  {BRANCHES_LIST.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">إلى فرع (المستلم):</label>
                <select
                  value={toBranch}
                  onChange={e => setToBranch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                >
                  {BRANCHES_LIST.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div className="relative">
              <label className="text-slate-700 font-bold block mb-1 text-xs">أضف صنف من مخزون {fromBranch}:</label>
              <input
                type="text"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الكود..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
              {sourceProducts.length > 0 && (
                <div className="absolute z-20 top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {sourceProducts.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onMouseDown={() => addToCart(p)}
                      className="w-full text-right px-3 py-2 hover:bg-amber-50 text-xs border-b border-slate-100 last:border-0 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{p.code} • متاح {p.totalQuantity} • تكلفة {p.costPrice} ج</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-2">الصنف</th>
                      <th className="p-2 text-center w-24">الكمية</th>
                      <th className="p-2 text-center w-24">تكلفة الوحدة</th>
                      <th className="p-2 text-center w-24">الإجمالي</th>
                      <th className="p-2 text-center w-10">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map(c => (
                      <tr key={c.code}>
                        <td className="p-2 font-bold text-slate-900">{c.name}</td>
                        <td className="p-2">
                          <input
                            type="number" step="any" min="0.01" value={c.meters}
                            onChange={e => updateCartItem(c.code, 'meters', Number(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-black text-center text-xs focus:outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number" step="any" min="0" value={c.unitCost}
                            onChange={e => updateCartItem(c.code, 'unitCost', Number(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-black text-center text-xs focus:outline-none"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-amber-800">{c.totalCost.toLocaleString()} ج</td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => removeFromCart(c.code)} className="text-rose-500 hover:text-rose-700 cursor-pointer">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-xl font-black text-sm">
              <span>القيمة الإجمالية:</span>
              <span className="font-mono text-emerald-400">{cartTotal.toLocaleString()} ج.م</span>
            </div>

            <input
              type="text"
              placeholder="ملاحظات (اختياري)..."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={saving || cart.length === 0}
                onClick={handleSaveTransfer}
                className="flex-1 bg-brand-gold hover:bg-amber-400 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl font-black cursor-pointer"
              >
                {saving ? 'جارِ الحفظ...' : 'حفظ التحويل وتحديث المخزون ✓'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Settlement */}
      {showSettleModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-3.5 shadow-2xl border border-slate-200 my-auto">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>💵</span>
              تسوية دين بين الفروع
            </h3>
            <p className="text-[11px] text-slate-500">
              <strong>{settleFrom}</strong> بيسدد لـ <strong>{settleTo}</strong>
            </p>
            <div>
              <label className="text-slate-700 font-bold block mb-1 text-xs">المبلغ المسدد (ج):</label>
              <input
                type="number" step="0.01" min="0.01"
                value={settleAmount}
                onChange={e => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-black text-rose-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2 text-[11px]">
              <div className="text-slate-700 font-black flex items-center gap-1.5">
                <span>💰</span>
                <span>رصيد {settleFrom} الحالي — حدد المدفوع من كل طريقة:</span>
              </div>
              {loadingFromBalance ? (
                <div className="text-center text-slate-400 py-2">...جاري تحميل الرصيد</div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: '💵 نقدي', balance: fromBranchBalance?.cash, value: settleSplitCash, setter: setSettleSplitCash },
                    { label: '⚡ إنستاباي', balance: fromBranchBalance?.instapay, value: settleSplitInstapay, setter: setSettleSplitInstapay },
                    { label: '📱 فودافون', balance: fromBranchBalance?.vodafone, value: settleSplitVodafone, setter: setSettleSplitVodafone },
                    { label: '💳 فيزا', balance: fromBranchBalance?.visa, value: settleSplitVisa, setter: setSettleSplitVisa },
                  ].map(row => (
                    <div key={row.label} className="bg-white border border-slate-200 rounded-lg p-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-700">{row.label}</span>
                        <span className="font-mono text-slate-400 text-[9px]">متاح: {(row.balance ?? 0).toLocaleString()}</span>
                      </div>
                      <input
                        type="number" step="0.01" min="0"
                        value={row.value}
                        onChange={e => row.setter(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full border border-slate-200 rounded px-1.5 py-0.5 font-mono font-black text-slate-900 text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className={`flex items-center justify-between px-1 font-bold ${
                Math.abs(settleSplitTotal - (Number(settleAmount) || 0)) < 0.01 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                <span>الموزّع: {settleSplitTotal.toLocaleString()} ج</span>
                <span>المبلغ: {(Number(settleAmount) || 0).toLocaleString()} ج</span>
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1 text-xs">ملاحظات (اختياري):</label>
              <input
                type="text"
                value={settleNotes}
                onChange={e => setSettleNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={savingSettle}
                onClick={handleSaveSettlement}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-black cursor-pointer"
              >
                {savingSettle ? 'جارِ الحفظ...' : 'تأكيد التسوية'}
              </button>
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
