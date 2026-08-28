'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface AccessoryItemSpec {
  name: string;
  detail: string;
  qty: number;
  prepared: boolean;
}

interface AccessoryKit {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  items: AccessoryItemSpec[];
  status: 'جاري التجهيز' | 'تم التجهيز' | 'في التركيبات' | 'في التسليمات';
}

const initialKits: AccessoryKit[] = [
  {
    id: 'ACC-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    status: 'جاري التجهيز',
    items: [
      { name: 'مجاري تراك ألومنيوم سقف', detail: '3 مجرى ألومنيوم (مقاس 3.50م)', qty: 3, prepared: true },
      { name: 'مواسير فورجيه استيل 25مم', detail: '2 ماسورة فورجيه سادة (مقاس 2.80م)', qty: 2, prepared: false },
      { name: 'حامل مجوز فورجيه', detail: 'أوكسيديه مذهب', qty: 4, prepared: false },
      { name: 'قم جانبي / كاب', detail: 'أوكسيديه شيك', qty: 4, prepared: true },
      { name: 'شماعة ديكور جانبي', detail: 'استيل فاخر', qty: 2, prepared: false },
    ],
  },
  {
    id: 'ACC-102',
    orderId: 'ORD-003',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    address: 'مصر الجديدة',
    status: 'تم التجهيز',
    items: [
      { name: 'مواسير فورجيه استيل', detail: '2 ماسورة مجدولة (مقاس 2.00م)', qty: 2, prepared: true },
      { name: 'حامل مفرد فورجيه', detail: 'أسود مط', qty: 4, prepared: true },
    ],
  }
];

export default function PipelineAccessoriesPage() {
  const [kits, setKits] = useState<AccessoryKit[]>(initialKits);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  const isSent = (status: AccessoryKit['status']) => status === 'تم التجهيز' || status === 'في التركيبات' || status === 'في التسليمات';

  const tabFiltered = kits.filter(k => activeTab === 'OPEN' ? !isSent(k.status) : isSent(k.status));
  const filtered = tabFiltered.filter(k =>
    k.customerName.includes(searchQuery) || k.id.includes(searchQuery)
  );

  const toggleItem = (kitId: string, idx: number) => {
    setKits(prev => prev.map(k => {
      if (k.id !== kitId) return k;
      const updated = [...k.items];
      updated[idx].prepared = !updated[idx].prepared;
      return { ...k, items: updated };
    }));
  };

  const updateKitStatus = (kitId: string, status: AccessoryKit['status']) => {
    setKits(prev => prev.map(k => k.id === kitId ? { ...k, status } : k));
  };

  const openCount = kits.filter(k => !isSent(k.status)).length;
  const sentCount = kits.filter(k => isSent(k.status)).length;

  return (
    <PageShell title="الإكسسوارات">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              تجهيز الاكسسوار
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">الإكسسوارات (التراكات والمواسير والحوامل)</h1>
          </div>
        </div>

        {/* 2-Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'OPEN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">handyman</span>
            <span>الإكسسوارات</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'SENT'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>السجل</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {sentCount}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الكود..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد طلبات اكسسوار قيد التجهيز' : 'السجل فارغ'}
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(kit => (
              <div key={kit.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-amber-800">{kit.id} • {kit.orderId}</span>
                      <h3 className="font-bold text-base text-slate-900">{kit.customerName}</h3>
                      <p className="text-xs text-slate-500">{kit.address}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      kit.status === 'جاري التجهيز' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}>
                      {kit.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs my-3">
                    <span className="text-[11px] font-bold text-slate-600 block">الإكسسوارات والمجاري والمواسير المطلوبة:</span>
                    {kit.items.map((item, i) => (
                      <label key={i} className="flex items-center justify-between gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-colors">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={item.prepared} onChange={() => toggleItem(kit.id, i)} className="w-4 h-4 rounded accent-slate-900 cursor-pointer" />
                          <span className={item.prepared ? 'line-through text-slate-400 font-bold' : 'font-bold text-slate-900'}>
                            {item.name} — <span className="font-normal text-slate-600">{item.detail}</span>
                          </span>
                        </div>
                        <span className="font-mono font-black text-amber-800 text-xs shrink-0">{item.qty} قطعة</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/2${kit.phone}?text=${encodeURIComponent(`مرحباً ${kit.customerName}، نود إعلامك بأن الإكسسوارات والمجاري الخاصة بأوردر الستائر في مرحلة (${kit.status}) لدى مؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    💬 إرسال تحديث للعميل (واتساب)
                  </a>

                  {kit.status === 'جاري التجهيز' ? (
                    <button
                      onClick={() => updateKitStatus(kit.id, 'تم التجهيز')}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                    >
                      ✓ تأكيد تم التجهيز
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateKitStatus(kit.id, 'في التركيبات')}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                      >
                        نقل إلى التركيبات ←
                      </button>
                      <button
                        onClick={() => updateKitStatus(kit.id, 'في التسليمات')}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                      >
                        نقل إلى التسليمات ←
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
