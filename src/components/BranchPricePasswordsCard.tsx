'use client';

import React, { useEffect, useState } from 'react';
import { BRANCHES_LIST, branchLabel } from '@/lib/branches';

export default function BranchPricePasswordsCard() {
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ branch: string; ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/branch-price-passwords', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data?.success) setPasswords(data.passwords || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveBranch = async (branch: string) => {
    setSavingBranch(branch);
    setMsg(null);
    try {
      const res = await fetch('/api/branch-price-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch, password: passwords[branch] || '' }),
      });
      const data = await res.json();
      setMsg({ branch, ok: !!data?.success, text: data?.success ? 'تم الحفظ' : (data?.error || 'فشل الحفظ') });
    } catch (e: any) {
      setMsg({ branch, ok: false, text: e?.message || 'خطأ فى الاتصال' });
    } finally {
      setSavingBranch(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
          <span className="material-symbols-outlined text-amber-800">key</span>
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-sm">باسورد الأسعار لكل فرع</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            كل فرع له باسورد خاص به يستخدمه مديره لفتح تعديل الأسعار والخصومات لموظفيه. الأدمن بس يقدر يشوف ويغيّر باسورد أي فرع من هنا.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 font-bold">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {BRANCHES_LIST.map(b => (
            <div key={b.id} className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex-1 truncate">{branchLabel(b.name)}</span>
              <input
                type="text"
                value={passwords[b.name] || ''}
                onChange={e => setPasswords(prev => ({ ...prev, [b.name]: e.target.value }))}
                className="w-20 shrink-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                placeholder="1234"
              />
              <button
                type="button"
                onClick={() => saveBranch(b.name)}
                disabled={savingBranch === b.name}
                className="shrink-0 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 py-1.5 px-3 rounded-lg font-bold text-xs shadow"
              >
                {savingBranch === b.name ? '...' : 'حفظ'}
              </button>
              {msg && msg.branch === b.name && (
                <span className={`text-[11px] font-bold shrink-0 ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
