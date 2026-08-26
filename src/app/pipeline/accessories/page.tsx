'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface AccessoryKit {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  trackItems: { name: string; lengthCm: number; qty: number; prepared: boolean }[];
  status: 'قيد التجميع والقص' | 'تم تجهيز الحقيبة بالكامل';
}

const initialKits: AccessoryKit[] = [
  {
    id: 'ACC-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    status: 'قيد التجميع والقص',
    trackItems: [
      { name: 'تراك سقف ألومنيوم (صالة)', lengthCm: 350, qty: 1, prepared: true },
      { name: 'ماسورة استيل مذهبة 25مم (نوم)', lengthCm: 220, qty: 1, prepared: false },
    ],
  },
  {
    id: 'ACC-102',
    orderId: 'ORD-003',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    address: 'مصر الجديدة',
    status: 'تم تجهيز الحقيبة بالكامل',
    trackItems: [
      { name: 'ماسورة استيل مذهبة 25مم', lengthCm: 200, qty: 2, prepared: true },
    ],
  }
];

export default function PipelineAccessoriesPage() {
  const [kits, setKits] = useState<AccessoryKit[]>(initialKits);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  const isSent = (status: AccessoryKit['status']) => status === 'تم تجهيز الحقيبة بالكامل';

  const tabFiltered = kits.filter(k => activeTab === 'OPEN' ? !isSent(k.status) : isSent(k.status));
  const filtered = tabFiltered.filter(k =>
    k.customerName.includes(searchQuery) || k.id.includes(searchQuery)
  );

  const toggleTrack = (kitId: string, idx: number) => {
    setKits(prev => prev.map(k => {
      if (k.id !== kitId) return k;
      const updated = [...k.trackItems];
      updated[idx].prepared = !updated[idx].prepared;
      return { ...k, trackItems: updated };
    }));
  };

  const markCompleted = (kitId: string) => {
    setKits(prev => prev.map(k => k.id === kitId ? { ...k, status: 'تم تجهيز الحقيبة بالكامل' } : k));
  };

  const openCount = kits.filter(k => !isSent(k.status)).length;
  const sentCount = kits.filter(k => isSent(k.status)).length;

  return (
    <PageShell title="المرحلة 5: الإكسسوارات">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              المرحلة 5
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">الإكسسوارات</h1>
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
            <span>الحقائب قيد التجهيز</span>
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
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>سجل الحقائب المكتملة</span>
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
              {activeTab === 'OPEN' ? 'لا توجد حقائب قيد التجهيز' : 'السجل فارغ'}
            </h3>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(kit => (
              <div key={kit.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">{kit.id} • {kit.orderId}</span>
                    <h3 className="font-bold text-base text-slate-900">{kit.customerName}</h3>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    kit.status === 'تم تجهيز الحقيبة بالكامل' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                  }`}>
                    {kit.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs mb-4">
                  {kit.trackItems.map((item, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input type="checkbox" checked={item.prepared} onChange={() => toggleTrack(kit.id, i)} className="rounded" />
                      <span className={item.prepared ? 'line-through text-slate-400' : 'font-bold text-slate-800'}>
                        {item.name} ({item.lengthCm} سم)
                      </span>
                    </label>
                  ))}
                </div>

                {activeTab === 'OPEN' && (
                  <button
                    onClick={() => markCompleted(kit.id)}
                    className="w-full bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl text-xs font-bold shadow-gold"
                  >
                    ✓ تأكيد اكتمال الحقيبة وجاهزية التركيب
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
