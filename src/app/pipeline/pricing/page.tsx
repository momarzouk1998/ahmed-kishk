'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import ContractPrintModal, { PrintContractData } from '@/components/ContractPrintModal';

interface InventoryFabric {
  id: string;
  code: string;
  name: string;
  category: 'شيفون / تول' | 'قطيفة / ثقيل' | 'بلاك آوت عازل' | 'كتان / درابيري';
  pricePerMeter: number;
  stockMeters: number;
}

const mockFabricsInventory: InventoryFabric[] = [
  { id: 'f1', code: 'SH-101', name: 'شيفون حرير فاخر (أبيض سادة)', category: 'شيفون / تول', pricePerMeter: 160, stockMeters: 250 },
  { id: 'f2', code: 'SH-102', name: 'تول مطرز كريستال تركيات', category: 'شيفون / تول', pricePerMeter: 220, stockMeters: 180 },
  { id: 'f3', code: 'HV-201', name: 'قطيفة جاجوار تركيات (درجات البيج)', category: 'قطيفة / ثقيل', pricePerMeter: 380, stockMeters: 320 },
  { id: 'f4', code: 'HV-202', name: 'قطيفة شانيل كابوتونيه فاخر', category: 'قطيفة / ثقيل', pricePerMeter: 450, stockMeters: 140 },
  { id: 'f5', code: 'BK-301', name: 'بلاك آوت عازل حراري ومائي (ثلاثي)', category: 'بلاك آوت عازل', pricePerMeter: 250, stockMeters: 210 },
  { id: 'f6', code: 'LN-401', name: 'كتان إسباني مدرج ألوان هادئة', category: 'كتان / درابيري', pricePerMeter: 310, stockMeters: 95 },
];

export interface RoomPricing {
  id: string;
  name: string;
  type: string;
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  ceilingType: string;
  // Selected Fabric items
  sheerFabricCode?: string;
  sheerFabricName?: string;
  sheerMeters: number;
  sheerPrice: number;
  heavyFabricCode?: string;
  heavyFabricName?: string;
  heavyMeters: number;
  heavyPrice: number;
  blackoutFabricCode?: string;
  blackoutFabricName?: string;
  blackoutMeters: number;
  blackoutPrice: number;
  trackMeters: number;
  trackPrice: number;
  tapeMeters: number;
  tapePrice: number;
  tailorPricePerSide: number;
  installFee: number;
  totalSellPrice: number;
}

export interface QuotationOrder {
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
  estimatorName: string;
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
    estimatorName: 'أحمد كشك',
    rooms: [
      {
        id: 'r1',
        name: 'الصالة الرئيسية (بلكونة)',
        type: 'بلكونة',
        widthCm: 350,
        heightCm: 280,
        sides: 2,
        installationType: 'مجرى سقف (تراك ألومنيوم)',
        ceilingType: 'جيبسون بورد / بيت نور',
        sheerFabricCode: 'SH-101',
        sheerFabricName: 'شيفون حرير فاخر (أبيض سادة)',
        sheerMeters: 8.75,
        sheerPrice: 160,
        heavyFabricCode: 'HV-201',
        heavyFabricName: 'قطيفة جاجوار تركيات (درجات البيج)',
        heavyMeters: 7.0,
        heavyPrice: 380,
        blackoutMeters: 0,
        blackoutPrice: 0,
        trackMeters: 3.5,
        trackPrice: 120,
        tapeMeters: 8.75,
        tapePrice: 40,
        tailorPricePerSide: 150,
        installFee: 200,
        totalSellPrice: 12600,
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
    estimatorName: 'أحمد كشك',
    rooms: [
      {
        id: 'r2',
        name: 'غرفة النوم الرئيسية',
        type: 'شباك',
        widthCm: 250,
        heightCm: 270,
        sides: 2,
        installationType: 'مواسير استيل مذهبة',
        ceilingType: 'سقف عادي خرسانة',
        sheerFabricCode: 'SH-102',
        sheerFabricName: 'تول مطرز كريستال تركيات',
        sheerMeters: 6.25,
        sheerPrice: 220,
        heavyFabricCode: 'HV-202',
        heavyFabricName: 'قطيفة شانيل كابوتونيه فاخر',
        heavyMeters: 5.0,
        heavyPrice: 450,
        blackoutFabricCode: 'BK-301',
        blackoutFabricName: 'بلاك آوت عازل حراري ومائي (ثلاثي)',
        blackoutMeters: 3.75,
        blackoutPrice: 250,
        trackMeters: 2.5,
        trackPrice: 120,
        tapeMeters: 6.25,
        tapePrice: 40,
        tailorPricePerSide: 150,
        installFee: 150,
        totalSellPrice: 0,
      }
    ]
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
    estimatorName: 'أحمد كشك',
    rooms: []
  }
];

export default function PipelinePricingPage() {
  const [quotations, setQuotations] = useState<QuotationOrder[]>(initialQuotations);
  const [inventory] = useState<InventoryFabric[]>(mockFabricsInventory);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [selectedId, setSelectedId] = useState<string>('QOT-101');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Contract Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Selected Quotation Details
  const isSent = (status: QuotationOrder['status']) => status === 'تم التحويل للورشة';

  const tabFiltered = quotations.filter(q => activeTab === 'OPEN' ? !isSent(q.status) : isSent(q.status));
  const filtered = tabFiltered.filter(q =>
    q.customerName.includes(searchQuery) || q.phone.includes(searchQuery) || q.id.includes(searchQuery)
  );

  const selected = filtered.find(q => q.id === selectedId) || filtered[0] || quotations[0];

  // Active pricing editor state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Selected Fabrics state for editing room
  const [sheerCode, setSheerCode] = useState<string>('');
  const [sheerP, setSheerP] = useState<number>(160);

  const [heavyCode, setHeavyCode] = useState<string>('');
  const [heavyP, setHeavyP] = useState<number>(380);

  const [blackoutCode, setBlackoutCode] = useState<string>('');
  const [blackoutP, setBlackoutP] = useState<number>(250);

  const [trackP, setTrackP] = useState<number>(120);
  const [tapeP, setTapeP] = useState<number>(40);
  const [tailorP, setTailorP] = useState<number>(150);
  const [installF, setInstallF] = useState<number>(200);
  const [estimator, setEstimator] = useState<string>('أحمد كشك');

  const startPricingRoom = (room: RoomPricing) => {
    setEditingRoomId(room.id);
    setSheerCode(room.sheerFabricCode || 'SH-101');
    setSheerP(room.sheerPrice || 160);

    setHeavyCode(room.heavyFabricCode || 'HV-201');
    setHeavyP(room.heavyPrice || 380);

    setBlackoutCode(room.blackoutFabricCode || '');
    setBlackoutP(room.blackoutPrice || 250);

    setTrackP(room.trackPrice || 120);
    setTapeP(room.tapePrice || 40);
    setTailorP(room.tailorPricePerSide || 150);
    setInstallF(room.installFee || 200);
  };

  const handleFabricSelect = (layer: 'sheer' | 'heavy' | 'blackout', code: string) => {
    const fab = inventory.find(f => f.code === code);
    if (!fab) return;

    if (layer === 'sheer') {
      setSheerCode(code);
      setSheerP(fab.pricePerMeter);
    } else if (layer === 'heavy') {
      setHeavyCode(code);
      setHeavyP(fab.pricePerMeter);
    } else if (layer === 'blackout') {
      setBlackoutCode(code);
      setBlackoutP(fab.pricePerMeter);
    }
  };

  const saveRoomPricing = (roomId: string) => {
    if (!selected) return;

    const sheerFab = inventory.find(f => f.code === sheerCode);
    const heavyFab = inventory.find(f => f.code === heavyCode);
    const blackoutFab = inventory.find(f => f.code === blackoutCode);

    setQuotations(prev => prev.map(q => {
      if (q.id !== selected.id) return q;

      const updatedRooms = q.rooms.map(rm => {
        if (rm.id !== roomId) return rm;

        const sheerCost = rm.sheerMeters * sheerP;
        const heavyCost = rm.heavyMeters * heavyP;
        const blackoutCost = (blackoutCode ? rm.blackoutMeters : 0) * blackoutP;
        const trackCost = rm.trackMeters * trackP;
        const tapeCost = rm.tapeMeters * tapeP;
        const tailorCost = rm.sides * tailorP;
        const total = sheerCost + heavyCost + blackoutCost + trackCost + tapeCost + tailorCost + installF;

        return {
          ...rm,
          sheerFabricCode: sheerCode,
          sheerFabricName: sheerFab?.name || 'شيفون حرير فاخر',
          sheerPrice: sheerP,
          heavyFabricCode: heavyCode,
          heavyFabricName: heavyFab?.name || 'قطيفة جاجوار تركيات',
          heavyPrice: heavyP,
          blackoutFabricCode: blackoutCode,
          blackoutFabricName: blackoutFab ? blackoutFab.name : (blackoutCode ? 'بلاك آوت عازل' : undefined),
          blackoutPrice: blackoutCode ? blackoutP : 0,
          trackPrice: trackP,
          tapePrice: tapeP,
          tailorPricePerSide: tailorP,
          installFee: installF,
          totalSellPrice: Math.round(total),
        };
      });

      const totalSum = updatedRooms.reduce((sum, r) => sum + r.totalSellPrice, 0);

      return {
        ...q,
        rooms: updatedRooms,
        totalAmount: totalSum,
        remainingAmount: totalSum - q.depositPaid,
        estimatorName: estimator,
        status: q.status === 'بانتظار التسعير' ? 'تم إرسال المقايسة' : q.status,
      };
    }));

    setEditingRoomId(null);
    alert('تم حفظ اختيار الأقمشة وتحديث تسعير الغرفة بنجاح.');
  };

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
    if (selected.totalAmount === 0) {
      alert('الرجاء اختيار الأقمشة وتسعير غرف العميل أولاً قبل تحويل العقد للورشة');
      return;
    }
    setQuotations(prev => prev.map(q => q.id === selected.id ? { ...q, status: 'تم التحويل للورشة' } : q));
    alert('تم اعتماد العقد بنجاح وتحويل أمر الشراء والتشغيل إلى الورشة (المرحلة 3: القص والتفصيل).');
  };

  const openCount = quotations.filter(q => !isSent(q.status)).length;
  const sentCount = quotations.filter(q => isSent(q.status)).length;

  return (
    <PageShell title="المرحلة 2: اختيار القماش والتسعير">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              المرحلة 2
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">اختيار القماش والتسعير والعقد</h1>
          </div>

          {selected && selected.totalAmount > 0 && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              معاينة وطباعة العقد (PDF)
            </button>
          )}
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
            <span className="material-symbols-outlined text-[18px]">texture</span>
            <span>بانتظار اختيار القماش والعقد</span>
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
            <span className="material-symbols-outlined text-[18px]">content_cut</span>
            <span>سجل العقود المحولة للورشة</span>
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
            placeholder="بحث سريع بالاسم، الهاتف، كود المعاينة..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد طلبات بانتظار اختيار القماش والتسعير' : 'سجل العقود المحولة فارغ'}
            </h3>
          </div>
        ) : activeTab === 'SENT' ? (
          /* TAB 2: Clean Data Table for History */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">كود العقد</th>
                    <th className="p-3.5">كود المعاينة</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">الهاتف</th>
                    <th className="p-3.5">العنوان</th>
                    <th className="p-3.5 text-left font-mono">الإجمالي</th>
                    <th className="p-3.5 text-left font-mono">العربون المدفوع</th>
                    <th className="p-3.5 text-left font-mono">المتبقي</th>
                    <th className="p-3.5">مسؤول المبيعات</th>
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
                      <td className="p-3.5 font-bold text-slate-800">{q.estimatorName}</td>
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
          /* TAB 1: Active Pricing & Fabric Selection Split View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Sidebar list of quotation orders */}
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              {filtered.map(q => (
                <div
                  key={q.id}
                  onClick={() => { setSelectedId(q.id); setEditingRoomId(null); }}
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
                      q.status === 'معتمد ومسدد العربون' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      : q.status === 'تم إرسال المقايسة' ? 'bg-blue-100 text-blue-900 border-blue-200'
                      : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {q.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                    <span className="text-slate-500" dir="ltr">{q.phone}</span>
                    <span className="font-black text-slate-900">{q.totalAmount.toLocaleString()} جنيه</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Quotation Form Panel */}
            {selected && (
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-soft space-y-5">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-mono font-bold text-brand-gold-dark">{selected.id} • معاينة رقم {selected.inspectionId}</span>
                    <h2 className="font-bold text-xl text-slate-900">{selected.customerName}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selected.phone} | {selected.address}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">مسؤول المبيعات:</label>
                    <input
                      value={estimator}
                      onChange={e => setEstimator(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-32 bg-slate-50 font-bold"
                      placeholder="أحمد كشك"
                    />
                  </div>
                </div>

                {/* Financial Summary Cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">إجمالي المقايسة</span>
                    <span className="font-mono font-black text-lg text-slate-900 mt-0.5 block">{selected.totalAmount.toLocaleString()} ج</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[11px] text-emerald-800 font-bold block">العربون المدفوع</span>
                    <span className="font-mono font-black text-lg text-emerald-900 mt-0.5 block">{selected.depositPaid.toLocaleString()} ج</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[11px] text-rose-800 font-bold block">المتبقي للتحصيل</span>
                    <span className="font-mono font-black text-lg text-rose-900 mt-0.5 block">{selected.remainingAmount.toLocaleString()} ج</span>
                  </div>
                </div>

                {/* Deposit payment & Stock reservation */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
                  <div>
                    <h3 className="font-bold text-sm text-brand-gold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      سداد العربون وحجز أقمشة المخزن تلقائياً
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">أدخل قيمة العربون لاعتماد العقد وحجز أمتار القماش من مخزون المؤسسة.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={selected.depositPaid || ''}
                      onChange={(e) => handleDepositChange(Number(e.target.value))}
                      className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-black text-center text-sm"
                      placeholder="مبلغ العربون"
                    />
                    <span className="font-bold text-brand-gold">جنيه</span>
                  </div>
                </div>

                {/* Rooms Pricing & Fabric Selection List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-brand-gold text-[20px]">texture</span>
                      اختيار الأقمشة وتكلفة غرف العميل
                    </h3>
                  </div>

                  {selected.rooms.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 border rounded-xl">لا توجد غرف مسجلة بهذه المعاينة.</p>
                  ) : (
                    selected.rooms.map((room) => {
                      const isEditing = editingRoomId === room.id;

                      return (
                        <div key={room.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                          {/* Room Header */}
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{room.name}</h4>
                              <p className="text-[11px] text-slate-500 font-mono">
                                عرض {room.widthCm}سم × ارتفاع {room.heightCm}سم • {room.sides === 2 ? 'جنبين' : 'جنب واحد'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block">إجمالي تكلفة الغرفة</span>
                              <strong className="text-sm font-black text-brand-gold-dark font-mono">{room.totalSellPrice.toLocaleString()} جنيه</strong>
                            </div>
                          </div>

                          {/* Editing Form: Fabric Selection & Pricing */}
                          {isEditing ? (
                            <div className="bg-white p-4 rounded-xl border border-brand-gold space-y-4">
                              <h5 className="text-xs font-black text-slate-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-brand-gold text-[16px]">tune</span>
                                تحديد أقمشة المخزن والتكلفة الدقيقة للغرفة:
                              </h5>

                              {/* 1. Sheer Layer Selection */}
                              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <label className="font-bold text-slate-800">1. القماش الشفاف (الشيفون / التول):</label>
                                  <span className="font-mono text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded">
                                    الأمتار المطلوبة: {room.sheerMeters} متر
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  <select
                                    value={sheerCode}
                                    onChange={e => handleFabricSelect('sheer', e.target.value)}
                                    className="sm:col-span-2 border border-slate-200 rounded-lg p-2 bg-white font-bold text-slate-900"
                                  >
                                    <option value="">-- اختر القماش الشفاف من المخزون --</option>
                                    {inventory.filter(f => f.category === 'شيفون / تول').map(f => (
                                      <option key={f.code} value={f.code}>
                                        [{f.code}] {f.name} — ({f.pricePerMeter}ج/م | رصيد {f.stockMeters}م)
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center border border-slate-200 rounded-lg bg-white px-2 py-1.5">
                                    <span className="text-slate-400 pl-1">سعر المتر:</span>
                                    <input
                                      type="number"
                                      value={sheerP}
                                      onChange={e => setSheerP(Number(e.target.value))}
                                      className="w-full font-bold text-center"
                                    />
                                    <span className="text-slate-500 font-bold">ج</span>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Heavy Layer Selection */}
                              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <label className="font-bold text-slate-800">2. القماش الثقيل (القطيفة / الستارة الرئيسية):</label>
                                  <span className="font-mono text-indigo-900 font-bold bg-indigo-100 px-2 py-0.5 rounded">
                                    الأمتار المطلوبة: {room.heavyMeters} متر
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  <select
                                    value={heavyCode}
                                    onChange={e => handleFabricSelect('heavy', e.target.value)}
                                    className="sm:col-span-2 border border-slate-200 rounded-lg p-2 bg-white font-bold text-slate-900"
                                  >
                                    <option value="">-- اختر القماش الثقيل من المخزون --</option>
                                    {inventory.filter(f => f.category === 'قطيفة / ثقيل' || f.category === 'كتان / درابيري').map(f => (
                                      <option key={f.code} value={f.code}>
                                        [{f.code}] {f.name} — ({f.pricePerMeter}ج/م | رصيد {f.stockMeters}م)
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center border border-slate-200 rounded-lg bg-white px-2 py-1.5">
                                    <span className="text-slate-400 pl-1">سعر المتر:</span>
                                    <input
                                      type="number"
                                      value={heavyP}
                                      onChange={e => setHeavyP(Number(e.target.value))}
                                      className="w-full font-bold text-center"
                                    />
                                    <span className="text-slate-500 font-bold">ج</span>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Blackout Layer Selection */}
                              <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <label className="font-bold text-slate-800">3. طبقة البلاك آوت العازل (اختياري):</label>
                                  <span className="font-mono text-slate-800 font-bold bg-slate-200 px-2 py-0.5 rounded">
                                    الأمتار المطلوبة: {room.blackoutMeters || Math.round(room.widthCm / 100 * 1.5 * 100) / 100} متر
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  <select
                                    value={blackoutCode}
                                    onChange={e => handleFabricSelect('blackout', e.target.value)}
                                    className="sm:col-span-2 border border-slate-200 rounded-lg p-2 bg-white font-bold text-slate-900"
                                  >
                                    <option value="">-- بدون طبقة بلاك آوت --</option>
                                    {inventory.filter(f => f.category === 'بلاك آوت عازل').map(f => (
                                      <option key={f.code} value={f.code}>
                                        [{f.code}] {f.name} — ({f.pricePerMeter}ج/م | رصيد {f.stockMeters}م)
                                      </option>
                                    ))}
                                  </select>
                                  {blackoutCode && (
                                    <div className="flex items-center border border-slate-200 rounded-lg bg-white px-2 py-1.5">
                                      <span className="text-slate-400 pl-1">سعر المتر:</span>
                                      <input
                                        type="number"
                                        value={blackoutP}
                                        onChange={e => setBlackoutP(Number(e.target.value))}
                                        className="w-full font-bold text-center"
                                      />
                                      <span className="text-slate-500 font-bold">ج</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Accessories & Fees */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-2 border-t border-slate-100">
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">المجرى/الماسورة (متر):</label>
                                  <input type="number" value={trackP} onChange={e => setTrackP(Number(e.target.value))} className="border rounded-lg p-1.5 text-center font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">شريط الكشكشة (متر):</label>
                                  <input type="number" value={tapeP} onChange={e => setTapeP(Number(e.target.value))} className="border rounded-lg p-1.5 text-center font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">الترزي (لكل جنب):</label>
                                  <input type="number" value={tailorP} onChange={e => setTailorP(Number(e.target.value))} className="border rounded-lg p-1.5 text-center font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">رسوم التركيب:</label>
                                  <input type="number" value={installF} onChange={e => setInstallF(Number(e.target.value))} className="border rounded-lg p-1.5 text-center font-bold" />
                                </div>
                              </div>

                              {/* Save Action */}
                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => saveRoomPricing(room.id)}
                                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                                >
                                  حفظ الأقمشة والتكلفة الحالية ✓
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Summary Display */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                              <div className="space-y-1.5 text-slate-800">
                                <div>
                                  <span className="text-slate-400 font-bold">الشيفون: </span>
                                  <strong>{room.sheerFabricName || 'لم يحدد'}</strong>
                                  <span className="font-mono text-slate-500 font-bold block">({room.sheerMeters} متر × {room.sheerPrice} ج = {(room.sheerMeters * room.sheerPrice).toLocaleString()} ج)</span>
                                </div>
                                <div className="pt-1 border-t border-slate-100">
                                  <span className="text-slate-400 font-bold">القطيفة/الثقيل: </span>
                                  <strong>{room.heavyFabricName || 'لم يحدد'}</strong>
                                  <span className="font-mono text-slate-500 font-bold block">({room.heavyMeters} متر × {room.heavyPrice} ج = {(room.heavyMeters * room.heavyPrice).toLocaleString()} ج)</span>
                                </div>
                              </div>

                              <div className="space-y-1.5 text-slate-800 sm:border-r sm:border-slate-200 sm:pr-3">
                                {room.blackoutFabricName && (
                                  <div>
                                    <span className="text-slate-400 font-bold">البلاك آوت: </span>
                                    <strong>{room.blackoutFabricName}</strong>
                                    <span className="font-mono text-slate-500 font-bold block">({room.blackoutMeters} متر × {room.blackoutPrice} ج)</span>
                                  </div>
                                )}
                                <div><strong>التجهيزات والترزي:</strong> المجرى ({room.trackPrice}ج) + الشريط ({room.tapePrice}ج) + التركيب ({room.installFee}ج)</div>
                              </div>

                              <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-slate-400 text-[11px]">اضغط للتعديل واختيار أقمشة أخرى من المخزون:</span>
                                <button
                                  type="button"
                                  onClick={() => startPricingRoom(room)}
                                  className="border border-slate-200 hover:bg-slate-50 text-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                  تعديل واختيار الأقمشة
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Final Submission to Phase 3 (Workshop) */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <button
                    onClick={() => setShowPrintModal(true)}
                    disabled={selected.totalAmount === 0}
                    className="w-full sm:w-auto border border-slate-300 hover:bg-slate-50 text-slate-800 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    معاينة المقايسة وطباعة العقد
                  </button>

                  <button
                    onClick={handleSendToWorkshop}
                    disabled={selected.totalAmount === 0}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_cut</span>
                    اعتماد العقد وتحويل لورشة القص والتفصيل (المرحلة 3) ←
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Official Contract Print Modal */}
      <ContractPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        data={selected as PrintContractData}
      />
    </PageShell>
  );
}
