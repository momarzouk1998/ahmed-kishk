'use client';

import React, { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import Logo from '@/components/Logo';
import { BrandSettings, BUILT_IN_BRAND, loadBrandSettingsAsync, saveBrandSettings } from '@/lib/brandSettings';

export default function SettingsPage() {
  const [s, setS] = useState<BrandSettings>(BUILT_IN_BRAND);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadBrandSettingsAsync();
        setS(loaded);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upd = (k: keyof BrandSettings, v: string) => setS(prev => ({ ...prev, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await saveBrandSettings(s);
      setMsg({ ok: true, text: 'تم حفظ الإعدادات وبيانات الفواتير بنجاح ✅' });
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || 'فشل الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="إعدادات النظام وهوية الفواتير">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
            الهوية الرسمية والطباعة
          </span>
          <h1 className="font-display font-black text-2xl text-slate-900">إعدادات النظام وبيانات الفواتير المطبوعة</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            تخصيص اللوجو وبيانات الاتصال وشروط تذييل الفاتورة المطبوعة للعملاء في كافة الفروع.
          </p>
        </div>

        {msg && (
          <div className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <span className={`material-symbols-outlined text-[20px] ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
              {msg.ok ? 'check_circle' : 'error'}
            </span>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">جارٍ تحميل الإعدادات...</div>
        ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-gold-dark">palette</span>
              هوية المتجر والشعار (Logo)
            </h2>

            <div className="flex items-center gap-5 pb-4 border-b border-slate-100">
              <div className="w-20 h-20 bg-white p-2 rounded-2xl flex items-center justify-center border-2 border-brand-gold shadow-gold text-primary">
                <Logo size="lg" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">لوجو مؤسسة أحمد كشك الرسمي (المعتمد)</h3>
                <p className="text-xs text-slate-500 mt-0.5">يظهر أعلى المعاينات، عروض الأسعار، الفواتير، وسندات القبض.</p>
                <span className="inline-block mt-2 text-xs text-slate-800 font-mono bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                  logo.png بدقة عالية
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">اسم المتجر / النشاط التجاري</label>
                <input value={s.storeName} onChange={e => upd('storeName', e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">الفرع الرئيسي / الوصف</label>
                <input value={s.subTitle} onChange={e => upd('subTitle', e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-gold" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-gold-dark">receipt_long</span>
              بيانات التواصل المطبوعة على الفواتير والعقود
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">رقم الهاتف الأساسي للعملاء</label>
                <input value={s.phone} onChange={e => upd('phone', e.target.value)} dir="ltr"
                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">رقم الواتساب للمعاينات والمتابعة</label>
                <input value={s.whatsapp} onChange={e => upd('whatsapp', e.target.value)} dir="ltr"
                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">العنوان المكتوب بالفاتورة</label>
                <input value={s.address} onChange={e => upd('address', e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-gold" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">ملاحظات وشروط تذييل الفاتورة (Footer Note)</label>
              <textarea value={s.footerNote} onChange={e => upd('footerNote', e.target.value)}
                className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-gold h-20 resize-none" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50 text-slate-950 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-gold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">save</span>
            {saving ? 'جارٍ الحفظ...' : 'حفظ وتحديث بيانات الفواتير'}
          </button>
        </form>
        )}
      </div>
    </PageShell>
  );
}
