'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import ContractPrintModal, { PrintContractData } from '@/components/ContractPrintModal';
import {
  getStoredQuotations,
  saveAllQuotations,
  QuotationOrder,
  RoomPricing
} from '@/lib/inspectionsStore';

interface InventoryFabric {
  id: string;
  code: string;
  name: string;
  category: 'شيفون / تول' | 'قطيفة / ثقيل' | 'بلاك آوت عازل' | 'كتان / درابيري';
  pricePerMeter: number;
  stockMeters: number;
}

const TAPE_OPTIONS: { name: string; defaultMultiplier: number }[] = [
  { name: '٣ فتلة', defaultMultiplier: 2.0 },
  { name: 'إيكيا', defaultMultiplier: 2.0 },
  { name: 'ويفي', defaultMultiplier: 2.5 },
  { name: 'جراب', defaultMultiplier: 2.0 },
  { name: 'حلقات ديكور', defaultMultiplier: 2.0 },
];

const mockFabricsInventory: InventoryFabric[] = [
  { id: 'f1', code: 'SH-101', name: 'شيفون حرير فاخر (أبيض سادة)', category: 'شيفون / تول', pricePerMeter: 160, stockMeters: 250 },
  { id: 'f2', code: 'SH-102', name: 'تول مطرز كريستال تركيات', category: 'شيفون / تول', pricePerMeter: 220, stockMeters: 180 },
  { id: 'f3', code: 'HV-201', name: 'قطيفة جاجوار تركيات (درجات البيج)', category: 'قطيفة / ثقيل', pricePerMeter: 380, stockMeters: 320 },
  { id: 'f4', code: 'HV-202', name: 'قطيفة شانيل كابوتونيه فاخر', category: 'قطيفة / ثقيل', pricePerMeter: 450, stockMeters: 140 },
  { id: 'f5', code: 'BK-301', name: 'بلاك آوت عازل حراري ومائي (ثلاثي)', category: 'بلاك آوت عازل', pricePerMeter: 250, stockMeters: 210 },
  { id: 'f6', code: 'LN-401', name: 'كتان إسباني مدرج ألوان هادئة', category: 'كتان / درابيري', pricePerMeter: 310, stockMeters: 95 },
];

export default function PipelinePricingPage() {
  const [quotations, setQuotations] = useState<QuotationOrder[]>([]);
  const [inventory] = useState<InventoryFabric[]>(mockFabricsInventory);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [selectedId, setSelectedId] = useState<string>('QOT-101');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const list = getStoredQuotations();
    setQuotations(list);
    if (list.length > 0) {
      setSelectedId(list[0].id);
    }
  }, []);

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

  // 1. Heavy / Sides Fabric State (1st Layer)
  const [heavyTapeType, setHeavyTapeType] = useState<string>('٣ فتلة');
  const [heavyMultiplier, setHeavyMultiplier] = useState<number>(2.0);
  const [heavyMeters, setHeavyMeters] = useState<number>(5.0);
  const [heavyCode, setHeavyCode] = useState<string>('HV-201');
  const [heavyP, setHeavyP] = useState<number>(380);

  // 2. Sheer / Background Fabric State (2nd Layer)
  const [sheerTapeType, setSheerTapeType] = useState<string>('ويفي');
  const [sheerMultiplier, setSheerMultiplier] = useState<number>(2.5);
  const [sheerMeters, setSheerMeters] = useState<number>(6.25);
  const [sheerCode, setSheerCode] = useState<string>('SH-101');
  const [sheerP, setSheerP] = useState<number>(160);

  // 3. Blackout Layer State (3rd Layer)
  const [hasBlackout, setHasBlackout] = useState<boolean>(false);
  const [blackoutMultiplier, setBlackoutMultiplier] = useState<number>(1.20);
  const [blackoutMeters, setBlackoutMeters] = useState<number>(3.0);
  const [blackoutCode, setBlackoutCode] = useState<string>('');
  const [blackoutP, setBlackoutP] = useState<number>(250);

  // Accessories & Fees
  const [trackP, setTrackP] = useState<number>(120);
  const [tapeP, setTapeP] = useState<number>(40);
  const [tailorP, setTailorP] = useState<number>(150);
  const [installF, setInstallF] = useState<number>(200);
  const [estimator, setEstimator] = useState<string>('أحمد كشك');

  // Currently editing room reference width
  const editingRoom = selected?.rooms.find(r => r.id === editingRoomId);
  const editingWidthM = editingRoom ? editingRoom.widthCm / 100 : 2.5;

  const startPricingRoom = (room: RoomPricing) => {
    setEditingRoomId(room.id);
    const widthM = room.widthCm / 100;

    // Heavy (1st)
    const hTape = room.heavyTapeType || '٣ فتلة';
    const hMul = room.heavyMultiplier ?? 2.0;
    const hM = room.heavyMeters || Math.round(widthM * hMul * 100) / 100;
    setHeavyTapeType(hTape);
    setHeavyMultiplier(hMul);
    setHeavyMeters(hM);
    setHeavyCode(room.heavyFabricCode || 'HV-201');
    setHeavyP(room.heavyPrice || 380);

    // Sheer (2nd)
    const sTape = room.sheerTapeType || 'ويفي';
    const sMul = room.sheerMultiplier ?? 2.5;
    const sM = room.sheerMeters || Math.round(widthM * sMul * 100) / 100;
    setSheerTapeType(sTape);
    setSheerMultiplier(sMul);
    setSheerMeters(sM);
    setSheerCode(room.sheerFabricCode || 'SH-101');
    setSheerP(room.sheerPrice || 160);

    // Blackout (3rd)
    const hasBk = Boolean(room.blackoutFabricCode || (room.blackoutMeters && room.blackoutMeters > 0));
    const bkMul = room.blackoutMultiplier ?? 1.20;
    const bkM = room.blackoutMeters || Math.round(widthM * bkMul * 100) / 100;
    setHasBlackout(hasBk);
    setBlackoutMultiplier(bkMul);
    setBlackoutMeters(bkM);
    setBlackoutCode(room.blackoutFabricCode || (hasBk ? 'BK-301' : ''));
    setBlackoutP(room.blackoutPrice || 250);

    // Fees
    setTrackP(room.trackPrice || 120);
    setTapeP(room.tapePrice || 40);
    setTailorP(room.tailorPricePerSide || 150);
    setInstallF(room.installFee || 200);
  };

  // Tape & Multiplier Handlers for Heavy Layer
  const handleHeavyTapeSelect = (tapeName: string) => {
    setHeavyTapeType(tapeName);
    const opt = TAPE_OPTIONS.find(t => t.name === tapeName);
    const mul = opt ? opt.defaultMultiplier : 2.0;
    setHeavyMultiplier(mul);
    setHeavyMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleHeavyMultiplierChange = (mul: number) => {
    setHeavyMultiplier(mul);
    setHeavyMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  // Tape & Multiplier Handlers for Sheer Layer
  const handleSheerTapeSelect = (tapeName: string) => {
    setSheerTapeType(tapeName);
    const opt = TAPE_OPTIONS.find(t => t.name === tapeName);
    const mul = opt ? opt.defaultMultiplier : 2.0;
    setSheerMultiplier(mul);
    setSheerMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleSheerMultiplierChange = (mul: number) => {
    setSheerMultiplier(mul);
    setSheerMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  // Blackout Multiplier Handler
  const handleBlackoutMultiplierChange = (mul: number) => {
    setBlackoutMultiplier(mul);
    setBlackoutMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleFabricSelect = (layer: 'heavy' | 'sheer' | 'blackout', code: string) => {
    const fab = inventory.find(f => f.code === code);
    if (!fab) return;

    if (layer === 'heavy') {
      setHeavyCode(code);
      setHeavyP(fab.pricePerMeter);
    } else if (layer === 'sheer') {
      setSheerCode(code);
      setSheerP(fab.pricePerMeter);
    } else if (layer === 'blackout') {
      setBlackoutCode(code);
      setBlackoutP(fab.pricePerMeter);
    }
  };

  const saveRoomPricing = (roomId: string) => {
    if (!selected) return;

    const heavyFab = inventory.find(f => f.code === heavyCode);
    const sheerFab = inventory.find(f => f.code === sheerCode);
    const blackoutFab = inventory.find(f => f.code === blackoutCode);

    const updatedList = quotations.map(q => {
      if (q.id !== selected.id) return q;

      const updatedRooms = q.rooms.map(rm => {
        if (rm.id !== roomId) return rm;

        const effectiveHeavyMeters = heavyMeters > 0 ? heavyMeters : Math.round(editingWidthM * heavyMultiplier * 100) / 100;
        const effectiveSheerMeters = sheerMeters > 0 ? sheerMeters : Math.round(editingWidthM * sheerMultiplier * 100) / 100;
        const effectiveBlackoutMeters = hasBlackout ? (blackoutMeters > 0 ? blackoutMeters : Math.round(editingWidthM * blackoutMultiplier * 100) / 100) : 0;

        const heavyCost = effectiveHeavyMeters * heavyP;
        const sheerCost = effectiveSheerMeters * sheerP;
        const blackoutCost = hasBlackout ? (effectiveBlackoutMeters * blackoutP) : 0;

        const trackCost = rm.trackMeters * trackP;
        const totalTapeMeters = Math.round((effectiveHeavyMeters + effectiveSheerMeters) * 100) / 100;
        const tapeCost = totalTapeMeters * tapeP;
        const tailorCost = rm.sides * tailorP;
        const total = heavyCost + sheerCost + blackoutCost + trackCost + tapeCost + tailorCost + installF;

        return {
          ...rm,
          // 1. Heavy
          heavyFabricCode: heavyCode,
          heavyFabricName: heavyFab?.name || 'قطيفة جاجوار تركيات',
          heavyTapeType,
          heavyMultiplier,
          heavyMeters: effectiveHeavyMeters,
          heavyPrice: heavyP,

          // 2. Sheer
          sheerFabricCode: sheerCode,
          sheerFabricName: sheerFab?.name || 'شيفون حرير فاخر',
          sheerTapeType,
          sheerMultiplier,
          sheerMeters: effectiveSheerMeters,
          sheerPrice: sheerP,

          // 3. Blackout
          blackoutFabricCode: hasBlackout ? blackoutCode : '',
          blackoutFabricName: hasBlackout ? (blackoutFab?.name || 'بلاك آوت عازل ثلاثي') : undefined,
          blackoutMultiplier,
          blackoutMeters: effectiveBlackoutMeters,
          blackoutPrice: hasBlackout ? blackoutP : 0,

          // Accessories & Totals
          trackPrice: trackP,
          tapeMeters: totalTapeMeters,
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
        status: q.status === 'بانتظار التسعير' ? ('تم إرسال المقايسة' as const) : q.status,
      };
    });

    setQuotations(updatedList);
    saveAllQuotations(updatedList);
    setEditingRoomId(null);
    alert('تم حفظ اختيار الأقمشة وحساب الأمتار والتكلفة بنجاح ✓');
  };

  const handleDepositChange = (amount: number) => {
    const updatedList = quotations.map(q => {
      if (q.id !== selected.id) return q;
      const deposit = Math.min(amount, q.totalAmount);
      return {
        ...q,
        depositPaid: deposit,
        remainingAmount: q.totalAmount - deposit,
        status: deposit > 0 ? ('معتمد ومسدد العربون' as const) : q.status,
      };
    });
    setQuotations(updatedList);
    saveAllQuotations(updatedList);
  };

  const handleSendToWorkshop = () => {
    if (selected.totalAmount === 0) {
      alert('الرجاء اختيار الأقمشة وتسعير غرف العميل أولاً قبل تحويل العقد للورشة');
      return;
    }
    const updatedList = quotations.map(q => q.id === selected.id ? { ...q, status: 'تم التحويل للورشة' as const } : q);
    setQuotations(updatedList);
    saveAllQuotations(updatedList);
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
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
                {/* Header info & Estimator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        {selected.id} • معاينة {selected.inspectionId}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                        selected.status === 'معتمد ومسدد العربون' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : selected.status === 'تم إرسال المقايسة' ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {selected.status}
                      </span>
                    </div>
                    <h2 className="font-black text-xl text-slate-900 mt-1">{selected.customerName}</h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{selected.phone} • {selected.address}</p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
                    <span className="text-slate-500 font-bold">مسؤول المبيعات:</span>
                    <input
                      value={estimator}
                      onChange={e => setEstimator(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs w-28 bg-white font-bold text-slate-900"
                      placeholder="أحمد كشك"
                    />
                  </div>
                </div>

                {/* Financial Summary Cards & Simple Deposit Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 font-bold block">إجمالي المقايسة</span>
                    <span className="font-mono font-black text-xl text-slate-900 mt-0.5 block">{selected.totalAmount.toLocaleString()} ج</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[11px] text-emerald-800 font-bold block">العربون المسدد</span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <input
                        type="number"
                        value={selected.depositPaid || ''}
                        onChange={(e) => handleDepositChange(Number(e.target.value))}
                        className="w-24 bg-white border border-emerald-300 rounded-lg px-2 py-0.5 text-emerald-950 font-mono font-black text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0"
                      />
                      <span className="text-xs font-bold text-emerald-900">ج</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 text-center">
                    <span className="text-[11px] text-rose-800 font-bold block">المتبقي للتحصيل</span>
                    <span className="font-mono font-black text-xl text-rose-900 mt-0.5 block">{selected.remainingAmount.toLocaleString()} ج</span>
                  </div>
                </div>

                {/* 🎯 Rooms Pricing & Fabric Selection: Clean Minimalist Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">table_view</span>
                      جدول غرف المقايسة والأقمشة والتسعير ({selected.rooms.length} غرفة):
                    </h3>
                  </div>

                  {selected.rooms.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-6 bg-slate-50 border border-slate-200 rounded-xl">
                      لا توجد غرف مسجلة بهذه المعاينة.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs min-w-[700px]">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">الغرفة والمقاس</th>
                              <th className="p-3">١. قماش الجوانب (الثقيل)</th>
                              <th className="p-3">٢. قماش الخلفية (الشيفون)</th>
                              <th className="p-3">٣. البلاك آوت</th>
                              <th className="p-3 text-left font-mono">إجمالي الغرفة</th>
                              <th className="p-3 text-center">الإجراء</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selected.rooms.map((room) => {
                              const isEditing = editingRoomId === room.id;
                              const widthM = room.widthCm / 100;
                              const heightM = room.heightCm / 100;

                              return (
                                <tr
                                  key={room.id}
                                  className={`transition-colors ${
                                    isEditing ? 'bg-amber-50/50' : 'hover:bg-slate-50/60'
                                  }`}
                                >
                                  {/* Room name & dimensions */}
                                  <td className="p-3 align-top">
                                    <div className="font-black text-slate-900 text-xs">{room.name}</div>
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                      {room.widthCm}×{room.heightCm} سم ({widthM.toFixed(2)}م)
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                                        {room.sides === 2 ? 'جنبين' : 'جنب'}
                                      </span>
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                        {room.installationType || 'تراك سقف'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Heavy layer (1) */}
                                  <td className="p-3 align-top">
                                    <div className="font-bold text-slate-900">
                                      {room.heavyFabricName || 'لم يحدد'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                      شريط {room.heavyTapeType || '٣ فتلة'} (×{room.heavyMultiplier ?? 2.0})
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-indigo-950 mt-0.5">
                                      {room.heavyMeters}م × {room.heavyPrice}ج = {(room.heavyMeters * room.heavyPrice).toLocaleString()} ج
                                    </div>
                                  </td>

                                  {/* Sheer layer (2) */}
                                  <td className="p-3 align-top">
                                    <div className="font-bold text-slate-900">
                                      {room.sheerFabricName || 'لم يحدد'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                      شريط {room.sheerTapeType || 'ويفي'} (×{room.sheerMultiplier ?? 2.5})
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-amber-900 mt-0.5">
                                      {room.sheerMeters}م × {room.sheerPrice}ج = {(room.sheerMeters * room.sheerPrice).toLocaleString()} ج
                                    </div>
                                  </td>

                                  {/* Blackout layer (3) */}
                                  <td className="p-3 align-top">
                                    {room.blackoutMeters > 0 && room.blackoutFabricName ? (
                                      <>
                                        <div className="font-bold text-slate-800">{room.blackoutFabricName}</div>
                                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                                          (×{room.blackoutMultiplier ?? 1.20}) • {room.blackoutMeters}م
                                        </div>
                                        <div className="text-[11px] font-mono font-bold text-slate-900 mt-0.5">
                                          {(room.blackoutMeters * room.blackoutPrice).toLocaleString()} ج
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">-</span>
                                    )}
                                  </td>

                                  {/* Total */}
                                  <td className="p-3 text-left font-mono align-top">
                                    <span className="font-black text-sm text-slate-900 block">
                                      {room.totalSellPrice.toLocaleString()} ج
                                    </span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">شامل التجهيز والترزي</span>
                                  </td>

                                  {/* Action */}
                                  <td className="p-3 text-center align-middle">
                                    <button
                                      type="button"
                                      onClick={() => isEditing ? setEditingRoomId(null) : startPricingRoom(room)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                        isEditing
                                          ? 'bg-amber-100 text-amber-950 border-amber-300'
                                          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                                      }`}
                                    >
                                      {isEditing ? 'إغلاق ✕' : 'تسعير / تعديل'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🎯 Minimalist Clean Editor Panel (When a room is selected for editing) */}
                {editingRoom && (
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-amber-300 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                        <h4 className="font-black text-sm text-slate-900">
                          تحديد أقمشة ({editingRoom.name}) — عرض الحائط: {editingWidthM.toFixed(2)} م
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        المقاس: {editingRoom.widthCm}×{editingRoom.heightCm} سم
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Layer 1: Heavy Fabric */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <label className="font-black text-slate-900 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                            قماش الجوانب (القطيفة / الثقيل):
                          </label>
                          <span className="font-mono text-slate-700 font-bold text-[11px]">
                            الكمية: {heavyMeters} متر • الإجمالي: {(heavyMeters * heavyP).toLocaleString()} ج
                          </span>
                        </div>

                        {/* Tape options & Multiplier */}
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                          <span className="text-slate-500 font-bold text-[11px]">نوع الشريط:</span>
                          <div className="flex flex-wrap gap-1">
                            {TAPE_OPTIONS.map(tape => (
                              <button
                                key={tape.name}
                                type="button"
                                onClick={() => handleHeavyTapeSelect(tape.name)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                  heavyTapeType === tape.name
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {tape.name} (×{tape.defaultMultiplier})
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-1 mr-auto">
                            <span className="text-slate-500 text-[11px]">معامل:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={heavyMultiplier}
                              onChange={e => handleHeavyMultiplierChange(Number(e.target.value))}
                              className="w-14 border border-slate-300 rounded px-1 py-0.5 text-center font-mono font-bold text-xs"
                            />
                            <span className="text-slate-500 text-[11px] mr-2">أمتار:</span>
                            <input
                              type="number"
                              step="0.05"
                              value={heavyMeters}
                              onChange={e => setHeavyMeters(Number(e.target.value))}
                              className="w-16 border border-slate-300 rounded px-1 py-0.5 text-center font-mono font-bold text-xs bg-amber-50/40"
                            />
                            <span className="text-slate-400 text-[10px]">م</span>
                          </div>
                        </div>

                        {/* Select fabric & price */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                          <select
                            value={heavyCode}
                            onChange={e => handleFabricSelect('heavy', e.target.value)}
                            className="sm:col-span-2 border border-slate-300 rounded-lg p-2 bg-white font-bold text-slate-900"
                          >
                            <option value="">-- اختر قماش الجوانب من المخزون --</option>
                            {inventory.filter(f => f.category === 'قطيفة / ثقيل' || f.category === 'كتان / درابيري').map(f => (
                              <option key={f.code} value={f.code}>
                                [{f.code}] {f.name} — ({f.pricePerMeter}ج/م)
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white px-2 py-1">
                            <span className="text-slate-500 pl-1 text-[11px]">السعر:</span>
                            <input
                              type="number"
                              value={heavyP}
                              onChange={e => setHeavyP(Number(e.target.value))}
                              className="w-full font-mono font-bold text-center text-xs"
                            />
                            <span className="text-slate-500 text-[11px]">ج/م</span>
                          </div>
                        </div>
                      </div>

                      {/* Layer 2: Sheer Fabric */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <label className="font-black text-slate-900 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                            قماش الخلفية (الشيفون / التول):
                          </label>
                          <span className="font-mono text-slate-700 font-bold text-[11px]">
                            الكمية: {sheerMeters} متر • الإجمالي: {(sheerMeters * sheerP).toLocaleString()} ج
                          </span>
                        </div>

                        {/* Tape options & Multiplier */}
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                          <span className="text-slate-500 font-bold text-[11px]">نوع الشريط:</span>
                          <div className="flex flex-wrap gap-1">
                            {TAPE_OPTIONS.map(tape => (
                              <button
                                key={tape.name}
                                type="button"
                                onClick={() => handleSheerTapeSelect(tape.name)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                  sheerTapeType === tape.name
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {tape.name} (×{tape.defaultMultiplier})
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-1 mr-auto">
                            <span className="text-slate-500 text-[11px]">معامل:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={sheerMultiplier}
                              onChange={e => handleSheerMultiplierChange(Number(e.target.value))}
                              className="w-14 border border-slate-300 rounded px-1 py-0.5 text-center font-mono font-bold text-xs"
                            />
                            <span className="text-slate-500 text-[11px] mr-2">أمتار:</span>
                            <input
                              type="number"
                              step="0.05"
                              value={sheerMeters}
                              onChange={e => setSheerMeters(Number(e.target.value))}
                              className="w-16 border border-slate-300 rounded px-1 py-0.5 text-center font-mono font-bold text-xs bg-amber-50/40"
                            />
                            <span className="text-slate-400 text-[10px]">م</span>
                          </div>
                        </div>

                        {/* Select fabric & price */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                          <select
                            value={sheerCode}
                            onChange={e => handleFabricSelect('sheer', e.target.value)}
                            className="sm:col-span-2 border border-slate-300 rounded-lg p-2 bg-white font-bold text-slate-900"
                          >
                            <option value="">-- اختر قماش الخلفية من المخزون --</option>
                            {inventory.filter(f => f.category === 'شيفون / تول').map(f => (
                              <option key={f.code} value={f.code}>
                                [{f.code}] {f.name} — ({f.pricePerMeter}ج/م)
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white px-2 py-1">
                            <span className="text-slate-500 pl-1 text-[11px]">السعر:</span>
                            <input
                              type="number"
                              value={sheerP}
                              onChange={e => setSheerP(Number(e.target.value))}
                              className="w-full font-mono font-bold text-center text-xs"
                            />
                            <span className="text-slate-500 text-[11px]">ج/م</span>
                          </div>
                        </div>
                      </div>

                      {/* Layer 3: Blackout Layer */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-black text-slate-900 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasBlackout}
                              onChange={e => {
                                const val = e.target.checked;
                                setHasBlackout(val);
                                if (val && !blackoutCode) setBlackoutCode('BK-301');
                              }}
                              className="w-4 h-4 rounded text-slate-900 accent-slate-900 cursor-pointer"
                            />
                            <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                            طبقة بلاك آوت عازل حراري ومائي (اختياري)
                          </label>
                          {hasBlackout && (
                            <span className="font-mono text-slate-700 font-bold text-[11px]">
                              {blackoutMeters} متر • الإجمالي: {(blackoutMeters * blackoutP).toLocaleString()} ج
                            </span>
                          )}
                        </div>

                        {hasBlackout && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-[11px]">معامل:</span>
                              <input
                                type="number"
                                step="0.05"
                                value={blackoutMultiplier}
                                onChange={e => handleBlackoutMultiplierChange(Number(e.target.value))}
                                className="w-14 border border-slate-300 rounded px-1 py-0.5 text-center font-mono font-bold text-xs"
                              />
                              <span className="text-slate-500 text-[11px] mr-2">أمتار:</span>
                              <input
                                type="number"
                                step="0.05"
                                value={blackoutMeters}
                                onChange={e => setBlackoutMeters(Number(e.target.value))}
                                className="w-16 border border-slate-300 rounded px-1 py-0.5 text-center font-mono font-bold text-xs bg-slate-50"
                              />
                            </div>

                            <select
                              value={blackoutCode}
                              onChange={e => handleFabricSelect('blackout', e.target.value)}
                              className="border border-slate-300 rounded-lg p-1.5 bg-white font-bold text-slate-900"
                            >
                              <option value="">-- اختر خامة البلاك آوت --</option>
                              {inventory.filter(f => f.category === 'بلاك آوت عازل').map(f => (
                                <option key={f.code} value={f.code}>
                                  [{f.code}] {f.name}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center border border-slate-300 rounded-lg bg-white px-2 py-1">
                              <span className="text-slate-500 pl-1 text-[11px]">سعر المتر:</span>
                              <input
                                type="number"
                                value={blackoutP}
                                onChange={e => setBlackoutP(Number(e.target.value))}
                                className="w-full font-mono font-bold text-center text-xs"
                              />
                              <span className="text-slate-500 text-[11px]">ج</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accessories & Fees */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[11px] whitespace-nowrap">مجرى (م):</span>
                          <input type="number" value={trackP} onChange={e => setTrackP(Number(e.target.value))} className="w-full text-center font-mono font-bold" />
                          <span className="text-slate-400 text-[10px]">ج</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[11px] whitespace-nowrap">شريط (م):</span>
                          <input type="number" value={tapeP} onChange={e => setTapeP(Number(e.target.value))} className="w-full text-center font-mono font-bold" />
                          <span className="text-slate-400 text-[10px]">ج</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[11px] whitespace-nowrap">ترزي (جنب):</span>
                          <input type="number" value={tailorP} onChange={e => setTailorP(Number(e.target.value))} className="w-full text-center font-mono font-bold" />
                          <span className="text-slate-400 text-[10px]">ج</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[11px] whitespace-nowrap">تركيب:</span>
                          <input type="number" value={installF} onChange={e => setInstallF(Number(e.target.value))} className="w-full text-center font-mono font-bold" />
                          <span className="text-slate-400 text-[10px]">ج</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEditingRoomId(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 border border-slate-300 cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => saveRoomPricing(editingRoom.id)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        حفظ تسعير الغرفة ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Final Submission to Phase 3 (Workshop) */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <button
                    onClick={() => setShowPrintModal(true)}
                    disabled={selected.totalAmount === 0}
                    className="w-full sm:w-auto border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    معاينة المقايسة وطباعة العقد (PDF)
                  </button>

                  <button
                    onClick={handleSendToWorkshop}
                    disabled={selected.totalAmount === 0}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_cut</span>
                    اعتماد العقد وتحويل لورشة التفصيل (المرحلة 3) ←
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
