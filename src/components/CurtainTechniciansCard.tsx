'use client';

import React, { useEffect, useState } from 'react';

/**
 * قسم إدارة "الفنيين المسؤولين عن رفع المقاسات" — الأدمن يضيف/يشيل اسم فنى من هنا
 * مباشرة، والقائمة بتتحدث فورًا فى دروب داون صفحة المعاينات (/pipeline/inspections)
 * لكل المستخدمين. القائمة نفسها متخزنة فى قاعدة البيانات مش هارد-كود فى الكود.
 */
export default function CurtainTechniciansCard() {
  const [list, setList] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/curtain-technicians', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data?.list)) setList(data.list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (next: string[]) => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/curtain-technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error || 'فشل الحفظ' });
        return;
      }
      setList(data.list);
      setMsg({ ok: true, text: 'تم الحفظ ✓' });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'فشل الاتصال بالسيرفر' });
    } finally {
      setSaving(false);
    }
  };

  const addName = () => {
    const name = newName.trim();
    if (!name) return;
    if (list.includes(name)) { setMsg({ ok: false, text: 'الاسم موجود بالفعل' }); return; }
    setNewName('');
    save([...list, name]);
  };

  const removeName = (name: string) => {
    save(list.filter(n => n !== name));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-bold text-base text-slate-900">الفنيون المسؤولون عن رفع المقاسات</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          القائمة اللي بتظهر فى دروب داون "الفنى المسؤول" بصفحة المعاينات — ضيف أو شيل اسم من هنا مباشرة من غير الحاجة لتعديل كود.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="text-xs text-slate-400 font-bold">جارِ التحميل...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map(name => (
              <span
                key={name}
                className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold px-3 py-1.5 rounded-full"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeName(name)}
                  disabled={saving}
                  className="text-amber-700 hover:text-red-600 disabled:opacity-40"
                  title="حذف"
                >
                  <span className="material-symbols-outlined text-[15px] align-middle">close</span>
                </button>
              </span>
            ))}
            {list.length === 0 && <span className="text-xs text-slate-400 italic">لا يوجد فنيون مضافون</span>}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addName(); } }}
            placeholder="اسم فنى جديد..."
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={addName}
            disabled={saving || !newName.trim()}
            className="bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs shadow-gold"
          >
            + إضافة
          </button>
        </div>

        {msg && (
          <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}
