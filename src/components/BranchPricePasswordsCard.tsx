'use client';

import React, { useEffect, useState } from 'react';
import { BRANCHES_LIST, branchLabel } from '@/lib/branches';

interface BranchPwdStatus {
  isSet: boolean;
  isDefault: boolean;
}

export default function BranchPricePasswordsCard() {
  const [status, setStatus] = useState<Record<string, BranchPwdStatus>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ branch: string; ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/branch-price-passwords', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data?.success) setStatus(data.status || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ⚠️ من الآن الكلمة محفوظة كـ bcrypt hash — مفيش أي طريقة تقنية نعرض بيها الباسورد
  // الحالي، فالأدمن بس يقدر "يعيّن باسورد جديد" مش "يشوف/يعدّل القديم" (نفس مبدأ أي
  // نظام باسوردات آمن). الحقل بيفضل فاضي وبيتقفل تانى بعد نجاح الحفظ.
  const saveBranch = async (branch: string) => {
    const newPassword = (drafts[branch] || '').trim();
    if (!newPassword || newPassword.length < 3) {
      setMsg({ branch, ok: false, text: 'كلمة السر قصيرة جداً' });
      return;
    }
    setSavingBranch(branch);
    setMsg(null);
    try {
      const res = await fetch('/api/branch-price-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch, password: newPassword }),
      });
      const data = await res.json();
      if (data?.success) {
        setStatus(prev => ({ ...prev, [branch]: { isSet: true, isDefault: false } }));
        setDrafts(prev => ({ ...prev, [branch]: '' }));
      }
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
            كل فرع له باسورد خاص به يستخدمه مديره لفتح تعديل الأسعار والخصومات لموظفيه. الأدمن بس يقدر يعيّن باسورد جديد لأي فرع من هنا (لا يمكن عرض الباسورد الحالي لأسباب أمنية).
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 font-bold">جارِ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {BRANCHES_LIST.map(b => {
            const s = status[b.name];
            return (
              <div key={b.id} className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-700 block truncate">{branchLabel(b.name)}</span>
                  <span className={`text-[10px] font-bold ${s?.isDefault ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {s?.isDefault ? '⚠️ لسه على الباسورد الافتراضي — غيّره' : '✓ باسورد مخصص مضبوط'}
                  </span>
                </div>
                <input
                  type="password"
                  value={drafts[b.name] || ''}
                  onChange={e => setDrafts(prev => ({ ...prev, [b.name]: e.target.value }))}
                  className="w-24 shrink-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  placeholder="باسورد جديد"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
