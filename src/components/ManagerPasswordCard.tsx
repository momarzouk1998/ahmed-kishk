'use client';

import React, { useState } from 'react';

export default function ManagerPasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next !== next2) { setMsg({ ok: false, text: 'التأكيد لا يطابق كلمة السر الجديدة' }); return; }
    if (next.length < 3) { setMsg({ ok: false, text: 'كلمة السر الجديدة قصيرة جداً' }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/manager-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (data?.ok) {
        setMsg({ ok: true, text: 'تم تغيير كلمة سر المدير بنجاح' });
        setCurrent(''); setNext(''); setNext2('');
      } else {
        setMsg({ ok: false, text: data?.error || 'فشل تغيير كلمة السر' });
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'خطأ فى الاتصال' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
          <span className="material-symbols-outlined text-amber-800">key</span>
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-sm">كلمة سر المدير لتعديل الأسعار والخصومات</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            الموظف يحتاج هذه الكلمة لتعديل أى سعر أو خصم. الافتراضى: <span className="font-mono">1234</span>. يستطيع أى مدير تغييرها هنا فى أى وقت.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">كلمة السر الحالية:</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" required />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">كلمة السر الجديدة:</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" required minLength={3} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">تأكيد الجديدة:</label>
          <input type="password" value={next2} onChange={e => setNext2(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" required minLength={3} />
        </div>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 py-2.5 px-5 rounded-xl font-bold text-xs shadow">
            {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة السر الجديدة'}
          </button>
          {msg && (
            <span className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</span>
          )}
        </div>
      </form>
    </div>
  );
}
