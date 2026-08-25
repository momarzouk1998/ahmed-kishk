'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface RoomPricing {
  id: string;
  name: string;
  type: string;
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  ceilingType: string;
  sheerMeters: number;
  sheerPrice: number;
  heavyMeters: number;
  heavyPrice: number;
  blackoutMeters: number;
  blackoutPrice: number;
  trackPrice: number;
  tapePrice: number;
  tailorPricePerSide: number;
  installFee: number;
  totalCost: number;
  totalSellPrice: number;
}

interface QuotationOrder {
  id: string;
  inspectionId: string;
  customerName: string;
  phone: string;
  address: string;
  status: 'بانتظار التسعير' | 'تم إرسال المقايسة' | 'معتمد ومسدد العربون' | 'تم التحويل للورشة';
  totalAmount: number;
  depositPaid: number;
  remainingAmount: number;
  date: string;
  rooms: RoomPricing[];
}

const initialQuotations: QuotationOrder[] = [
  {
    id: 'QOT-101',
    inspectionId: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    status: 'معتمد ومسدد العربون',
    totalAmount: 12600,
    depositPaid: 7000,
    remainingAmount: 5600,
    date: '2026-08-25',
    rooms: [
      {
        id: 'r1',
        name: 'الصالة الرئيسية (بلكونة)',
        type: 'بلكونة',
        widthCm: 350,
        heightCm: 280,
        sides: 2,
        installationType: 'مجرى سقف تراك ألومنيوم',
        ceilingType: 'جيبسون بورد',
        sheerMeters: 8.75,
        sheerPrice: 160,
        heavyMeters: 6.30,
        heavyPrice: 380,
        blackoutMeters: 0,
        blackoutPrice: 0,
        trackPrice: 297,
        tapePrice: 270,
        tailorPricePerSide: 150,
        installFee: 200,
        totalCost: 4860,
        totalSellPrice: 7500,
      },
      {
        id: 'r2',
        name: 'غرفة النوم الرئيسية',
        type: 'شباك',
        widthCm: 200,
        heightCm: 260,
        sides: 2,
        installationType: 'مواسير استيل مذهبة',
        ceilingType: 'سقف عادي',
        sheerMeters: 4.40,
        sheerPrice: 180,
        heavyMeters: 0,
        heavyPrice: 0,
        blackoutMeters: 2.60,
        blackoutPrice: 280,
        trackPrice: 320,
        tapePrice: 126,
        tailorPricePerSide: 120,
        installFee: 150,
        totalCost: 2850,
        totalSellPrice: 5100,
      }
    ]
  },
  {
    id: 'QOT-102',
    inspectionId: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، بيفرلي هيلز',
    status: 'بانتظار التسعير',
    totalAmount: 0,
    depositPaid: 0,
    remainingAmount: 0,
    date: '2026-08-25',
    rooms: []
  }
];

export default function PipelinePricingPage() {
  const [quotations, setQuotations] = useState<QuotationOrder[]>(initialQuotations);
  const [selectedId, setSelectedId] = useState<string>('QOT-101');
  const [filter, setFilter] = useState('الكل');

  const selected = quotations.find(q => q.id === selectedId) || quotations[0];

  const handleDepositChange = (amount: number) => {
    setQuotations(prev => prev.map(q => {
      if (q.id !== selected.id) return q;
      const deposit = Math.min(amount, q.totalAmount);
      return {
        ...q,
        depositPaid: deposit,
        remainingAmount: q.totalAmount - deposit,
        status: deposit > 0 ? 'معتمد ومسدد العربون' : q.status,
      };
    }));
  };

  const handleSendToWorkshop = () => {
    if (selected.depositPaid <= 0) {
      if (!confirm('تنبيه: لم يتم تسجيل سداد عربون لهذا الطلب. هل تريد بالتأكيد تحويل الطلب للورشة وبدء القص؟')) {
        return;
      }
    }
    setQuotations(prev => prev.map(q => q.id === selected.id ? { ...q, status: 'تم التحويل للورشة' } : q));
    alert('تم اعتماد العقد وتحويل أمر التشغيل بنجاح إلى (3. الورشة - القص وتجهيز القماش). تم قفل المقاسات لحمايتها.');
  };

  return (
    <PageShell title="المرحلة 2: التسعير والعقد واعتماد العربون">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
              المرحلة الثانية • المبيعات والكاشير
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900">التسعير الذكي وعقود الستائر والعربون</h1>
            <p className="text-slate-500 text-sm mt-0.5">حساب التكاليف والأرباح بناءً على مقاسات الفني، طباعة المقايسة، وتحصيل العربون وحجز المخزون.</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs">
              <span className="material-symbols-outlined text-[16px]">print</span>
              طباعة العقد والمقايسة
            </button>
          </div>
        </div>

        {/* Master Detail Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {quotations.map(q => (
              <div
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                className={`p-5 rounded-2xl border bg-white cursor-pointer transition-all ${
                  q.id === selected.id ? 'border-brand-gold ring-2 ring-brand-gold/30 shadow-md' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{q.id} • {q.inspectionId}</span>
                    <h3 className="font-bold text-base text-slate-900">{q.customerName}</h3>
                    <p className="text-xs text-slate-500 font-mono" dir="ltr">{q.phone}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    q.status === 'معتمد ومسدد العربون' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    : q.status === 'تم التحويل للورشة' ? 'bg-purple-100 text-purple-900 border-purple-200'
                    : 'bg-amber-100 text-amber-900 border-amber-200'
                  }`}>
                    {q.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">{q.rooms.length} غرف مسعرة</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{q.totalAmount.toLocaleString()} ج.م</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-soft">
            <div className="flex justify-between items-start pb-5 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-brand-gold-dark">{selected.id} • {selected.inspectionId}</span>
                <h2 className="font-bold text-2xl text-slate-900">{selected.customerName}</h2>
                <p className="text-xs text-slate-500" dir="ltr">{selected.phone} | {selected.address}</p>
              </div>

              <button
                onClick={handleSendToWorkshop}
                className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs shadow-gold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
                تحويل لأمر تشغيل بالورشة (بدء القص) ←
              </button>
            </div>

            {/* Financial Summary Box */}
            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-bold block">إجمالي قيمة العقد:</span>
                <span className="font-mono font-black text-2xl text-slate-900 mt-1 block">{selected.totalAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-xs text-emerald-800 font-bold block">العربون المسدد:</span>
                <span className="font-mono font-black text-2xl text-emerald-900 mt-1 block">{selected.depositPaid.toLocaleString()} ج.م</span>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                <span className="text-xs text-amber-800 font-bold block">المتبقي عند التركيب:</span>
                <span className="font-mono font-black text-2xl text-amber-900 mt-1 block">{selected.remainingAmount.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Deposit Payment Action */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-gold text-[24px]">payments</span>
                <div>
                  <div className="font-bold text-sm">تسجيل دفعة العربون / المقدم</div>
                  <div className="text-xs text-slate-400">حجز القماش آلياً من المخزن فور تسجيل العربون</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={selected.depositPaid}
                  onChange={(e) => handleDepositChange(Number(e.target.value))}
                  className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-black text-center"
                />
                <span className="text-xs font-bold text-brand-gold">ج.م</span>
              </div>
            </div>

            {/* Breakdown per Room */}
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">تفاصيل تسعير الغرف المحسوبة من المقاسات:</h3>
              {selected.rooms.map(r => (
                <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-base text-slate-900">{r.name}</h4>
                    <span className="font-mono font-black text-slate-900 text-base">{r.totalSellPrice.toLocaleString()} ج.م</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    المقاس: {r.widthCm}سم عرض × {r.heightCm}سم ارتفاع • {r.installationType} • {r.ceilingType}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200 font-mono">
                    <div>تول: <strong>{r.sheerMeters}م</strong> × {r.sheerPrice}ج</div>
                    <div>ثقيل: <strong>{r.heavyMeters}م</strong> × {r.heavyPrice}ج</div>
                    <div>تراك ومواسير: <strong>{r.trackPrice}ج</strong></div>
                    <div>تفصيل وتركيب: <strong>{(r.tailorPricePerSide * r.sides) + r.installFee}ج</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
