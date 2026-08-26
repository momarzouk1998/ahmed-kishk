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
  },
  {
    id: 'QOT-103',
    inspectionId: 'INS-003',
    customerName: 'شركة المعمار',
    phone: '01155556666',
    address: 'المهندسين، شارع البطل',
    status: 'تم التحويل للورشة',
    totalAmount: 28400,
    depositPaid: 18400,
    remainingAmount: 10000,
    date: '2026-08-24',
    rooms: []
  },
  {
    id: 'QOT-104',
    inspectionId: 'INS-004',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    address: 'مصر الجديدة',
    status: 'تم التحويل للورشة',
    totalAmount: 7800,
    depositPaid: 7800,
    remainingAmount: 0,
    date: '2026-08-23',
    rooms: []
  }
];

export default function PipelinePricingPage() {
  const [quotations, setQuotations] = useState<QuotationOrder[]>(initialQuotations);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [selectedId, setSelectedId] = useState<string>('QOT-101');
  const [searchQuery, setSearchQuery] = useState('');

  const isSent = (status: QuotationOrder['status']) => status === 'تم التحويل للورشة';

  const tabFiltered = quotations.filter(q => activeTab === 'OPEN' ? !isSent(q.status) : isSent(q.status));
  const filtered = tabFiltered.filter(q =>
    q.customerName.includes(searchQuery) || q.phone.includes(searchQuery) || q.id.includes(searchQuery)
  );

  const selected = filtered.find(q => q.id === selectedId) || filtered[0] || quotations[0];

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
    setQuotations(prev => prev.map(q => q.id === selected.id ? { ...q, status: 'تم التحويل للورشة' } : q));
    alert('تم اعتماد العقد وتحويل أمر التشغيل إلى الورشة وقفل المقاسات بنجاح.');
  };

  const openCount = quotations.filter(q => !isSent(q.status)).length;
  const sentCount = quotations.filter(q => isSent(q.status)).length;

  return (
    <PageShell title="المرحلة 2: التسعير والعقد">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              المرحلة 2
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">التسعير والعقد</h1>
          </div>
          <button onClick={() => window.print()} className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs">
            <span className="material-symbols-outlined text-[16px]">print</span>
            طباعة المقايسة
          </button>
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
            <span className="material-symbols-outlined text-[18px]">request_quote</span>
            <span>بانتظار التسعير والعقد</span>
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
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            <span>سجل العقود المحولة للورشة (جدول)</span>
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
            placeholder="بحث سريع بالاسم، الهاتف، كود الطلب..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد طلبات بانتظار التسعير حالياً' : 'سجل العقود المحولة فارغ'}
            </h3>
          </div>
        ) : activeTab === 'SENT' ? (
          /* TAB 2: Clean Data Table for History */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">كود العقد</th>
                    <th className="p-3.5">كود المعاينة</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">الهاتف</th>
                    <th className="p-3.5">العنوان</th>
                    <th className="p-3.5 text-left font-mono">الإجمالي</th>
                    <th className="p-3.5 text-left font-mono">المدفوع (عربون)</th>
                    <th className="p-3.5 text-left font-mono">المتبقي</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(q => (
                    <tr key={q.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-brand-gold-dark">{q.id}</td>
                      <td className="p-3.5 font-mono text-slate-500">{q.inspectionId}</td>
                      <td className="p-3.5 font-bold text-slate-900">{q.customerName}</td>
                      <td className="p-3.5 font-mono text-slate-600" dir="ltr">{q.phone}</td>
                      <td className="p-3.5 text-slate-600">{q.address}</td>
                      <td className="p-3.5 text-left font-mono font-black text-slate-900">{q.totalAmount.toLocaleString()} ج</td>
                      <td className="p-3.5 text-left font-mono font-bold text-emerald-800">{q.depositPaid.toLocaleString()} ج</td>
                      <td className="p-3.5 text-left font-mono font-bold text-rose-700">{q.remainingAmount.toLocaleString()} ج</td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1: Active Pricing Working Split View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              {filtered.map(q => (
                <div
                  key={q.id}
                  onClick={() => setSelectedId(q.id)}
                  className={`p-4 rounded-2xl border bg-white cursor-pointer transition-all ${
                    q.id === selected?.id ? 'border-brand-gold ring-2 ring-brand-gold/30 shadow-md' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-brand-gold-dark">{q.id}</span>
                      <h3 className="font-bold text-sm text-slate-900">{q.customerName}</h3>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      q.status === 'معتمد ومسدد العربون' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {q.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                    <span className="text-slate-500" dir="ltr">{q.phone}</span>
                    <span className="font-black text-slate-900">{q.totalAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>
              ))}
            </div>

            {selected && (
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-soft space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-mono font-bold text-brand-gold-dark">{selected.id} • {selected.inspectionId}</span>
                    <h2 className="font-bold text-xl text-slate-900">{selected.customerName}</h2>
                    <p className="text-xs text-slate-500" dir="ltr">{selected.phone} | {selected.address}</p>
                  </div>

                  <button
                    onClick={handleSendToWorkshop}
                    className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-gold flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">precision_manufacturing</span>
                    تحويل للورشة (بدء القص) ←
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">إجمالي العقد</span>
                    <span className="font-mono font-black text-lg text-slate-900 mt-0.5 block">{selected.totalAmount.toLocaleString()} ج</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[11px] text-emerald-800 font-bold block">العربون</span>
                    <span className="font-mono font-black text-lg text-emerald-900 mt-0.5 block">{selected.depositPaid.toLocaleString()} ج</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[11px] text-amber-800 font-bold block">المتبقي</span>
                    <span className="font-mono font-black text-lg text-amber-900 mt-0.5 block">{selected.remainingAmount.toLocaleString()} ج</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-gold text-[20px]">payments</span>
                    <span>سداد دفعة العربون (حجز المخزون آلياً):</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={selected.depositPaid}
                      onChange={(e) => handleDepositChange(Number(e.target.value))}
                      className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono font-black text-center"
                    />
                    <span className="font-bold text-brand-gold">ج.م</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
