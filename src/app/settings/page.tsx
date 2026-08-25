'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('أحمد كشك للأقمشة والستائر');
  const [subTitle, setSubTitle] = useState('القاهرة — الفرع الرئيسي');
  const [phone, setPhone] = useState('01558282760');
  const [whatsapp, setWhatsapp] = useState('201558282760');
  const [address, setAddress] = useState('القاهرة — مصر');
  const [footerNote, setFooterNote] = useState('شكراً لتعاملكم مع محلات أحمد كشك. البضاعة المباعة لا ترد ولا تستبدل بعد القص.');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <Header title="إعدادات النظام والهوية" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 max-w-4xl mx-auto flex flex-col gap-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-primary">إعدادات النظام وهوية الفواتير</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              تخصيص اللوجو والهوية التجارية للفواتير الإلكترونية، المعاينات، وإعدادات المتجر.
            </p>
          </div>

          {saved && (
            <div className="bg-secondary-container text-on-secondary-container px-5 py-3 rounded-xl text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              تم حفظ الإعدادات والهوية بنجاح ✅
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            {/* Identity & Logo Settings */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-highest space-y-4">
              <h2 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">palette</span>
                هوية التجارة والشعار (Logo)
              </h2>

              <div className="flex items-center gap-6 pb-4 border-b border-surface-container-high">
                <div className="w-20 h-20 bg-surface-container-lowest p-2 rounded-2xl flex items-center justify-center border border-outline-variant shadow-md">
                  <img src="/logo.png" alt="أحمد كشك" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-primary">لوجو المحل الرسمي (المعتمد)</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">يظهر أعلى المعاينات، الفواتير، وكشوف الحسابات.</p>
                  <span className="inline-block mt-2 text-xs text-primary font-mono bg-primary-container px-2 py-0.5 rounded">logo.png بدون خلفية</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-on-surface-variant">اسم المحل الرسمي</label>
                  <input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="border border-outline-variant rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-on-surface-variant">الفرع الرئيسي / الوصف</label>
                  <input
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    className="border border-outline-variant rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details on Invoices */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-highest space-y-4">
              <h2 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">receipt_long</span>
                بيانات الاتصال على الفواتير
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-on-surface-variant">رقم التليفون الأساسي</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    className="border border-outline-variant rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-on-surface-variant">رقم الواتساب للجروب والمعاينات</label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    dir="ltr"
                    className="border border-outline-variant rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-on-surface-variant">العنوان المكتوب بالفاتورة</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border border-outline-variant rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-on-surface-variant">ملاحظات وشروط تذييل الفاتورة (Footer Note)</label>
                <textarea
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  className="border border-outline-variant rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-primary text-on-primary py-3 rounded-xl font-bold text-sm hover:bg-inverse-surface transition-colors flex items-center justify-center gap-2 shadow"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              حفظ جميع الإعدادات والهوية
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
