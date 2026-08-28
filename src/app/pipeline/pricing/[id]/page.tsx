'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ContractPrintModal, { PrintContractData } from '@/components/ContractPrintModal';
import {
  getStoredQuotations,
  saveAllQuotations,
  saveOrUpdateInspection,
  getInspectionById,
  QuotationOrder,
  RoomPricing,
  TAPE_PRICES,
  TAPE_MULTIPLIERS,
  ACCESSORY_PRICES,
  PipeAccessories
} from '@/lib/inspectionsStore';
import { canUserEditPrices } from '@/lib/permissions';

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
  const canEditPrices = canUserEditPrices('p_pricing');

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [estimator, setEstimator] = useState<string>('أحمد كشك');

  // Layer Toggles
  const [heavyEnabled, setHeavyEnabled] = useState<boolean>(true);
  const [sheerEnabled, setSheerEnabled] = useState<boolean>(true);
  const [blackoutEnabled, setBlackoutEnabled] = useState<boolean>(false);

  // 1. Heavy Fabric State (1st Layer)
  const [heavyTapeType, setHeavyTapeType] = useState<string>('٣ فتلة');
  const [heavyMultiplier, setHeavyMultiplier] = useState<number>(2.0);
  const [heavyMeters, setHeavyMeters] = useState<number>(5.0);
  const [heavyCode, setHeavyCode] = useState<string>('HV-201');
  const [heavyTapePrice, setHeavyTapePrice] = useState<number>(50);
  const [heavyP, setHeavyP] = useState<number>(380);

  // 2. Sheer Fabric State (2nd Layer)
  const [sheerTapeType, setSheerTapeType] = useState<string>('ويفي');
  const [sheerTapePrice, setSheerTapePrice] = useState<number>(140);
  const [sheerMultiplier, setSheerMultiplier] = useState<number>(2.5);
  const [sheerMeters, setSheerMeters] = useState<number>(6.25);
  const [sheerCode, setSheerCode] = useState<string>('SH-101');
  const [sheerP, setSheerP] = useState<number>(160);

  // 3. Blackout Layer State (3rd Layer)
  const [blackoutTapeType, setBlackoutTapeType] = useState<string>('جراب');
  const [blackoutTapePrice, setBlackoutTapePrice] = useState<number>(50);
  const [blackoutMultiplier, setBlackoutMultiplier] = useState<number>(1.20);
  const [blackoutMeters, setBlackoutMeters] = useState<number>(3.0);
  const [blackoutCode, setBlackoutCode] = useState<string>('BK-301');
  const [blackoutP, setBlackoutP] = useState<number>(250);

  // Installation Category: Track vs Forge Pipe
  const [installationCategory, setInstallationCategory] = useState<'تراك' | 'مواسير فورجيه'>('تراك');
  const [trackPricePerMeter, setTrackPricePerMeter] = useState<number>(100);
  const [pipeTypeDescription, setPipeTypeDescription] = useState<'سادة' | 'مجدول'>('سادة');
  const [pipeColor, setPipeColor] = useState<'فضى' | 'أوكسيديه' | 'أسود' | 'زيتى'>('فضى');
  const [pipePricePerMeter, setPipePricePerMeter] = useState<number>(65);

  const [accessoryPrices, setAccessoryPrices] = useState({
    doubleBracket: 55,
    singleBracket: 45,
    sideCap: 50,
    doubleRing: 5,
    decorHanger: 100,
  });

  const [pipeAccessories, setPipeAccessories] = useState<PipeAccessories>({
    doubleBrackets: 0,
    singleBrackets: 0,
    sideCaps: 0,
    doubleRings: 0,
    decorHangers: 0,
  });

  const [installFeeEnabled, setInstallFeeEnabled] = useState<boolean>(true);
  const [installFee, setInstallFee] = useState<number>(125);
  const [transportFeeEnabled, setTransportFeeEnabled] = useState<boolean>(false);
  const [transportFee, setTransportFee] = useState<number>(0);
  const [sheerPieces, setSheerPieces] = useState<'قطعة واحدة' | 'قطعتين'>('قطعة واحدة');

  const [showWorkshopModal, setShowWorkshopModal] = useState<boolean>(false);

  useEffect(() => {
    if (quotation) {
      setEstimator(quotation.estimatorName || 'أحمد كشك');
      setDeliveryDate(quotation.deliveryDate || '');
    }
  }, [quotation]);

  const editingRoom = quotation?.rooms.find(r => r.id === editingRoomId);
  const editingWidthM = editingRoom ? editingRoom.widthCm / 100 : 2.5;

  const startPricingRoom = (room: RoomPricing) => {
    setEditingRoomId(room.id);
    const widthM = room.widthCm / 100;

    setHeavyEnabled(room.heavyEnabled !== false);
    setSheerEnabled(room.sheerEnabled !== false);
    setBlackoutEnabled(!!room.blackoutEnabled);

    const hTape = room.heavyTapeType || '٣ فتلة';
    const hMul = room.heavyMultiplier ?? (TAPE_MULTIPLIERS[hTape] || 2.0);
    const hM = room.heavyMeters || Math.round(widthM * hMul * 100) / 100;
    setHeavyTapeType(hTape);
    setHeavyTapePrice(TAPE_PRICES[hTape] || 50);
    setHeavyMultiplier(hMul);
    setHeavyMeters(hM);
    setHeavyCode(room.heavyFabricCode || 'HV-201');
    setHeavyP(room.heavyPrice || 380);

    const sTape = room.sheerTapeType || 'ويفي';
    const sMul = room.sheerMultiplier ?? (TAPE_MULTIPLIERS[sTape] || 2.5);
    const sM = room.sheerMeters || Math.round(widthM * sMul * 100) / 100;
    setSheerTapeType(sTape);
    setSheerTapePrice(TAPE_PRICES[sTape] || 140);
    setSheerMultiplier(sMul);
    setSheerMeters(sM);
    setSheerCode(room.sheerFabricCode || 'SH-101');
    setSheerP(room.sheerPrice || 160);

    const bkTape = room.blackoutTapeType || 'جراب';
    const bkMul = room.blackoutMultiplier ?? 1.20;
    const bkM = room.blackoutMeters || Math.round(widthM * bkMul * 100) / 100;
    setBlackoutTapeType(bkTape);
    setBlackoutTapePrice(TAPE_PRICES[bkTape] || 50);
    setBlackoutMultiplier(bkMul);
    setBlackoutMeters(bkM);
    setBlackoutCode(room.blackoutFabricCode || 'BK-301');
    setBlackoutP(room.blackoutPrice || 250);

    const isPipe = room.installationType?.includes('مواسير') || room.installationCategory === 'مواسير فورجيه';
    setInstallationCategory(isPipe ? 'مواسير فورجيه' : 'تراك');
    setTrackPricePerMeter(room.trackPrice || 100);
    setPipeTypeDescription(room.pipeTypeDescription || 'سادة');
    setPipeColor(room.pipeColor || 'فضى');
    setPipePricePerMeter(room.pipePricePerMeter || 65);
    setPipeAccessories(room.pipeAccessories || {
      doubleBrackets: isPipe ? 2 : 0,
      singleBrackets: 0,
      sideCaps: isPipe ? 2 : 0,
      doubleRings: 0,
      decorHangers: 0,
    });

    setInstallFeeEnabled(room.installFeeEnabled !== false);
    setInstallFee(room.installFee ?? 125);
    setTransportFeeEnabled(!!room.transportFeeEnabled);
    setTransportFee(room.transportFee ?? 0);
  };

  const handleHeavyTapeSelect = (tapeName: string) => {
    setHeavyTapeType(tapeName);
    setHeavyTapePrice(TAPE_PRICES[tapeName] || 50);
    const mul = TAPE_MULTIPLIERS[tapeName] || 2.0;
    setHeavyMultiplier(mul);
    setHeavyMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleSheerTapeSelect = (tapeName: string) => {
    setSheerTapeType(tapeName);
    setSheerTapePrice(TAPE_PRICES[tapeName] || 140);
    const mul = TAPE_MULTIPLIERS[tapeName] || 2.5;
    setSheerMultiplier(mul);
    setSheerMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleBlackoutTapeSelect = (tapeName: string) => {
    setBlackoutTapeType(tapeName);
    setBlackoutTapePrice(TAPE_PRICES[tapeName] || 50);
    const mul = TAPE_MULTIPLIERS[tapeName] || 1.2;
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

  const saveDeliveryDate = (newDate: string) => {
    setDeliveryDate(newDate);
    if (!quotation) return;
    const updated = quotations.map(q => q.id === quotation.id ? { ...q, deliveryDate: newDate } : q);
    setQuotations(updated);
    saveAllQuotations(updated);
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

        const effectiveHeavyMeters = heavyEnabled ? (heavyMeters > 0 ? heavyMeters : Math.round(editingWidthM * heavyMultiplier * 100) / 100) : 0;
        const effectiveSheerMeters = sheerEnabled ? (sheerMeters > 0 ? sheerMeters : Math.round(editingWidthM * sheerMultiplier * 100) / 100) : 0;
        const effectiveBlackoutMeters = blackoutEnabled ? (blackoutMeters > 0 ? blackoutMeters : Math.round(editingWidthM * blackoutMultiplier * 100) / 100) : 0;

        const heavyCost = effectiveHeavyMeters * heavyP;
        const sheerCost = effectiveSheerMeters * sheerP;
        const blackoutCost = effectiveBlackoutMeters * blackoutP;

        // Tape Costs
        const heavyTapeCost = effectiveHeavyMeters * (TAPE_PRICES[heavyTapeType] || 50);
        const sheerTapeCost = effectiveSheerMeters * (TAPE_PRICES[sheerTapeType] || 140);
        const blackoutTapeCost = effectiveBlackoutMeters * (TAPE_PRICES[blackoutTapeType] || 50);
        const totalTapeCost = heavyTapeCost + sheerTapeCost + blackoutTapeCost;

        // Active layers count
        const activeLayersCount = (heavyEnabled ? 1 : 0) + (sheerEnabled ? 1 : 0) + (blackoutEnabled ? 1 : 0);

        let installationTotal = 0;
        let trackMeters = 0;
        let trackPrice = 0;

        if (installationCategory === 'تراك') {
          trackMeters = editingWidthM * activeLayersCount;
          trackPrice = trackPricePerMeter || ACCESSORY_PRICES.trackPerMeter;
          installationTotal = trackMeters * trackPrice;
        } else {
          // Forge pipe calculation
          const pipeMeters = editingWidthM;
          const pipeBaseCost = pipeMeters * (pipePricePerMeter || 65);
          const accessoriesCost =
            (pipeAccessories.doubleBrackets * ACCESSORY_PRICES.doubleBracket) +
            (pipeAccessories.singleBrackets * ACCESSORY_PRICES.singleBracket) +
            (pipeAccessories.sideCaps * ACCESSORY_PRICES.sideCap) +
            (pipeAccessories.doubleRings * ACCESSORY_PRICES.doubleRing) +
            (pipeAccessories.decorHangers * ACCESSORY_PRICES.decorHanger);
          installationTotal = pipeBaseCost + accessoriesCost;
        }

        const effectiveInstallFee = installFeeEnabled ? installFee : 0;
        const effectiveTransportFee = transportFeeEnabled ? (transportFee || 0) : 0;

        const total = heavyCost + sheerCost + blackoutCost + totalTapeCost + installationTotal + effectiveInstallFee + effectiveTransportFee;

        return {
          ...rm,
          heavyEnabled,
          sheerEnabled,
          blackoutEnabled,

          heavyFabricCode: heavyEnabled ? heavyCode : '',
          heavyFabricName: heavyEnabled ? (heavyFab?.name || 'قطيفة جاجوار تركيات') : 'غير محدد',
          heavyTapeType,
          heavyMultiplier,
          heavyMeters: effectiveHeavyMeters,
          heavyPrice: heavyP,

          sheerFabricCode: sheerEnabled ? sheerCode : '',
          sheerFabricName: sheerEnabled ? (sheerFab?.name || 'شيفون حرير فاخر') : 'غير محدد',
          sheerTapeType,
          sheerMultiplier,
          sheerMeters: effectiveSheerMeters,
          sheerPrice: sheerP,

          blackoutFabricCode: blackoutEnabled ? blackoutCode : '',
          blackoutFabricName: blackoutEnabled ? (blackoutFab?.name || 'بلاك آوت عازل ثلاثي') : undefined,
          blackoutTapeType,
          blackoutMultiplier,
          blackoutMeters: effectiveBlackoutMeters,
          blackoutPrice: blackoutEnabled ? blackoutP : 0,

          installationCategory,
          installationType: installationCategory === 'تراك' ? `تراك سقف (${activeLayersCount} طبقة)` : `مواسير فورجيه (${pipeTypeDescription} - ${pipeColor})`,
          trackMeters,
          trackPrice,
          pipeTypeDescription,
          pipeColor,
          pipePricePerMeter,
          pipeAccessories,

          tapeMeters: Math.round((effectiveHeavyMeters + effectiveSheerMeters + effectiveBlackoutMeters) * 100) / 100,
          tapePrice: 50,
          tailorPricePerSide: 0,
          installFeeEnabled,
          installFee: effectiveInstallFee,
          transportFeeEnabled,
          transportFee: effectiveTransportFee,
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
        deliveryDate,
        status: q.status === 'بانتظار التسعير' ? ('تم إرسال المقايسة' as const) : q.status,
      };
    });

    setQuotations(updatedList);
    saveAllQuotations(updatedList);
    setEditingRoomId(null);
    alert('تم حفظ اختيار الأقمشة والتكلفة والأشرطة بنجاح ✓');
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

    // Sync inspection status to 'في الورشة'
    const insp = getInspectionById(quotation.inspectionId);
    if (insp) {
      insp.status = 'في الورشة';
      insp.isLocked = true;
      saveOrUpdateInspection(insp);
    }

    alert('تم اعتماد العقد وتحويل أمر التشغيل إلى الورشة والقص والتفصيل بنجاح ✓.');
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
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
            <div>
              <span className="text-amber-800 font-bold block">📅 موعد / تاريخ التركيب:</span>
              <input
                type="date"
                value={deliveryDate || ''}
                onChange={(e) => {
                  const d = e.target.value;
                  setDeliveryDate(d);
                  if (quotation) {
                    const updatedList = quotations.map(q => q.id === quotation.id ? { ...q, deliveryDate: d } : q);
                    setQuotations(updatedList);
                    saveAllQuotations(updatedList);
                  }
                }}
                className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-slate-900 font-mono font-bold text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              />
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
                <div className="flex items-center justify-between text-xs">
                  <label className="font-black text-slate-900 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={heavyEnabled}
                      onChange={e => setHeavyEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                    />
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
                    ١. قماش الجوانب (القطيفة / الثقيل)
                  </label>
                  {heavyEnabled && (
                    <span className="font-mono text-slate-800 font-bold text-xs">
                      الكمية: {heavyMeters} متر • الإجمالي: {(heavyMeters * heavyP).toLocaleString()} ج
                    </span>
                  )}
                </div>

                {heavyEnabled && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-200">
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
                            {tape.name}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 mr-auto">
                        <span className="text-slate-500 text-xs font-bold">سعر الشريط:</span>
                        <input
                          type="number"
                          value={heavyTapePrice}
                          disabled={!canEditPrices}
                          onChange={e => setHeavyTapePrice(Number(e.target.value))}
                          className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs"
                        />
                        <span className="text-slate-500 text-xs">ج/م</span>

                        <span className="text-slate-500 text-xs">معامل:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={heavyMultiplier}
                          onChange={e => {
                            const mul = Number(e.target.value);
                            setHeavyMultiplier(mul);
                            setHeavyMeters(Math.round(editingWidthM * mul * 100) / 100);
                          }}
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
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <div className={`flex items-center border rounded-xl px-3 py-2 ${!canEditPrices ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-300'}`}>
                        <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                        <input
                          type="number"
                          value={heavyP}
                          disabled={!canEditPrices}
                          onChange={e => setHeavyP(Number(e.target.value))}
                          className="w-full font-mono font-bold text-center text-xs disabled:text-slate-500 disabled:cursor-not-allowed"
                          title={!canEditPrices ? 'تعديل السعر مغلق للصلاحيات' : ''}
                        />
                        <span className="text-slate-500 font-bold">ج</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Layer 2: Sheer Fabric */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-black text-slate-900 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sheerEnabled}
                      onChange={e => setSheerEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                    />
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">2</span>
                    ٢. قماش الخلفية (الشيفون / التول)
                  </label>
                  {sheerEnabled && (
                    <span className="font-mono text-slate-800 font-bold text-xs">
                      الكمية: {sheerMeters} متر • الإجمالي: {(sheerMeters * sheerP).toLocaleString()} ج
                    </span>
                  )}
                </div>

                {sheerEnabled && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-200">
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
                            {tape.name}
                          </button>
                        ))}
                      </div>

                      {/* Sheer Pieces Selection (قطعة واحدة أم قطعتين) */}
                      <div className="flex items-center gap-1.5 bg-blue-50/70 p-1 rounded-lg border border-blue-200">
                        <span className="text-blue-950 font-bold text-[11px]">تقسيم الخلفية:</span>
                        <button
                          type="button"
                          onClick={() => setSheerPieces('قطعة واحدة')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer transition-colors ${
                            sheerPieces === 'قطعة واحدة' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          قطعة واحدة
                        </button>
                        <button
                          type="button"
                          onClick={() => setSheerPieces('قطعتين')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer transition-colors ${
                            sheerPieces === 'قطعتين' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          قطعتين
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mr-auto">
                        <span className="text-slate-500 text-xs font-bold">سعر الشريط:</span>
                        <input
                          type="number"
                          value={sheerTapePrice}
                          disabled={!canEditPrices}
                          onChange={e => setSheerTapePrice(Number(e.target.value))}
                          className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs"
                        />
                        <span className="text-slate-500 text-xs">ج/م</span>

                        <span className="text-slate-500 text-xs">معامل:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={sheerMultiplier}
                          onChange={e => {
                            const mul = Number(e.target.value);
                            setSheerMultiplier(mul);
                            setSheerMeters(Math.round(editingWidthM * mul * 100) / 100);
                          }}
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
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <div className={`flex items-center border rounded-xl px-3 py-2 ${!canEditPrices ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-300'}`}>
                        <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                        <input
                          type="number"
                          value={sheerP}
                          disabled={!canEditPrices}
                          onChange={e => setSheerP(Number(e.target.value))}
                          className="w-full font-mono font-bold text-center text-xs disabled:text-slate-500 disabled:cursor-not-allowed"
                          title={!canEditPrices ? 'تعديل السعر مغلق للصلاحيات' : ''}
                        />
                        <span className="text-slate-500 font-bold">ج</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Layer 3: Blackout Layer */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-black text-slate-900 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blackoutEnabled}
                      onChange={e => setBlackoutEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                    />
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">3</span>
                    ٣. طبقة بلاك آوت عازل حراري ومائي (اختياري)
                  </label>
                  {blackoutEnabled && (
                    <span className="font-mono text-slate-800 font-bold text-xs">
                      الكمية: {blackoutMeters} متر • الإجمالي: {(blackoutMeters * blackoutP).toLocaleString()} ج
                    </span>
                  )}
                </div>

                {blackoutEnabled && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-600 font-bold">نوع الشريط:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {TAPE_OPTIONS.map(tape => (
                          <button
                            key={tape.name}
                            type="button"
                            onClick={() => handleBlackoutTapeSelect(tape.name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              blackoutTapeType === tape.name
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {tape.name}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 mr-auto">
                        <span className="text-slate-500 text-xs font-bold">سعر الشريط:</span>
                        <input
                          type="number"
                          value={blackoutTapePrice}
                          disabled={!canEditPrices}
                          onChange={e => setBlackoutTapePrice(Number(e.target.value))}
                          className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs"
                        />
                        <span className="text-slate-500 text-xs">ج/م</span>

                        <span className="text-slate-500 text-xs mr-2">معامل:</span>
                        <input
                          type="number"
                          step="0.05"
                          value={blackoutMultiplier}
                          onChange={e => {
                            const mul = Number(e.target.value);
                            setBlackoutMultiplier(mul);
                            setBlackoutMeters(Math.round(editingWidthM * mul * 100) / 100);
                          }}
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
                        <span className="text-slate-500 text-xs">متر</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                      <select
                        value={blackoutCode}
                        onChange={e => handleFabricSelect('blackout', e.target.value)}
                        className="sm:col-span-2 border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900"
                      >
                        <option value="">-- اختر خامة البلاك آوت من المخزون --</option>
                        {inventory.filter(f => f.category === 'بلاك آوت عازل').map(f => (
                          <option key={f.code} value={f.code}>
                            {f.name}
                          </option>
                        ))}
                      </select>

                      <div className={`flex items-center border rounded-xl px-3 py-2 ${!canEditPrices ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-300'}`}>
                        <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                        <input
                          type="number"
                          value={blackoutP}
                          disabled={!canEditPrices}
                          onChange={e => setBlackoutP(Number(e.target.value))}
                          className="w-full font-mono font-bold text-center text-xs disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-slate-500 font-bold">ج</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware Accessories (Track vs Pipe) */}
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                  <label className="font-black text-amber-950 text-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    طريقة التركيب والاكسسوارات (تراك أو مواسير فورجيه):
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInstallationCategory('تراك')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs border cursor-pointer ${
                        installationCategory === 'تراك' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      تراك (مجرى ألومنيوم)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallationCategory('مواسير فورجيه')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs border cursor-pointer ${
                        installationCategory === 'مواسير فورجيه' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      مواسير فورجيه واكسسوارات
                    </button>
                  </div>
                </div>

                {installationCategory === 'تراك' ? (
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div>
                      <strong className="text-slate-900 block text-xs">تراك ألومنيوم سقف / حائط:</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        يحسب أوتوماتيكياً حسب عدد الطبقات المفعلة للغرفة.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <span className="text-slate-700 font-bold text-xs">سعر متر التراك:</span>
                        <input
                          type="number"
                          value={trackPricePerMeter}
                          disabled={!canEditPrices}
                          onChange={e => setTrackPricePerMeter(Number(e.target.value))}
                          className="w-16 border border-slate-300 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-xs bg-white"
                        />
                        <span className="text-slate-600 font-bold text-xs">ج/م</span>
                      </div>
                      <div className="font-mono font-bold text-xs bg-amber-100 text-amber-950 px-3 py-1.5 rounded-lg border border-amber-300">
                        {editingWidthM.toFixed(2)}م × {(heavyEnabled ? 1 : 0) + (sheerEnabled ? 1 : 0) + (blackoutEnabled ? 1 : 0)} تراك × {trackPricePerMeter}ج = {(editingWidthM * ((heavyEnabled ? 1 : 0) + (sheerEnabled ? 1 : 0) + (blackoutEnabled ? 1 : 0)) * trackPricePerMeter).toLocaleString()} ج
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">وصف الماسورة:</label>
                        <select
                          value={pipeTypeDescription}
                          onChange={e => setPipeTypeDescription(e.target.value as any)}
                          className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                        >
                          <option value="سادة">سادة</option>
                          <option value="مجدول">مجدول</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">لون الماسورة:</label>
                        <select
                          value={pipeColor}
                          onChange={e => setPipeColor(e.target.value as any)}
                          className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                        >
                          <option value="فضى">فضى</option>
                          <option value="أوكسيديه">أوكسيديه</option>
                          <option value="أسود">أسود</option>
                          <option value="زيتى">زيتى</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-700 font-bold block mb-1">سعر متر الماسورة:</label>
                        <input
                          type="number"
                          value={pipePricePerMeter}
                          disabled={!canEditPrices}
                          onChange={e => setPipePricePerMeter(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-1.5 text-center font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <strong className="text-slate-900 block mb-2">اكسسوارات المواسير (الكمية وسعر القطعة):</strong>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-[11px] text-slate-700 block font-bold">حامل مجوز</span>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>عدد:</span>
                            <input
                              type="number"
                              value={pipeAccessories.doubleBrackets}
                              onChange={e => setPipeAccessories({ ...pipeAccessories, doubleBrackets: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>سعر:</span>
                            <input
                              type="number"
                              value={accessoryPrices.doubleBracket}
                              disabled={!canEditPrices}
                              onChange={e => setAccessoryPrices({ ...accessoryPrices, doubleBracket: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-[11px] text-slate-700 block font-bold">حامل مفرد</span>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>عدد:</span>
                            <input
                              type="number"
                              value={pipeAccessories.singleBrackets}
                              onChange={e => setPipeAccessories({ ...pipeAccessories, singleBrackets: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>سعر:</span>
                            <input
                              type="number"
                              value={accessoryPrices.singleBracket}
                              disabled={!canEditPrices}
                              onChange={e => setAccessoryPrices({ ...accessoryPrices, singleBracket: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-[11px] text-slate-700 block font-bold">قم جانبي</span>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>عدد:</span>
                            <input
                              type="number"
                              value={pipeAccessories.sideCaps}
                              onChange={e => setPipeAccessories({ ...pipeAccessories, sideCaps: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>سعر:</span>
                            <input
                              type="number"
                              value={accessoryPrices.sideCap}
                              disabled={!canEditPrices}
                              onChange={e => setAccessoryPrices({ ...accessoryPrices, sideCap: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-[11px] text-slate-700 block font-bold">حلقات دبل</span>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>عدد:</span>
                            <input
                              type="number"
                              value={pipeAccessories.doubleRings}
                              onChange={e => setPipeAccessories({ ...pipeAccessories, doubleRings: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>سعر:</span>
                            <input
                              type="number"
                              value={accessoryPrices.doubleRing}
                              disabled={!canEditPrices}
                              onChange={e => setAccessoryPrices({ ...accessoryPrices, doubleRing: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-[11px] text-slate-700 block font-bold">شماعة ديكور</span>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>عدد:</span>
                            <input
                              type="number"
                              value={pipeAccessories.decorHangers}
                              onChange={e => setPipeAccessories({ ...pipeAccessories, decorHangers: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>سعر:</span>
                            <input
                              type="number"
                              value={accessoryPrices.decorHanger}
                              disabled={!canEditPrices}
                              onChange={e => setAccessoryPrices({ ...accessoryPrices, decorHanger: Number(e.target.value) })}
                              className="w-12 border border-slate-300 rounded p-0.5 text-center font-mono font-bold bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Installation Fee (Optional) & Transport Fee (Optional) */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                {/* 1. Installation Fee Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <label className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={installFeeEnabled}
                      onChange={e => setInstallFeeEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>إضافة رسوم تركيب الستارة للغرفة (اختياري عند طلب التركيب):</span>
                  </label>
                  {installFeeEnabled ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={installFee}
                        onChange={e => setInstallFee(Number(e.target.value))}
                        className="w-24 text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg py-1 text-xs"
                      />
                      <span className="font-bold text-slate-700">جنيه</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-bold italic">بدون رسوم تركيب (0ج)</span>
                  )}
                </div>

                {/* 2. Transport/Shipping Fee Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <label className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={transportFeeEnabled}
                      onChange={e => setTransportFeeEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>إضافة رسوم نقل وتوصيل (اختياري عند النقل لمحافظة أخرى):</span>
                  </label>
                  {transportFeeEnabled ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="السعر"
                        value={transportFee || ''}
                        onChange={e => setTransportFee(Number(e.target.value))}
                        className="w-24 text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg py-1 text-xs"
                      />
                      <span className="font-bold text-slate-700">جنيه</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-bold italic">بدون رسوم نقل (0ج)</span>
                  )}
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
                className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors shadow-gold"
              >
                حفظ تسعير الغرفة والأقمشة ✓
              </button>
            </div>
          </div>
        )}

        {/* Section 5: Order Financial Summary & Detailed Breakdown */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-amber-300/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-amber-800 font-bold text-xs uppercase tracking-wider block">ملخص المقايسة الإجمالي</span>
              <h3 className="font-black text-lg text-slate-900">إجمالي العقد ({quotation.rooms.length} غرف مسجلة)</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block font-bold">إجمالي سعر الأوردر</span>
              <strong className="text-2xl font-mono font-black text-amber-950">
                {quotation.totalAmount.toLocaleString()} ج.م
              </strong>
            </div>
          </div>

          {/* Rooms breakdown list if more than 1 room */}
          {quotation.rooms.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {quotation.rooms.map((rm, idx) => (
                <div key={rm.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <strong className="text-slate-900 block font-bold">{idx + 1}. {rm.name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {rm.widthCm}×{rm.heightCm}سم • {rm.sides === 2 ? 'جنبين' : 'جنب'}
                    </span>
                  </div>
                  <strong className="font-mono text-amber-900 font-bold">
                    {rm.totalSellPrice.toLocaleString()} ج
                  </strong>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
            <div className="flex gap-4">
              <div>
                <span className="text-slate-500 block font-bold">العربون المسدد:</span>
                <strong className="text-emerald-700 font-mono text-sm">{quotation.depositPaid.toLocaleString()} ج</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">المتبقي للتحصيل:</span>
                <strong className="text-rose-700 font-mono text-sm">{quotation.remainingAmount.toLocaleString()} ج</strong>
              </div>
            </div>
            <div className="text-slate-500 text-[11px] font-mono font-bold">
              مسؤول المبيعات: {quotation.estimatorName || 'أحمد كشك'}
            </div>
          </div>
        </div>

        {/* Section 6: Final Submission Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            disabled={quotation.totalAmount === 0}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[19px]">picture_as_pdf</span>
            تحميل PDF
          </button>

          <button
            type="button"
            onClick={() => setShowWorkshopModal(true)}
            disabled={quotation.totalAmount === 0}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 px-7 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-gold transition-colors"
          >
            <span className="material-symbols-outlined text-[19px]">content_cut</span>
            تحويل لورشة القص
          </button>
        </div>
      </div>

      {/* Sleek Custom Workshop Confirmation Modal */}
      {showWorkshopModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-2xl border border-amber-200">
              <span className="material-symbols-outlined text-[28px]">content_cut</span>
              <div>
                <h3 className="font-black text-base text-slate-900">تحويل العقد لورشة القص والتفصيل</h3>
                <p className="text-xs text-slate-600">أمر تشغيل الورشة والمقايسة المعجبة</p>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم العميل:</span>
                <strong className="text-slate-900 font-bold">{quotation.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">عدد الغرف:</span>
                <strong className="font-bold">{quotation.rooms.length} غرف</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي المبلغ:</span>
                <strong className="font-mono font-bold text-amber-900">{quotation.totalAmount.toLocaleString()} ج.م</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الفرع:</span>
                <strong className="font-bold">{quotation.branch || 'الفرع الرئيسي'}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 text-center font-bold">
              هل أنت أسر بالتأكيد من اعتماد هذا العقد وتحويل أمر التفصيل والقص إلى الورشة؟
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWorkshopModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const updatedList = quotations.map(q => q.id === quotation.id ? { ...q, status: 'تم التحويل الى الورشه' as const } : q);
                  setQuotations(updatedList);
                  saveAllQuotations(updatedList);

                  const insp = getInspectionById(quotation.inspectionId);
                  if (insp) {
                    insp.status = 'في الورشة';
                    insp.isLocked = true;
                    saveOrUpdateInspection(insp);
                  }

                  setShowWorkshopModal(false);
                  router.push('/pipeline/pricing');
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                تأكيد التحويل للورشة ✓
              </button>
            </div>
          </div>
        </div>
      )}

      <ContractPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        data={quotation as any}
      />
    </PageShell>
  );
}
