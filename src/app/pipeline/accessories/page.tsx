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
  brackets: { name: string; qty: number; prepared: boolean }[];
  hooks: { name: string; qty: number; prepared: boolean }[];
  status: 'بانتظار التجهيز' | 'قيد التجميع والقص' | 'تم تجهيز الحقيبة بالكامل';
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
    brackets: [
      { name: 'حوامل سقف جبسون بورد فراشة', qty: 6, prepared: true },
      { name: 'كوابيل حائط استيل مذهبة', qty: 3, prepared: false },
    ],
    hooks: [
      { name: 'شناكل إيطالي بلاستيك مرن', qty: 45, prepared: true },
      { name: 'طبات مواسير استيل نهاية', qty: 2, prepared: false },
    ]
  }
];

export default function PipelineAccessoriesPage() {
  const [kits, setKits] = useState<AccessoryKit[]>(initialKits);

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

  return (
    <PageShell title="المرحلة 5: تجهيز التراكات والإكسسوارات">
      <div className="flex flex-col gap-6">
        <div>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
            المرحلة الخامسة • قسم الإكسسوارات والمواسير
          </span>
          <h1 className="font-display font-black text-2xl text-slate-900">قص وتجهيز التراكات وحقيبة إكسسوارات التركيب</h1>
          <p className="text-slate-500 text-sm mt-0.5">تجهيز أطوال مجاري السقف، قص المواسير، تجميع الحوامل والشناكل والكوابيل لكل عميل.</p>
        </div>

        <div className="space-y-4">
          {kits.map(kit => (
            <div key={kit.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400">{kit.id} • {kit.orderId}</span>
                  <h3 className="font-bold text-lg text-slate-900">{kit.customerName}</h3>
                  <p className="text-xs text-slate-500">{kit.address} | {kit.phone}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                  kit.status === 'تم تجهيز الحقيبة بالكامل' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                }`}>
                  {kit.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                {/* Tracks */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-xs text-slate-900 mb-2">1. التراكات والمواسير:</h4>
                  <div className="space-y-2 text-xs">
                    {kit.trackItems.map((item, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={item.prepared} onChange={() => toggleTrack(kit.id, i)} className="rounded" />
                        <span className={item.prepared ? 'line-through text-slate-400' : 'font-bold text-slate-800'}>
                          {item.name} ({item.lengthCm} سم)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brackets */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-xs text-slate-900 mb-2">2. الكوابيل والحوامل:</h4>
                  <div className="space-y-2 text-xs">
                    {kit.brackets.map((item, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>{item.name}</span>
                        <strong className="font-mono">{item.qty} قطع</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hooks */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-xs text-slate-900 mb-2">3. الشناكل والطبات:</h4>
                  <div className="space-y-2 text-xs">
                    {kit.hooks.map((item, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>{item.name}</span>
                        <strong className="font-mono">{item.qty} قطع</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => markCompleted(kit.id)}
                  className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-5 py-2 rounded-xl text-xs font-bold shadow-gold"
                >
                  ✓ تأكيد اكتمال الحقيبة وجاهزية التركيب
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
