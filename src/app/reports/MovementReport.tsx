'use client';

import React, { useMemo, useState } from 'react';
import { getTodayDateStr } from '@/lib/dateUtils';
import { normalizeBranchName } from '@/lib/branches';
import Pagination from '@/components/Pagination';

// تقرير "حركة الأصناف": بيجمّع المبيعات من items فى فواتير البيع (SalesInvoice)
// ويقارنها برصيد المخزون عشان يجاوب: إيه الأكتر حركة؟ إيه الراكد؟ المخزون يكفي كام أسبوع؟
//
// ملحوظات:
// - المرتجعات مش بتتخصم: اتسجلت كنص حر (itemsDetail) مش أصناف منظمة، فمفيش طريقة
//   موثوقة لقراءتها. الأرقام هنا إجمالي مبيعات قبل المرتجعات.
// - التحويلات بين الفروع مش بتتحسب مبيعات (مش مبنية على فواتير البيع أصلًا).

type Period = 'yesterday' | 'today' | 'thisWeek' | 'thisMonth' | 'custom' | 'all';
type Status = 'fast' | 'slow' | 'dead';

interface Props {
  invoices: any[];        // كل فواتير الفرع المختار (من غير فلتر فترة)
  inventory: any[];       // أصناف الفرع المختار
  period: Period;
  customStartDate: string;
  customEndDate: string;
  branchLabel: string;
  periodLabel: string;
  onUpdateInventory?: React.Dispatch<React.SetStateAction<any[]>>;
}

const DAY = 86400000;
const SLOW_WEEKS = 26;     // رصيد يكفي أكتر من ~6 شهور = بطيء
const WEEKS_SERIES = 8;
const SEASONS = ['صيفي', 'شتوي', 'كل السنة'] as const;

const toMs = (s: string) => new Date(`${s}T00:00:00Z`).getTime();
const toStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayOf = (v: any): string => getTodayDateStr(v) || String(v || '').split('T')[0];
const num = (v: any) => Number(v) || 0;
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('en-US');
const norm = (s: any) => String(s || '').trim().toLowerCase();

interface Agg { qty: number; revenue: number; invoices: Set<string>; byBranch: Map<string, number>; lastDay: string; }

export default function MovementReport({
  invoices,
  inventory,
  period,
  customStartDate,
  customEndDate,
  branchLabel,
  periodLabel,
  onUpdateInventory,
}: Props) {
  const [season, setSeason] = useState<'ALL' | typeof SEASONS[number]>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');
  const [sortDir, setSortDir] = useState<'most' | 'least'>('most');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [openKey, setOpenKey] = useState<string | null>(null);

  // تعديل الموسم المباشر (Inline Editing)
  const [seasonMap, setSeasonMap] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleSeasonChange = async (r: any, newSeason: string) => {
    setSavingKey(r.key);
    setSeasonMap(prev => ({ ...prev, [r.key]: newSeason }));

    try {
      if (r.itemIds && r.itemIds.length > 0) {
        await Promise.all(
          r.itemIds.map((id: string) =>
            fetch('/api/inventory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, name: r.name, season: newSeason }),
            })
          )
        );
      } else {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: r.name, season: newSeason, category: r.category !== '—' ? r.category : 'عام' }),
        });
      }

      if (onUpdateInventory) {
        onUpdateInventory(prev =>
          prev.map(it => {
            const match = r.itemIds?.includes(it.id) || String(it.name || '').trim().toLowerCase() === r.key;
            return match ? { ...it, season: newSeason } : it;
          })
        );
      }

      setToastMsg({ text: `✓ تم حفظ موسم "${r.name}" كـ (${newSeason})`, type: 'success' });
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error('Failed to update season:', err);
      setToastMsg({ text: `❌ فشل تعديل موسم "${r.name}"`, type: 'error' });
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setSavingKey(null);
    }
  };

  const data = useMemo(() => {
    const today = getTodayDateStr();
    const todayMs = toMs(today);

    // ─── الفترة الحالية والسابقة ───
    const allDays = invoices.map(i => dayOf(i.date)).filter(Boolean).sort();
    let start = today, end = today;
    if (period === 'yesterday') { start = end = toStr(todayMs - DAY); }
    else if (period === 'thisWeek') { start = toStr(todayMs - 7 * DAY); }
    else if (period === 'thisMonth') { start = `${today.substring(0, 7)}-01`; }
    else if (period === 'custom') { start = customStartDate || allDays[0] || today; end = customEndDate || today; }
    else if (period === 'all') { start = allDays[0] || today; }
    const days = Math.max(1, Math.round((toMs(end) - toMs(start)) / DAY) + 1);
    const weeks = days / 7;
    const prevEnd = toStr(toMs(start) - DAY);
    const prevStart = toStr(toMs(start) - days * DAY);
    const hasPrev = period !== 'all';

    // ─── ربط بنود الفواتير بأسماء المخزون (بالكود الأول، وبعدين بالاسم) ───
    const nameByCode = new Map<string, string>();
    inventory.forEach(i => { if (i.code) nameByCode.set(String(i.code).trim(), String(i.name).trim()); });
    const resolve = (it: any): string => {
      const c = String(it.code || it.itemCode || '').trim();
      return (c && nameByCode.get(c)) || String(it.name || it.fabricName || it.itemName || 'صنف').trim();
    };

    const cur = new Map<string, Agg>();
    const prev = new Map<string, number>();
    const weekly = new Map<string, number[]>();
    const lastSold = new Map<string, string>();

    invoices.forEach(inv => {
      const d = dayOf(inv.date);
      if (!d) return;
      const inCur = d >= start && d <= end;
      const inPrev = hasPrev && d >= prevStart && d <= prevEnd;
      const wIdx = Math.floor((todayMs - toMs(d)) / (7 * DAY));
      const branch = normalizeBranchName(inv.branch) || '—';
      (inv.items || []).forEach((it: any) => {
        const qty = num(it.meters || it.quantity || it.qty);
        if (qty <= 0) return;
        const key = norm(resolve(it));
        const name = resolve(it);
        if (!lastSold.has(key) || d > (lastSold.get(key) as string)) lastSold.set(key, d);
        if (wIdx >= 0 && wIdx < WEEKS_SERIES) {
          const arr = weekly.get(key) || new Array(WEEKS_SERIES).fill(0);
          arr[wIdx] += qty;
          weekly.set(key, arr);
        }
        if (inPrev) prev.set(key, (prev.get(key) || 0) + qty);
        if (inCur) {
          const a = cur.get(key) || { qty: 0, revenue: 0, invoices: new Set<string>(), byBranch: new Map<string, number>(), lastDay: '' };
          a.qty += qty;
          a.revenue += num(it.totalPrice) || qty * num(it.pricePerMeter || it.unitPrice || it.price);
          a.invoices.add(String(inv.id || inv.invoiceNumber));
          a.byBranch.set(branch, (a.byBranch.get(branch) || 0) + qty);
          cur.set(key, a);
          (a as any).name = name;
        }
      });
    });

    // ─── صفوف الأصناف: المخزون مجمّع بالاسم (نفس القماش فى أكتر من فرع) ───
    const rows = new Map<string, any>();
    inventory.forEach(i => {
      const key = norm(i.name);
      const r = rows.get(key) || {
        key,
        name: String(i.name).trim(),
        category: i.category,
        unit: i.unit,
        season: 'كل السنة',
        stock: 0,
        costValue: 0,
        itemIds: [] as string[],
      };
      r.stock += num(i.totalQuantity);
      r.costValue += num(i.totalQuantity) * num(i.costPrice);
      if (i.season && i.season !== 'كل السنة') r.season = i.season;
      if (seasonMap[key]) r.season = seasonMap[key];
      if (i.id && !r.itemIds.includes(i.id)) r.itemIds.push(i.id);
      rows.set(key, r);
    });
    cur.forEach((a: any, key) => {
      if (!rows.has(key)) {
        const s = seasonMap[key] || 'كل السنة';
        rows.set(key, { key, name: a.name, category: '—', unit: 'متر', season: s, stock: 0, costValue: 0, itemIds: [] });
      }
    });

    const list = Array.from(rows.values()).map(r => {
      const a = cur.get(r.key);
      const sold = a?.qty || 0;
      const perWeek = sold / weeks;
      const weeksLeft = perWeek > 0 ? r.stock / perWeek : null;
      const prevSold = prev.get(r.key) || 0;
      const trend = !hasPrev ? null : prevSold > 0 ? (sold - prevSold) / prevSold : (sold > 0 ? Infinity : null);
      const status: Status = sold === 0 ? 'dead' : (weeksLeft !== null && weeksLeft > SLOW_WEEKS ? 'slow' : 'fast');
      return {
        ...r, sold, perWeek, weeksLeft, prevSold, trend, status,
        revenue: a?.revenue || 0,
        invoiceCount: a?.invoices.size || 0,
        byBranch: Array.from(a?.byBranch.entries() || []).sort((x, y) => y[1] - x[1]),
        weekly: weekly.get(r.key) || new Array(WEEKS_SERIES).fill(0),
        lastSold: lastSold.get(r.key) || '',
      };
    }).filter(r => r.sold > 0 || r.stock > 0);

    // ─── ملخص بالموسم ───
    const bySeason = SEASONS.map(s => {
      const g = list.filter(r => r.season === s);
      const dead = g.filter(r => r.status === 'dead');
      return {
        season: s,
        items: g.length,
        active: g.filter(r => r.sold > 0).length,
        sold: g.reduce((t, r) => t + r.sold, 0),
        revenue: g.reduce((t, r) => t + r.revenue, 0),
        dead: dead.length,
        deadValue: dead.reduce((t, r) => t + r.costValue, 0),
        slowValue: g.filter(r => r.status === 'slow').reduce((t, r) => t + r.costValue, 0),
      };
    });

    return { list, bySeason, start, end, days, hasPrev };
  }, [invoices, inventory, period, customStartDate, customEndDate, seasonMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const l = data.list.filter(r =>
      (season === 'ALL' || r.season === season) &&
      (statusFilter === 'ALL' || r.status === statusFilter) &&
      (!q || r.name.toLowerCase().includes(q) || String(r.category).toLowerCase().includes(q))
    );
    return l.sort((a, b) => sortDir === 'most' ? b.sold - a.sold || b.stock - a.stock : a.sold - b.sold || b.costValue - a.costValue);
  }, [data.list, season, statusFilter, sortDir, search]);

  const paged = pageSize <= 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize);
  const resetPage = () => setPage(1);

  const statusBadge = (s: Status) =>
    s === 'fast' ? (
      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        سريع
      </span>
    ) : s === 'slow' ? (
      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px] inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        بطيء
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        راكد
      </span>
    );

  const trendCell = (t: number | null) => {
    if (t === null) return <span className="text-slate-400 font-mono">—</span>;
    if (t === Infinity) return <span className="text-emerald-700 font-black text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">✨ جديد</span>;
    const up = t >= 0;
    const pct = Math.abs(Math.round(t * 100));
    return (
      <span
        className={`font-mono font-black text-xs inline-flex items-center gap-0.5 ${up ? 'text-emerald-700' : 'text-rose-700'}`}
        dir="ltr"
        title={up ? `ارتفاع في المبيعات بنسبة +${pct}% مقارنة بالفترة السابقة` : `انخفاض في المبيعات بنسبة -${pct}% مقارنة بالفترة السابقة`}
      >
        <span>{up ? '▲' : '▼'}</span>
        <span>{pct}%</span>
      </span>
    );
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all animate-bounce ${
          toastMsg.type === 'success' ? 'bg-slate-900 text-emerald-400 border border-emerald-500' : 'bg-rose-900 text-rose-200 border border-rose-500'
        }`}>
          {toastMsg.text}
        </div>
      )}

      {/* شريط رأس التقرير وزر دليل الشرح */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-slate-600 font-bold">
          الفترة: <span className="text-slate-900 font-black">{periodLabel}</span> ({data.start} ← {data.end}، {data.days} يوم) • الفرع: <span className="text-slate-900 font-black">{branchLabel}</span>
          {data.hasPrev ? ' • الاتجاه = مقارنة بالفترة السابقة بنفس الطول' : ''}
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="no-print inline-flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors shadow-2xs"
        >
          <span>💡 دليل فهم التقرير (الحالة والاتجاه)</span>
          <span className="text-[10px]">{showGuide ? '▲ إخفاء' : '▼ إظهار'}</span>
        </button>
      </div>

      {/* صندوق الشرح التفاعلي للأعمدة وقرارات الإدارة */}
      {showGuide && (
        <div className="card bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 border border-slate-700 shadow-md">
          <div className="font-black text-sm text-amber-400 mb-2.5 flex items-center gap-2">
            <span>💡 دليل مؤشرات حركة الأصناف لاتخاذ قرارات البيع والشراء والمواسم:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* شرح عمود الحالة */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="font-black text-amber-300 mb-2 flex items-center gap-1.5 text-sm">
                <span>🏷️ عمود (الحالة) — قرار المخزون:</span>
              </div>
              <ul className="space-y-2 text-slate-200 leading-relaxed text-[11px]">
                <li className="flex items-start gap-1.5">
                  <span className="font-black text-emerald-400 min-w-[55px]">🟢 سريع:</span>
                  <span>صنف عليه سحب مستمر ومخزونه متوازن يكفي أقل من 26 أسبوعاً (6 شهور). <b className="text-white">القرار:</b> استمر في عرضه وجدد مخزونه فوراً.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-black text-amber-400 min-w-[55px]">🟡 بطيء:</span>
                  <span>صنف بيتباع ولكن رصيده الحالي كبير جداً ويكفي لأكثر من 26 أسبوعاً بمعدل البيع الحالي. <b className="text-white">القرار:</b> لا تطلب منه كميات جديدة واعمل عليه عروض.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-black text-rose-400 min-w-[55px]">🔴 راكد:</span>
                  <span>صنف له رصيد وتكلفة متجمدة بالمخزن ولكن <b className="text-rose-300">لم يُباع منه أي متر</b> في الفترة المختارة. <b className="text-white">القرار:</b> صَفِّه أو استبدله بصنف الموسم الحالي.</span>
                </li>
              </ul>
            </div>

            {/* شرح عمود الاتجاه والأسابيع */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="font-black text-amber-300 mb-2 flex items-center gap-1.5 text-sm">
                <span>📈 عمود (الاتجاه) و (يكفي أسبوع):</span>
              </div>
              <ul className="space-y-2 text-slate-200 leading-relaxed text-[11px]">
                <li className="flex items-start gap-1.5">
                  <span className="font-black text-emerald-400 min-w-[55px]">▲ +X%:</span>
                  <span>المبيعات بتزيد مقارنة بالفترة السابقة لها مباشرة (طلب صاعد وإقبال متزايد).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-black text-rose-400 min-w-[55px]">▼ -X%:</span>
                  <span>المبيعات بتقل مقارنة بالفترة السابقة (إشارة مبكرة لانتهاء موسم الصنف أو تراجع الإقبال).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-black text-sky-400 min-w-[55px]">يكفي:</span>
                  <span><b className="text-white">(الرصيد الحالي ÷ متوسط السحب الأسبوعي)</b> = عدد الأسابيع المتبقية حتى نفاد المخزون تماماً.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-black text-amber-300 min-w-[55px]">⚡ تعديل:</span>
                  <span>يمكنك تغيير موسم الصنف (صيفي / شتوي / كل السنة) مباشرة من الجدول وسيحفظ فوراً.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ملخص بالموسم */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {data.bySeason.map(s => (
          <div key={s.season} className={`card p-3 rounded-xl border ${s.season === 'صيفي' ? 'bg-amber-50 border-amber-300' : s.season === 'شتوي' ? 'bg-sky-50 border-sky-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="font-black text-xs text-slate-900 mb-1.5 flex items-center justify-between">
              <span>{s.season === 'صيفي' ? '☀️' : s.season === 'شتوي' ? '❄️' : '🗓️'} {s.season}</span>
              <span className="text-[10px] text-slate-500 font-bold font-mono">{s.items} صنف</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-700">
              <span>الأصناف: <b className="font-mono">{s.items}</b></span>
              <span>اتباع منها: <b className="font-mono">{s.active}</b></span>
              <span>الكمية المباعة: <b className="font-mono">{fmt(s.sold)}</b></span>
              <span>الإيراد: <b className="font-mono">{fmt(s.revenue, 0)} ج</b></span>
              <span className="text-rose-800">راكد: <b className="font-mono">{s.dead}</b></span>
              <span className="text-rose-800">قيمة الراكد: <b className="font-mono">{fmt(s.deadValue, 0)} ج</b></span>
              <span className="col-span-2 text-amber-800">قيمة البطيء: <b className="font-mono">{fmt(s.slowValue, 0)} ج</b></span>
            </div>
          </div>
        ))}
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 p-3">
        <div className="no-print flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <select value={season} onChange={e => { setSeason(e.target.value as any); resetPage(); }} className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700">
            <option value="ALL">كل المواسم</option>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); resetPage(); }} className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700">
            <option value="ALL">كل الحالات</option>
            <option value="fast">🟢 سريع</option>
            <option value="slow">🟡 بطيء</option>
            <option value="dead">🔴 راكد</option>
          </select>
          <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700">
            <option value="most">الأكثر مبيعًا أولًا</option>
            <option value="least">الأقل مبيعًا أولًا</option>
          </select>
          <input value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} placeholder="بحث باسم الصنف أو التصنيف..." className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold w-48" />
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); resetPage(); }} className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700">
            <option value={25}>25 لكل صفحة</option>
            <option value={50}>50 لكل صفحة</option>
            <option value={0}>الكل</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <tr>
                <th className="p-2">الصنف</th>
                <th className="p-2 text-center" title="اضغط على خيار الموسم لتعديله وحفظه فوراً">الموسم ⚡</th>
                <th className="p-2 text-center">المباع</th>
                <th className="p-2 text-center">فواتير</th>
                <th className="p-2 text-center">الرصيد</th>
                <th className="p-2 text-center">المباع/أسبوع</th>
                <th className="p-2 text-center" title="الرصيد الحالي ÷ معدل البيع الأسبوعي">يكفي (أسبوع) ℹ️</th>
                <th className="p-2 text-center" title="مقارنة مبيعات الفترة الحالية بالفترة السابقة">الاتجاه ℹ️</th>
                <th className="p-2 text-center" title="🟢 سريع • 🟡 بطيء • 🔴 راكد">الحالة ℹ️</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500">لا توجد أصناف مطابقة</td></tr>
              )}
              {paged.map(r => (
                <React.Fragment key={r.key}>
                  <tr onClick={() => setOpenKey(openKey === r.key ? null : r.key)} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="p-2 font-bold text-slate-900">
                      {r.name}
                      <div className="text-[10px] text-slate-400 font-normal">{r.category}</div>
                    </td>

                    {/* تعديل الموسم المباشر Inline */}
                    <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <select
                          value={r.season || 'كل السنة'}
                          disabled={savingKey === r.key}
                          onChange={e => handleSeasonChange(r, e.target.value)}
                          className={`text-[11px] font-bold py-1 px-2 rounded-lg border transition-all cursor-pointer shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden ${
                            r.season === 'صيفي'
                              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              : r.season === 'شتوي'
                              ? 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                          title="اضغط لتغيير موسم الصنف مباشرة"
                        >
                          <option value="كل السنة">🗓️ كل السنة</option>
                          <option value="صيفي">☀️ صيفي</option>
                          <option value="شتوي">❄️ شتوي</option>
                        </select>
                        {savingKey === r.key && (
                          <span className="inline-block text-[10px] animate-spin text-amber-600">⏳</span>
                        )}
                      </div>
                    </td>

                    <td className="p-2 text-center font-mono font-black">{fmt(r.sold)} {r.unit}</td>
                    <td className="p-2 text-center font-mono">{r.invoiceCount}</td>
                    <td className="p-2 text-center font-mono">{fmt(r.stock)}</td>
                    <td className="p-2 text-center font-mono">{fmt(r.perWeek)}</td>
                    <td className="p-2 text-center font-mono">{r.weeksLeft === null ? '—' : fmt(r.weeksLeft)}</td>
                    <td className="p-2 text-center">{trendCell(r.trend)}</td>
                    <td className="p-2 text-center">{statusBadge(r.status)}</td>
                  </tr>
                  {openKey === r.key && (
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td colSpan={9} className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="font-black text-[11px] text-slate-800 mb-2">المبيعات أسبوع بأسبوع (آخر {WEEKS_SERIES} أسابيع)</div>
                            <div className="flex items-end gap-1.5 h-20" dir="ltr">
                              {[...r.weekly].reverse().map((v: number, i: number) => {
                                const max = Math.max(...r.weekly, 1);
                                return (
                                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <span className="text-[9px] font-mono text-slate-600">{v ? fmt(v, 0) : ''}</span>
                                    <div className="w-full bg-amber-400 rounded-t" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} />
                                    <span className="text-[9px] text-slate-400">{i === WEEKS_SERIES - 1 ? 'الحالي' : `-${WEEKS_SERIES - 1 - i}`}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-700 flex flex-col gap-1">
                            <div className="font-black text-slate-800 mb-1">تفاصيل</div>
                            <span>آخر مرة اتباع: <b>{r.lastSold || 'لم يُباع'}</b></span>
                            <span>الإيراد فى الفترة: <b className="font-mono">{fmt(r.revenue, 0)} ج</b></span>
                            <span>قيمة الرصيد بالتكلفة: <b className="font-mono">{fmt(r.costValue, 0)} ج</b></span>
                            {data.hasPrev && <span>المباع فى الفترة السابقة: <b className="font-mono">{fmt(r.prevSold)}</b></span>}
                            <span>المباع حسب الفرع: {r.byBranch.length ? r.byBranch.map(([b, q]: [string, number]) => `${b} (${fmt(q)})`).join(' • ') : '—'}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {pageSize > 0 && (
          <div className="no-print mt-2">
            <Pagination currentPage={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}

        <div className="mt-3 text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="font-bold text-slate-700">📌 ملخص المؤشرات:</span> 🟢 سريع (المخزون يكفي أقل من {SLOW_WEEKS} أسبوع) • 🟡 بطيء (المخزون يكفي أكثر من {SLOW_WEEKS} أسبوع) • 🔴 راكد (صنف عليه رصيد ولم يُباع في الفترة) • ⚡ يمكنك تعديل موسم أي صنف مباشرة من عمود الموسم بالجدول.
        </div>
      </div>
    </>
  );
}
