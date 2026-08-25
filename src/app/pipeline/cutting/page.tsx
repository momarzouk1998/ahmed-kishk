'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface CuttingItem {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  roomName: string;
  dimensions: string;
  fabricName: string;
  fabricCode: string;
  requiredMeters: number;
  cutMeters: number;
  status: 'بانتظار القص' | 'تم استلام القماش' | 'تم القص وجاهز للخياطة';
  cutterName: string;
  notes: string;
}

const initialItems: CuttingItem[] = [
  {
    id: 'CUT-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'الصالة الرئيسية (بلكونة)',
    dimensions: 'عرض 350سم × ارتفاع 280سم (جنبين)',
    fabricName: 'تول خفيف مطرز',
    fabricCode: 'T-402',
    requiredMeters: 8.75,
    cutMeters: 8.75,
    status: 'تم القص وجاهز للخياطة',
    cutterName: 'عم مصطفى',
    notes: 'قص قطعتين متساويتين كل قطعة 4.40 متر تقريباً',
  },
  {
    id: 'CUT-102',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'الصالة الرئيسية (بلكونة)',
    dimensions: 'عرض 350سم × ارتفاع 280سم (جنبين)',
    fabricName: 'قطيفة تركي ثقيل',
    fabricCode: 'V-990',
    requiredMeters: 6.30,
    cutMeters: 0,
    status: 'بانتظار القص',
    cutterName: 'عم مصطفى',
    notes: 'مراعاة اتجاه وبَر القطيفة للأسفل في الجنبين',
  },
  {
    id: 'CUT-103',
    orderId: 'ORD-002',
    customerName: 'شركة المعمار',
    phone: '01155556666',
    roomName: 'قاعة الاجتماعات',
    dimensions: 'عرض 500سم × ارتفاع 300سم (3 شبابيك)',
    fabricName: 'بلاك آوت عازل ضوء 100%',
    fabricCode: 'BL-900',
    requiredMeters: 16.00,
    cutMeters: 16.00,
    status: 'تم القص وجاهز للخياطة',
    cutterName: 'أحمد شحاتة',
    notes: 'قص 3 شبابيك متساوية',
  }
];

export default function PipelineCuttingPage() {
  const [items, setItems] = useState<CuttingItem[]>(initialItems);
  const [filter, setFilter] = useState('الكل');

  const filtered = filter === 'الكل' ? items : items.filter(i => i.status === filter);

  const updateItemStatus = (id: string, newStatus: CuttingItem['status']) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };

  return (
    <PageShell title="المرحلة 3: الورشة - القص وتجهيز القماش">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
              المرحلة الثالثة • قسم القص وتجهيز الأثواب
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900">أوامر القص وسحب الأقمشة من المخزن</h1>
            <p className="text-slate-500 text-sm mt-0.5">استلام أثواب القماش المحجوزة، قص الأمتار المحددة لكل غرفة، والتجهيز لقسم الخياطة.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['الكل', 'بانتظار القص', 'تم استلام القماش', 'تم القص وجاهز للخياطة'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                filter === f ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{item.id} • {item.orderId}</span>
                    <h3 className="font-bold text-base text-slate-900">{item.customerName}</h3>
                    <p className="text-xs text-brand-gold-dark font-bold">{item.roomName}</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    item.status === 'تم القص وجاهز للخياطة' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    : item.status === 'تم استلام القماش' ? 'bg-blue-100 text-blue-900 border-blue-200'
                    : 'bg-amber-100 text-amber-900 border-amber-200'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl my-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">الخامة والكود:</span>
                    <span className="font-bold text-slate-900">{item.fabricName} ({item.fabricCode})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">المقاسات:</span>
                    <span className="font-bold font-mono text-slate-800">{item.dimensions}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">المطلوب قصه:</span>
                    <span className="font-mono font-black text-amber-700 text-sm">{item.requiredMeters} متر</span>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-amber-950 bg-amber-50 p-2 rounded-lg border border-amber-200 mb-3">
                    <strong>تعليمات القص:</strong> {item.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {item.status === 'بانتظار القص' && (
                  <button
                    onClick={() => updateItemStatus(item.id, 'تم استلام القماش')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    استلام الثوب من المخزن
                  </button>
                )}
                {item.status === 'تم استلام القماش' && (
                  <button
                    onClick={() => updateItemStatus(item.id, 'تم القص وجاهز للخياطة')}
                    className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2 rounded-xl text-xs font-bold shadow-gold transition-all"
                  >
                    تأكيد القص والتحويل للخياطة ←
                  </button>
                )}
                {item.status === 'تم القص وجاهز للخياطة' && (
                  <div className="flex-1 text-center py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                    ✓ تم إرسال القطعة لقسم الخياطة
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
