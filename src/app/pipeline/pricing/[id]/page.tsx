'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

export default function PricingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || 'QOT-101';
  const orderId = decodeURIComponent(rawId);

  const [quotations, setQuotations] = useState<QuotationOrder[]>([]);
  const [inventory] = useState<InventoryFabric[]>(mockFabricsInventory);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    const list = getStoredQuotations();
    setQuotations(list);
  }, []);

  const quotation = quotations.find(q => q.id === orderId) || quotations[0];

  // Currently Editing Room ID inside this details page
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // 1. Heavy Fabric State (1st Layer)
  const [heavyTapeType, setHeavyTapeType] = useState<string>('٣ فتلة');
  const [heavyMultiplier, setHeavyMultiplier] = useState<number>(2.0);
  const [heavyMeters, setHeavyMeters] = useState<number>(5.0);
  const [heavyCode, setHeavyCode] = useState<string>('HV-201');
  const [heavyP, setHeavyP] = useState<number>(380);

  // 2. Sheer Fabric State (2nd Layer)
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

  useEffect(() => {
    if (quotation) {
      setEstimator(quotation.estimatorName || 'أحمد كشك');
    }
  }, [quotation]);

  const editingRoom = quotation?.rooms.find(r => r.id === editingRoomId);
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
    if (!quotation) return;

    const heavyFab = inventory.find(f => f.code === heavyCode);
    const sheerFab = inventory.find(f => f.code === sheerCode);
    const blackoutFab = inventory.find(f => f.code === blackoutCode);

    const updatedList = quotations.map(q => {
      if (q.id !== quotation.id) return q;

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
          heavyFabricCode: heavyCode,
          heavyFabricName: heavyFab?.name || 'قطيفة جاجوار تركيات',
          heavyTapeType,
          heavyMultiplier,
          heavyMeters: effectiveHeavyMeters,
          heavyPrice: heavyP,

          sheerFabricCode: sheerCode,
          sheerFabricName: sheerFab?.name || 'شيفون حرير فاخر',
          sheerTapeType,
          sheerMultiplier,
          sheerMeters: effectiveSheerMeters,
          sheerPrice: sheerP,

          blackoutFabricCode: hasBlackout ? blackoutCode : '',
          blackoutFabricName: hasBlackout ? (blackoutFab?.name || 'بلاك آوت عازل ثلاثي') : undefined,
          blackoutMultiplier,
          blackoutMeters: effectiveBlackoutMeters,
          blackoutPrice: hasBlackout ? blackoutP : 0,

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
    alert('تم حفظ اختيار الأقمشة والتسعير بنجاح ✓');
  };

  const handleDepositChange = (amount: number) => {
    if (!quotation) return;
    const updatedList = quotations.map(q => {
      if (q.id !== quotation.id) return q;
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
    if (!quotation || quotation.totalAmount === 0) {
      alert('الرجاء اختيار الأقمشة وتسعير غرف العميل أولاً قبل تحويل العقد للورشة');
      return;
    }
    const updatedList = quotations.map(q => q.id === quotation.id ? { ...q, status: 'تم التحويل للورشة' as const } : q);
    setQuotations(updatedList);
    saveAllQuotations(updatedList);
    alert('تم اعتماد العقد وتحويل أمر التشغيل إلى الورشة (المرحلة 3: القص والتفصيل) بنجاح.');
    router.push('/pipeline/pricing');
  };

  if (!quotation) {
    return (
      <PageShell title="تفاصيل التسعير والتعاقد">
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-bold">لم يتم العثور على عقد بهذا الرقم.</p>
          <Link href="/pipeline/pricing" className="mt-4 inline-block bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold">
            ← العودة لقائمة العقود
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={`تسعير عقد العميل: ${quotation.customerName}`}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Top Navigation Bar & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/pipeline/pricing"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              title="العودة للقائمة"
            >
              ←
            </Link>
            <div>
              <h1 className="font-black text-xl text-slate-900 leading-tight">{quotation.customerName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
              quotation.status === 'معتمد ومسدد العربون' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : quotation.status === 'تم إرسال المقايسة' ? 'bg-blue-50 text-blue-800 border-blue-200'
              : quotation.status === 'تم التحويل للورشة' ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {quotation.status}
            </span>
          </div>
        </div>

        {/* Section 1: Customer Details Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="font-black text-sm text-slate-900 border-r-4 border-amber-500 pr-2.5">
            معلومات العميل والمعاينة الميدانية:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 font-bold block">اسم العميل:</span>
              <strong className="text-slate-900 text-sm">{quotation.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">رقم الهاتف:</span>
              <strong className="text-slate-900 font-mono text-sm" dir="ltr">{quotation.phone}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">عنوان المعاينة والتركيب:</span>
              <strong className="text-slate-800">{quotation.address}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">مسؤول المبيعات والتسعير:</span>
              <strong className="text-slate-900 text-sm block mt-1">{estimator || 'أحمد كشك'}</strong>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center">
            <span className="text-xs text-slate-500 font-bold block">إجمالي المقايسة بالكامل</span>
            <span className="font-mono font-black text-2xl text-slate-900 mt-1 block">
              {quotation.totalAmount.toLocaleString()} جنيه
            </span>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-2xs text-center">
            <span className="text-xs text-emerald-800 font-bold block">العربون المسدد وحجز المخزن</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <input
                type="number"
                value={quotation.depositPaid || ''}
                onChange={(e) => handleDepositChange(Number(e.target.value))}
                className="w-28 bg-white border border-emerald-300 rounded-xl px-3 py-1 text-emerald-950 font-mono font-black text-center text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
              <span className="text-sm font-bold text-emerald-900">جنيه</span>
            </div>
          </div>

          <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 shadow-2xs text-center">
            <span className="text-xs text-rose-800 font-bold block">المتبقي للتحصيل عند التركيب</span>
            <span className="font-mono font-black text-2xl text-rose-900 mt-1 block">
              {quotation.remainingAmount.toLocaleString()} جنيه
            </span>
          </div>
        </div>

        {/* Section 3: Detailed Rooms Table & Fabric Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="font-black text-base text-indigo-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">room_preferences</span>
              تفاصيل غرف العميل والأقمشة والتسعير ({quotation.rooms.length} غرفة):
            </h2>
          </div>

          {quotation.rooms.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 bg-slate-50 border border-slate-200 rounded-xl">
              لا توجد غرف مسجلة بهذه المعاينة.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quotation.rooms.map((room) => {
                const isEditing = editingRoomId === room.id;
                const widthM = room.widthCm / 100;

                return (
                  <div
                    key={room.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all space-y-4 shadow-3xs ${
                      isEditing ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Header: Room name, specs tags and price */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-indigo-950 text-sm sm:text-base">{room.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] font-mono text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                            مقاس الحائط: {room.widthCm}×{room.heightCm} سم ({widthM.toFixed(2)}م)
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                            {room.sides === 2 ? 'جنبين' : 'جنب'}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {room.installationType || 'تراك سقف'}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {room.ceilingType || 'بيت نور'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-start sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">إجمالي سعر الغرفة</span>
                          <strong className="font-mono font-black text-xl text-slate-900 block leading-tight">
                            {room.totalSellPrice.toLocaleString()} ج
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => isEditing ? setEditingRoomId(null) : startPricingRoom(room)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isEditing
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : 'bg-slate-900 hover:bg-slate-850 text-white border-slate-900 shadow-2xs'
                          }`}
                        >
                          {isEditing ? 'إغلاق ✕' : 'تسعير / تعديل'}
                        </button>
                      </div>
                    </div>

                    {/* Card Body: Room fabric layers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                      {/* Layer 1: Heavy Fabric */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-1">
                        <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">١. قماش الجوانب (الثقيل)</span>
                        <strong className="text-slate-950 text-xs block">{room.heavyFabricName || 'لم يحدد'}</strong>
                        <div className="text-[11px] text-slate-500 font-mono">
                          شريط {room.heavyTapeType || '٣ فتلة'} (معامل ×{room.heavyMultiplier ?? 2.0})
                        </div>
                        <div className="font-mono font-bold text-indigo-900 text-[11px] pt-1">
                          {room.heavyMeters}م × {room.heavyPrice}ج = {(room.heavyMeters * room.heavyPrice).toLocaleString()} ج
                        </div>
                      </div>

                      {/* Layer 2: Sheer Fabric */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-1">
                        <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">٢. قماش الخلفية (الشيفون)</span>
                        <strong className="text-slate-950 text-xs block">{room.sheerFabricName || 'لم يحدد'}</strong>
                        <div className="text-[11px] text-slate-500 font-mono">
                          شريط {room.sheerTapeType || 'ويفي'} (معامل ×{room.sheerMultiplier ?? 2.5})
                        </div>
                        <div className="font-mono font-bold text-amber-900 text-[11px] pt-1">
                          {room.sheerMeters}م × {room.sheerPrice}ج = {(room.sheerMeters * room.sheerPrice).toLocaleString()} ج
                        </div>
                      </div>

                      {/* Layer 3: Blackout Layer */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-150 space-y-1">
                        <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">٣. طبقة البلاك آوت</span>
                        {room.blackoutMeters > 0 && room.blackoutFabricName ? (
                          <>
                            <strong className="text-slate-900 text-xs block">{room.blackoutFabricName}</strong>
                            <div className="text-[11px] text-slate-500 font-mono">
                              (معامل ×{room.blackoutMultiplier ?? 1.20}) • {room.blackoutMeters}م
                            </div>
                            <div className="font-mono font-bold text-slate-950 text-[11px] pt-1">
                              {(room.blackoutMeters * room.blackoutPrice).toLocaleString()} ج
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 block pt-1">- لا يوجد -</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4: Clean Dedicated Room Fabric Pricing Form (When active) */}
        {editingRoom && (
          <div className="bg-white p-6 rounded-2xl border-2 border-amber-400 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">tune</span>
                تحديد أقمشة ({editingRoom.name}) — عرض الحائط: {editingWidthM.toFixed(2)} م
              </h3>
              <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                المقاس: {editingRoom.widthCm}×{editingRoom.heightCm} سم
              </span>
            </div>

            <div className="space-y-4">
              {/* Layer 1: Heavy Fabric */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <label className="font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
                    قماش الجوانب (القطيفة / الثقيل):
                  </label>
                  <span className="font-mono text-slate-800 font-bold text-xs">
                    الكمية: {heavyMeters} متر • الإجمالي: {(heavyMeters * heavyP).toLocaleString()} ج
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-slate-600 font-bold">نوع الشريط:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {TAPE_OPTIONS.map(tape => (
                      <button
                        key={tape.name}
                        type="button"
                        onClick={() => handleHeavyTapeSelect(tape.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          heavyTapeType === tape.name
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {tape.name} (×{tape.defaultMultiplier})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 mr-auto">
                    <span className="text-slate-500 text-xs">معامل:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={heavyMultiplier}
                      onChange={e => handleHeavyMultiplierChange(Number(e.target.value))}
                      className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs"
                    />
                    <span className="text-slate-500 text-xs mr-2">الأمتار:</span>
                    <input
                      type="number"
                      step="0.05"
                      value={heavyMeters}
                      onChange={e => setHeavyMeters(Number(e.target.value))}
                      className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs bg-amber-50/50"
                    />
                    <span className="text-slate-500 text-xs">متر</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <select
                    value={heavyCode}
                    onChange={e => handleFabricSelect('heavy', e.target.value)}
                    className="sm:col-span-2 border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900"
                  >
                    <option value="">-- اختر قماش الجوانب من المخزون --</option>
                    {inventory.filter(f => f.category === 'قطيفة / ثقيل' || f.category === 'كتان / درابيري').map(f => (
                      <option key={f.code} value={f.code}>
                        [{f.code}] {f.name} — ({f.pricePerMeter}ج/م)
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center border border-slate-300 rounded-xl bg-white px-3 py-2">
                    <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                    <input
                      type="number"
                      value={heavyP}
                      onChange={e => setHeavyP(Number(e.target.value))}
                      className="w-full font-mono font-bold text-center text-xs"
                    />
                    <span className="text-slate-500 font-bold">ج</span>
                  </div>
                </div>
              </div>

              {/* Layer 2: Sheer Fabric */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <label className="font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">2</span>
                    قماش الخلفية (الشيفون / التول):
                  </label>
                  <span className="font-mono text-slate-800 font-bold text-xs">
                    الكمية: {sheerMeters} متر • الإجمالي: {(sheerMeters * sheerP).toLocaleString()} ج
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-slate-600 font-bold">نوع الشريط:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {TAPE_OPTIONS.map(tape => (
                      <button
                        key={tape.name}
                        type="button"
                        onClick={() => handleSheerTapeSelect(tape.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          sheerTapeType === tape.name
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {tape.name} (×{tape.defaultMultiplier})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 mr-auto">
                    <span className="text-slate-500 text-xs">معامل:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={sheerMultiplier}
                      onChange={e => handleSheerMultiplierChange(Number(e.target.value))}
                      className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs"
                    />
                    <span className="text-slate-500 text-xs mr-2">الأمتار:</span>
                    <input
                      type="number"
                      step="0.05"
                      value={sheerMeters}
                      onChange={e => setSheerMeters(Number(e.target.value))}
                      className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs bg-amber-50/50"
                    />
                    <span className="text-slate-500 text-xs">متر</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <select
                    value={sheerCode}
                    onChange={e => handleFabricSelect('sheer', e.target.value)}
                    className="sm:col-span-2 border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900"
                  >
                    <option value="">-- اختر قماش الخلفية من المخزون --</option>
                    {inventory.filter(f => f.category === 'شيفون / تول').map(f => (
                      <option key={f.code} value={f.code}>
                        [{f.code}] {f.name} — ({f.pricePerMeter}ج/م)
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center border border-slate-300 rounded-xl bg-white px-3 py-2">
                    <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                    <input
                      type="number"
                      value={sheerP}
                      onChange={e => setSheerP(Number(e.target.value))}
                      className="w-full font-mono font-bold text-center text-xs"
                    />
                    <span className="text-slate-500 font-bold">ج</span>
                  </div>
                </div>
              </div>

              {/* Layer 3: Blackout Layer */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
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
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">3</span>
                    طبقة بلاك آوت عازل حراري ومائي (اختياري)
                  </label>
                  {hasBlackout && (
                    <span className="font-mono text-slate-800 font-bold text-xs">
                      {blackoutMeters} متر • الإجمالي: {(blackoutMeters * blackoutP).toLocaleString()} ج
                    </span>
                  )}
                </div>

                {hasBlackout && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-xs">معامل:</span>
                      <input
                        type="number"
                        step="0.05"
                        value={blackoutMultiplier}
                        onChange={e => handleBlackoutMultiplierChange(Number(e.target.value))}
                        className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs"
                      />
                      <span className="text-slate-500 text-xs mr-2">الأمتار:</span>
                      <input
                        type="number"
                        step="0.05"
                        value={blackoutMeters}
                        onChange={e => setBlackoutMeters(Number(e.target.value))}
                        className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs bg-slate-100"
                      />
                    </div>

                    <select
                      value={blackoutCode}
                      onChange={e => handleFabricSelect('blackout', e.target.value)}
                      className="border border-slate-300 rounded-xl p-2 bg-white font-bold text-slate-900"
                    >
                      <option value="">-- اختر خامة البلاك آوت --</option>
                      {inventory.filter(f => f.category === 'بلاك آوت عازل').map(f => (
                        <option key={f.code} value={f.code}>
                          [{f.code}] {f.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center border border-slate-300 rounded-xl bg-white px-3 py-2">
                      <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                      <input
                        type="number"
                        value={blackoutP}
                        onChange={e => setBlackoutP(Number(e.target.value))}
                        className="w-full font-mono font-bold text-center text-xs"
                      />
                      <span className="text-slate-500 font-bold">ج</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Accessories & Fees */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-bold text-xs whitespace-nowrap">مجرى (متر):</span>
                  <input type="number" value={trackP} onChange={e => setTrackP(Number(e.target.value))} className="w-full text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md py-0.5" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-bold text-xs whitespace-nowrap">شريط (متر):</span>
                  <input type="number" value={tapeP} onChange={e => setTapeP(Number(e.target.value))} className="w-full text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md py-0.5" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-bold text-xs whitespace-nowrap">ترزي (جنب):</span>
                  <input type="number" value={tailorP} onChange={e => setTailorP(Number(e.target.value))} className="w-full text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md py-0.5" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-bold text-xs whitespace-nowrap">رسوم التركيب:</span>
                  <input type="number" value={installF} onChange={e => setInstallF(Number(e.target.value))} className="w-full text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md py-0.5" />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingRoomId(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => saveRoomPricing(editingRoom.id)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                حفظ تسعير الغرفة ✓
              </button>
            </div>
          </div>
        )}

        {/* Section 5: Final Submission Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={() => setShowPrintModal(true)}
            disabled={quotation.totalAmount === 0}
            className="w-full sm:w-auto border border-slate-300 hover:bg-slate-50 text-slate-800 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            معاينة المقايسة وطباعة العقد (PDF)
          </button>

          <button
            onClick={handleSendToWorkshop}
            disabled={quotation.totalAmount === 0}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">content_cut</span>
            اعتماد العقد وتحويل لورشة القص والتفصيل (المرحلة 3) ←
          </button>
        </div>
      </div>

      {/* Official Contract Print Modal */}
      <ContractPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        data={quotation as PrintContractData}
      />
    </PageShell>
  );
}
