'use client';

import React, { useEffect, useState } from 'react';

/**
 * قسم إدارة "الورش ومسؤولي التفصيل والخياطة" — الأدمن يضيف/يشيل اسم ورشة من هنا
 * مباشرة، والقائمة بتتحدث فورًا فى دروب داون صفحة تفصيل الورشة (/pipeline/tailoring)
 * وأمر طباعة تفصيل الورشة (A4).
 */
export default function CurtainWorkshopsCard() {
  const [list, setList] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/curtain-workshops', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data?.list)) setList(data.list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (next: string[]) => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/curtain-workshops', {
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
      setMsg({ ok: true, text: 'تم الحفظ بنجاح ✓' });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'فشل الاتصال بالسيرفر' });
    } finally {
      setSaving(false);
    }
  };

  const addName = () => {
    const name = newName.trim();
    if (!name) return;
    if (list.includes(name)) { setMsg({ ok: false, text: 'اسم الورشة موجود بالفعل' }); return; }
    setNewName('');
    save([...list, name]);
  };

  const removeName = (name: string) => {
    save(list.filter(n => n !== name));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">precision_manufacturing</span>
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900">الورش ومسؤولو التفصيل والخياطة</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              قائمة الورش التي تظهر فى أوامر تشغيل وتفصيل الورشة وطباعة أوامر القص والتسليم
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="text-xs text-slate-400 font-bold">جارِ التحميل...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map(name => (
              <span
                key={name}
                className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-950 text-xs font-bold px-3 py-1.5 rounded-full"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeName(name)}
                  disabled={saving}
                  className="text-purple-700 hover:text-red-600 disabled:opacity-40 cursor-pointer"
                  title="حذف"
                >
                  <span className="material-symbols-outlined text-[15px] align-middle">close</span>
                </button>
              </span>
            ))}
            {list.length === 0 && <span className="text-xs text-slate-400 italic">لا توجد ورش مضافة</span>}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addName(); } }}
            placeholder="اسم ورشة جديدة (مثال: ورشة السلام)..."
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={addName}
            disabled={saving || !newName.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer"
          >
            + إضافة ورشة
          </button>
        </div>

        {msg && (
          <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}
