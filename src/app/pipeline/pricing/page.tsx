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
                      const widthM = room.widthCm / 100;
                      const heightM = room.heightCm / 100;

                      return (
                        <div key={room.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                          {/* 🎯 Room Header: Dimensions stacked clearly & specs beside them */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-brand-gold inline-block"></span>
                                <h4 className="font-black text-sm sm:text-base text-slate-900">{room.name}</h4>
                              </div>

                              {/* Stacked Dimensions under each other */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5 text-xs text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 font-mono">
                                <div>
                                  <span className="text-slate-400 font-sans text-[11px]">العرض: </span>
                                  <strong className="text-slate-950 font-black">{room.widthCm} سم</strong>
                                  <span className="text-slate-400 text-[10px] mr-1">({widthM.toFixed(2)}م)</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-sans text-[11px]">الارتفاع: </span>
                                  <strong className="text-slate-950 font-black">{room.heightCm} سم</strong>
                                  <span className="text-slate-400 text-[10px] mr-1">({heightM.toFixed(2)}م)</span>
                                </div>
                              </div>
                            </div>

                            {/* Badges beside dimensions */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                              <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                                {room.sides === 2 ? 'جنبين' : 'جنب واحد'}
                              </span>
                              <span className="bg-amber-100 text-amber-950 border border-amber-200 px-2.5 py-1 rounded-lg">
                                {room.installationType || 'تراك سقف'}
                              </span>
                              <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg">
                                {room.ceilingType || 'بيت نور / جبس بورد'}
                              </span>
                              <div className="mr-auto sm:mr-2 text-right">
                                <span className="text-[10px] text-slate-400 block font-sans">إجمالي الغرفة</span>
                                <strong className="text-sm font-black text-brand-gold-dark font-mono">{room.totalSellPrice.toLocaleString()} ج</strong>
                              </div>
                            </div>
                          </div>

                          {/* Editing Form: Fabric Selection & Pricing Engine */}
                          {isEditing ? (
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-brand-gold space-y-5 shadow-sm">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h5 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-brand-gold text-[18px]">tune</span>
                                  تحديد أقمشة وتكلفة ({room.name}) — عرض الحائط: {widthM.toFixed(2)} متر
                                </h5>
                                <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                                  تحكم كامل في الأشرطة ومعاملات الضرب
                                </span>
                              </div>

                              {/* 🎯 1. Heavy Layer: قماش الجوانب أولاً */}
                              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-200 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-900 text-white text-xs font-black flex items-center justify-center">1</span>
                                    <label className="font-black text-xs sm:text-sm text-indigo-950">قماش الجوانب (القطيفة / الثقيل / الستارة الرئيسية):</label>
                                  </div>
                                  <div className="flex items-center gap-2 bg-indigo-100/80 px-2.5 py-1 rounded-xl font-mono text-xs font-black text-indigo-950">
                                    <span>الكمية: {heavyMeters} متر</span>
                                    <span>•</span>
                                    <span>الإجمالي: {(heavyMeters * heavyP).toLocaleString()} ج</span>
                                  </div>
                                </div>

                                {/* Tape Selector & Multiplier Controls */}
                                <div className="space-y-2 bg-white p-3 rounded-xl border border-indigo-100">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-700">نوع شريط الجوانب:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {TAPE_OPTIONS.map(tape => (
                                        <button
                                          key={tape.name}
                                          type="button"
                                          onClick={() => handleHeavyTapeSelect(tape.name)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                            heavyTapeType === tape.name
                                              ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs ring-1 ring-indigo-900'
                                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                          }`}
                                        >
                                          {tape.name} <span className="text-[10px] opacity-80">(×{tape.defaultMultiplier})</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Multiplier & Calculated/Custom Meters */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                                    <div className="flex items-center gap-2">
                                      <label className="font-bold text-slate-600 whitespace-nowrap">معامل الضرب (×):</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={heavyMultiplier}
                                        onChange={e => handleHeavyMultiplierChange(Number(e.target.value))}
                                        className="w-20 border border-slate-300 rounded-lg p-1.5 text-center font-mono font-black text-slate-900 bg-slate-50 focus:bg-white"
                                      />
                                      <span className="text-[11px] text-slate-400">({widthM.toFixed(2)}م × {heavyMultiplier})</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <label className="font-bold text-slate-600 whitespace-nowrap">الأمتار المطلوبة (متر):</label>
                                      <input
                                        type="number"
                                        step="0.05"
                                        value={heavyMeters}
                                        onChange={e => setHeavyMeters(Number(e.target.value))}
                                        className="w-24 border border-indigo-400 rounded-lg p-1.5 text-center font-mono font-black text-indigo-950 bg-indigo-50/50"
                                      />
                                      <span className="text-[11px] text-slate-400 font-bold">متر</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Fabric Selection & Unit Price */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  <select
                                    value={heavyCode}
                                    onChange={e => handleFabricSelect('heavy', e.target.value)}
                                    className="sm:col-span-2 border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 shadow-xs"
                                  >
                                    <option value="">-- اختر قماش الجوانب من المخزون --</option>
                                    {inventory.filter(f => f.category === 'قطيفة / ثقيل' || f.category === 'كتان / درابيري').map(f => (
                                      <option key={f.code} value={f.code}>
                                        [{f.code}] {f.name} — ({f.pricePerMeter}ج/م | رصيد {f.stockMeters}م)
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center border border-slate-300 rounded-xl bg-white px-3 py-2">
                                    <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                                    <input
                                      type="number"
                                      value={heavyP}
                                      onChange={e => setHeavyP(Number(e.target.value))}
                                      className="w-full font-mono font-black text-center text-slate-900"
                                    />
                                    <span className="text-slate-500 font-bold">ج</span>
                                  </div>
                                </div>
                              </div>

                              {/* 🎯 2. Sheer Layer: قماش الخلفية ثانياً */}
                              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-900 text-white text-xs font-black flex items-center justify-center">2</span>
                                    <label className="font-black text-xs sm:text-sm text-amber-950">قماش الخلفية (الشيفون / التول / الخفيف):</label>
                                  </div>
                                  <div className="flex items-center gap-2 bg-amber-100/80 px-2.5 py-1 rounded-xl font-mono text-xs font-black text-amber-950">
                                    <span>الكمية: {sheerMeters} متر</span>
                                    <span>•</span>
                                    <span>الإجمالي: {(sheerMeters * sheerP).toLocaleString()} ج</span>
                                  </div>
                                </div>

                                {/* Tape Selector & Multiplier Controls */}
                                <div className="space-y-2 bg-white p-3 rounded-xl border border-amber-100">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-700">نوع شريط الخلفية:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {TAPE_OPTIONS.map(tape => (
                                        <button
                                          key={tape.name}
                                          type="button"
                                          onClick={() => handleSheerTapeSelect(tape.name)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                            sheerTapeType === tape.name
                                              ? 'bg-amber-900 text-white border-amber-900 shadow-xs ring-1 ring-amber-900'
                                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                          }`}
                                        >
                                          {tape.name} <span className="text-[10px] opacity-80">(×{tape.defaultMultiplier})</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Multiplier & Calculated/Custom Meters */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                                    <div className="flex items-center gap-2">
                                      <label className="font-bold text-slate-600 whitespace-nowrap">معامل الضرب (×):</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={sheerMultiplier}
                                        onChange={e => handleSheerMultiplierChange(Number(e.target.value))}
                                        className="w-20 border border-slate-300 rounded-lg p-1.5 text-center font-mono font-black text-slate-900 bg-slate-50 focus:bg-white"
                                      />
                                      <span className="text-[11px] text-slate-400">({widthM.toFixed(2)}م × {sheerMultiplier})</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <label className="font-bold text-slate-600 whitespace-nowrap">الأمتار المطلوبة (متر):</label>
                                      <input
                                        type="number"
                                        step="0.05"
                                        value={sheerMeters}
                                        onChange={e => setSheerMeters(Number(e.target.value))}
                                        className="w-24 border border-amber-400 rounded-lg p-1.5 text-center font-mono font-black text-amber-950 bg-amber-50/50"
                                      />
                                      <span className="text-[11px] text-slate-400 font-bold">متر</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Fabric Selection & Unit Price */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  <select
                                    value={sheerCode}
                                    onChange={e => handleFabricSelect('sheer', e.target.value)}
                                    className="sm:col-span-2 border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 shadow-xs"
                                  >
                                    <option value="">-- اختر قماش الخلفية من المخزون --</option>
                                    {inventory.filter(f => f.category === 'شيفون / تول').map(f => (
                                      <option key={f.code} value={f.code}>
                                        [{f.code}] {f.name} — ({f.pricePerMeter}ج/م | رصيد {f.stockMeters}م)
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center border border-slate-300 rounded-xl bg-white px-3 py-2">
                                    <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                                    <input
                                      type="number"
                                      value={sheerP}
                                      onChange={e => setSheerP(Number(e.target.value))}
                                      className="w-full font-mono font-black text-center text-slate-900"
                                    />
                                    <span className="text-slate-500 font-bold">ج</span>
                                  </div>
                                </div>
                              </div>

                              {/* 🎯 3. Blackout Layer: طبقة البلاك آوت (معامل ×1.20 الافتراضي) */}
                              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-300 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-xs font-black flex items-center justify-center">3</span>
                                    <label className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={hasBlackout}
                                        onChange={e => {
                                          const val = e.target.checked;
                                          setHasBlackout(val);
                                          if (val && !blackoutCode) setBlackoutCode('BK-301');
                                        }}
                                        className="w-4 h-4 rounded text-brand-gold accent-amber-600 cursor-pointer"
                                      />
                                      طبقة بلاك آوت عازل حراري ومائي (اختياري)
                                    </label>
                                  </div>
                                  {hasBlackout && (
                                    <div className="flex items-center gap-2 bg-slate-200 px-2.5 py-1 rounded-xl font-mono text-xs font-black text-slate-900">
                                      <span>الكمية: {blackoutMeters} متر</span>
                                      <span>•</span>
                                      <span>الإجمالي: {(blackoutMeters * blackoutP).toLocaleString()} ج</span>
                                    </div>
                                  )}
                                </div>

                                {hasBlackout && (
                                  <div className="space-y-3 pt-2 border-t border-slate-200">
                                    {/* Multiplier Controls for Blackout */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                                      <div className="flex items-center gap-2">
                                        <label className="font-bold text-slate-600 whitespace-nowrap">معامل الضرب (×):</label>
                                        <input
                                          type="number"
                                          step="0.05"
                                          value={blackoutMultiplier}
                                          onChange={e => handleBlackoutMultiplierChange(Number(e.target.value))}
                                          className="w-20 border border-slate-300 rounded-lg p-1.5 text-center font-mono font-black text-slate-900 bg-slate-50 focus:bg-white"
                                        />
                                        <span className="text-[11px] text-slate-400">({widthM.toFixed(2)}م × {blackoutMultiplier})</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <label className="font-bold text-slate-600 whitespace-nowrap">الأمتار المطلوبة (متر):</label>
                                        <input
                                          type="number"
                                          step="0.05"
                                          value={blackoutMeters}
                                          onChange={e => setBlackoutMeters(Number(e.target.value))}
                                          className="w-24 border border-slate-400 rounded-lg p-1.5 text-center font-mono font-black text-slate-950 bg-slate-50"
                                        />
                                        <span className="text-[11px] text-slate-400 font-bold">متر</span>
                                      </div>
                                    </div>

                                    {/* Fabric Selection */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                      <select
                                        value={blackoutCode}
                                        onChange={e => handleFabricSelect('blackout', e.target.value)}
                                        className="sm:col-span-2 border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 shadow-xs"
                                      >
                                        <option value="">-- اختر خامة البلاك آوت من المخزون --</option>
                                        {inventory.filter(f => f.category === 'بلاك آوت عازل').map(f => (
                                          <option key={f.code} value={f.code}>
                                            [{f.code}] {f.name} — ({f.pricePerMeter}ج/م | رصيد {f.stockMeters}م)
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex items-center border border-slate-300 rounded-xl bg-white px-3 py-2">
                                        <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                                        <input
                                          type="number"
                                          value={blackoutP}
                                          onChange={e => setBlackoutP(Number(e.target.value))}
                                          className="w-full font-mono font-black text-center text-slate-900"
                                        />
                                        <span className="text-slate-500 font-bold">ج</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Accessories & Fees */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-200">
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">المجرى/الماسورة (متر):</label>
                                  <input type="number" value={trackP} onChange={e => setTrackP(Number(e.target.value))} className="border rounded-xl p-2 text-center font-mono font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">شريط الكشكشة (متر):</label>
                                  <input type="number" value={tapeP} onChange={e => setTapeP(Number(e.target.value))} className="border rounded-xl p-2 text-center font-mono font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">الترزي (لكل جنب):</label>
                                  <input type="number" value={tailorP} onChange={e => setTailorP(Number(e.target.value))} className="border rounded-xl p-2 text-center font-mono font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-700">رسوم التركيب:</label>
                                  <input type="number" value={installF} onChange={e => setInstallF(Number(e.target.value))} className="border rounded-xl p-2 text-center font-mono font-bold" />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingRoomId(null)}
                                  className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveRoomPricing(room.id)}
                                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                                >
                                  حفظ واعتماد تسعير الغرفة ✓
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Summary Display */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200">
                              <div className="space-y-2 text-slate-800">
                                {/* 1. Heavy summary */}
                                <div>
                                  <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
                                    <span className="w-4 h-4 rounded-full bg-indigo-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                                    <span>قماش الجوانب (الثقيل):</span>
                                    <strong className="text-slate-900">{room.heavyFabricName || 'لم يحدد'}</strong>
                                  </div>
                                  <span className="font-mono text-slate-500 font-bold block pr-5">
                                    شريط {room.heavyTapeType || '٣ فتلة'} (×{room.heavyMultiplier ?? 2.0}) • {room.heavyMeters} متر × {room.heavyPrice} ج = {(room.heavyMeters * room.heavyPrice).toLocaleString()} ج
                                  </span>
                                </div>

                                {/* 2. Sheer summary */}
                                <div className="pt-2 border-t border-slate-100">
                                  <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                                    <span className="w-4 h-4 rounded-full bg-amber-800 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                                    <span>قماش الخلفية (الشيفون):</span>
                                    <strong className="text-slate-900">{room.sheerFabricName || 'لم يحدد'}</strong>
                                  </div>
                                  <span className="font-mono text-slate-500 font-bold block pr-5">
                                    شريط {room.sheerTapeType || 'ويفي'} (×{room.sheerMultiplier ?? 2.5}) • {room.sheerMeters} متر × {room.sheerPrice} ج = {(room.sheerMeters * room.sheerPrice).toLocaleString()} ج
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-slate-800 sm:border-r sm:border-slate-200 sm:pr-3">
                                {/* 3. Blackout summary */}
                                {room.blackoutMeters > 0 && room.blackoutFabricName ? (
                                  <div>
                                    <div className="flex items-center gap-1.5 text-slate-950 font-bold">
                                      <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                                      <span>طبقة البلاك آوت:</span>
                                      <strong className="text-slate-900">{room.blackoutFabricName}</strong>
                                    </div>
                                    <span className="font-mono text-slate-500 font-bold block pr-5">
                                      (×{room.blackoutMultiplier ?? 1.20}) • {room.blackoutMeters} متر × {room.blackoutPrice} ج = {(room.blackoutMeters * room.blackoutPrice).toLocaleString()} ج
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-slate-400 text-[11px]">بدون طبقة بلاك آوت عازل</div>
                                )}

                                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                                  <strong>التجهيزات والترزي:</strong> مجرى ({room.trackPrice}ج) + شريط ({room.tapePrice}ج) + ترزي ({room.tailorPricePerSide}ج) + تركيب ({room.installFee}ج)
                                </div>
                              </div>

                              <div className="col-span-1 sm:col-span-2 pt-2.5 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-slate-400 text-[11px]">اضغط للتعديل وتغيير الأقمشة أو الأشرطة والمعاملات:</span>
                                <button
                                  type="button"
                                  onClick={() => startPricingRoom(room)}
                                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[14px]">tune</span>
                                  تعديل الأقمشة والأشرطة والتكلفة
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
