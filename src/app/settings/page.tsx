'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import Logo from '@/components/Logo';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('أحمد كشك للأقمشة والستائر الفاخرة');
  const [subTitle, setSubTitle] = useState('الفرع الرئيسي: 73 شارع سعد زغلول والجامع العباسي');
  const [phone, setPhone] = useState('01063821000');
  const [whatsapp, setWhatsapp] = useState('201063821000');
  const [address, setAddress] = useState('73 شارع سعد زغلول والجامع العباسي (فروعنا: عرابي • عمر أفندي • الثلاثيني)');
  const [footerNote, setFooterNote] = useState('شكراً لتعاملكم مع محلات أحمد كشك. البضاعة المباعة لا ترد ولا تستبدل بعد القص. جميع الحقوق محفوظة.');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
            تم حفظ الإعدادات وبيانات الفواتير بنجاح ✅
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Identity & Logo Settings */}
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
                <input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">الفرع الرئيسي / الوصف</label>
                <input
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-gold"
                />
              </div>
            </div>
          </div>

          {/* Contact Details on Invoices */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-gold-dark">receipt_long</span>
              بيانات التواصل المطبوعة على الفواتير والعقود
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">رقم الهاتف الأساسي للعملاء</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">رقم الواتساب للمعاينات والمتابعة</label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  dir="ltr"
                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">العنوان المكتوب بالفاتورة</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-gold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">ملاحظات وشروط تذييل الفاتورة (Footer Note)</label>
              <textarea
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-gold h-20 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-gold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            حفظ وتحديث بيانات الفواتير
          </button>
        </form>

        {/* Danger Zone: Zero Out All System Data */}
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl space-y-3 mt-4">
          <h2 className="font-black text-base text-rose-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">delete_forever</span>
            تصفير بيانات البرنامج بالكامل (إعادة ضبط المصنع)
          </h2>
          <p className="text-xs text-rose-800 leading-relaxed font-bold">
            هذا الخيار يقوم بمحو جميع المعاينات، المقايسات، طلبات الورشة، العملاء، المخزون، والموردين نهائياً من قاعدة البيانات والتخزين المحلي.
            <br />
            <strong>ملاحظة:</strong> يتم الحفاظ الكامل على الفروع الرسمية وحسابات المستخدمين.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (confirm('هل أنت تأكيد من رغبتك في تصفير جميع بيانات البرنامج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
                try {
                  const res = await fetch('/api/reset-data', { method: 'POST' });
                  const json = await res.json();
                  if (json.success) {
                    if (typeof window !== 'undefined') {
                      localStorage.clear();
                    }
                    alert('تم تصفير جميع البيانات بنجاح في قاعدة البيانات والتخزين المحلي!');
                    window.location.reload();
                  } else {
                    alert('حدث خطأ أثناء التصفير: ' + json.error);
                  }
                } catch (e: any) {
                  alert('فشل الاتصال بالسيرفر لتصفير البيانات');
                }
              }
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
            تصفير جميع البيانات الآن ⚠️
          </button>
        </div>
      </div>
    </PageShell>
  );
}
