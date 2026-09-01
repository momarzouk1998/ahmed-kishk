'use client';

import React, { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { getCurtainDefaults, saveCurtainDefaults, BUILT_IN_DEFAULTS, CurtainDefaults } from '@/lib/curtainDefaults';

export default function CurtainDefaultsPage() {
  const [d, setD] = useState<CurtainDefaults>(BUILT_IN_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { setD(getCurtainDefaults()); }, []);

  const update = (path: (keyof any)[], val: number) => {
    setD(prev => {
      const clone: any = JSON.parse(JSON.stringify(prev));
      let cur: any = clone;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = Number.isFinite(val) ? val : 0;
      return clone;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      await saveCurtainDefaults(d);
      setMsg({ ok: true, text: 'تم حفظ الافتراضيات ✓' });
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || 'فشل الحفظ' });
    } finally {
      setLoading(false);
    }
  };

  const resetToBuiltIn = () => setD(BUILT_IN_DEFAULTS);

  return (
    <PageShell title="افتراضيات تسعير الستائر">
      <form onSubmit={submit} className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
          <h2 className="font-black text-slate-900 text-sm mb-3 border-r-4 border-amber-500 pr-2.5">
            الرسوم والأسعار العامة
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <NumField label="سعر متر بطانة الشيفون (ج)" value={d.sheerLiningPricePerMeter} onChange={v => update(['sheerLiningPricePerMeter'], v)} />
            <NumField label="رسوم التركيب الافتراضية (ج)" value={d.installFee} onChange={v => update(['installFee'], v)} />
            <NumField label="رسوم النقل الافتراضية (ج)" value={d.transportFee} onChange={v => update(['transportFee'], v)} />
            <NumField label="سعر متر التراك (ج)" value={d.trackPricePerMeter} onChange={v => update(['trackPricePerMeter'], v)} />
            <NumField label="سعر متر ماسورة الفورجيه (ج)" value={d.pipePricePerMeter} onChange={v => update(['pipePricePerMeter'], v)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
          <h2 className="font-black text-slate-900 text-sm mb-3 border-r-4 border-amber-500 pr-2.5">
            أسعار شرائط الستائر
          </h2>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <NumField label="شريط قماش ثقيل (ج/م)" value={d.tapePrices.heavy} onChange={v => update(['tapePrices', 'heavy'], v)} />
            <NumField label="شريط شيفون (ج/م)" value={d.tapePrices.sheer} onChange={v => update(['tapePrices', 'sheer'], v)} />
            <NumField label="شريط بلاك آوت (ج/م)" value={d.tapePrices.blackout} onChange={v => update(['tapePrices', 'blackout'], v)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
          <h2 className="font-black text-slate-900 text-sm mb-3 border-r-4 border-amber-500 pr-2.5">
            أسعار إكسسوارات المواسير
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <NumField label="حامل مجوز (ج)" value={d.accessoryPrices.doubleBracket} onChange={v => update(['accessoryPrices', 'doubleBracket'], v)} />
            <NumField label="حامل مفرد (ج)" value={d.accessoryPrices.singleBracket} onChange={v => update(['accessoryPrices', 'singleBracket'], v)} />
            <NumField label="قم جانبى (ج)" value={d.accessoryPrices.sideCap} onChange={v => update(['accessoryPrices', 'sideCap'], v)} />
            <NumField label="حلقات دبل (ج)" value={d.accessoryPrices.doubleRing} onChange={v => update(['accessoryPrices', 'doubleRing'], v)} />
            <NumField label="شماعة ديكور (ج)" value={d.accessoryPrices.decorHanger} onChange={v => update(['accessoryPrices', 'decorHanger'], v)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 px-6 py-3 rounded-2xl font-black text-xs shadow">
            {loading ? 'جارٍ الحفظ...' : 'حفظ الافتراضيات'}
          </button>
          <button type="button" onClick={resetToBuiltIn} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-2xl font-bold text-xs">
            استعادة القيم المدمجة
          </button>
          {msg && (
            <span className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</span>
          )}
        </div>
      </form>
    </PageShell>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-700 block mb-1">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 bg-white"
      />
    </div>
  );
}
