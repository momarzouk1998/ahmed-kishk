'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ContractPrintModal, { PrintContractData } from '@/components/ContractPrintModal';
import {
  getStoredQuotations,
  fetchQuotations,
  saveAllQuotations,
  saveOrUpdateInspection,
  getInspectionById,
  QuotationOrder,
  RoomPricing,
  TAPE_PRICES,
  TAPE_MULTIPLIERS,
  PipeAccessories
} from '@/lib/inspectionsStore';
import { getStoredPipelineOrders, fetchPipelineOrders, saveStoredPipelineOrders, updatePipelineOrderStatus, PipelineMasterOrder, isTodayOrOverdue } from '@/lib/pipelineStore';
import { canUserEditPrices } from '@/lib/permissions';
import { useManagerGate, isManagerUnlocked } from '@/components/ManagerUnlockGate';
import { getCurtainDefaults } from '@/lib/curtainDefaults';
import SearchableFabricSelect from '@/components/SearchableFabricSelect';
import { useCurrentUser } from '@/lib/useCurrentUser';

interface InventoryFabric {
  id: string;
  code: string;
  name: string;
  // التصنيف نص حر (يكتبه المستخدم فى صفحة المخزون) — لا يوجد enum ثابت.
  category: string;
  unit: string;
  branch: string;
  sellPrice: number;
  totalQuantity: number;
}

/**
 * يجمّع قائمة الأقمشة حسب التصنيف الحقيقى المخزّن (نص حر)، مع تضمين اسم الفرع
 * فى تسمية كل صنف. لا يوجد أى فلترة بتصنيفات ثابتة — أى صنف تمت إضافته
 * فى صفحة المخزون بوحدة "متر" يظهر هنا مباشرة.
 */
function groupFabricsByCategory(list: InventoryFabric[]): Record<string, InventoryFabric[]> {
  const groups: Record<string, InventoryFabric[]> = {};
  list
    .filter(f => (f.unit || 'متر') === 'متر')
    .forEach(f => {
      const cat = f.category || 'غير مصنّف';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });
  return groups;
}

const TAPE_OPTIONS: { name: string; defaultMultiplier: number }[] = [
  { name: '٣ فتلة', defaultMultiplier: 2.0 },
  { name: 'إيكيا', defaultMultiplier: 2.0 },
  { name: 'ويفي', defaultMultiplier: 2.5 },
  { name: 'جراب', defaultMultiplier: 2.0 },
  { name: 'حلقات ديكور', defaultMultiplier: 2.0 },
];

const mockFabricsInventory: InventoryFabric[] = [];

export default function PricingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || '';
  const orderId = decodeURIComponent(rawId);

  const { user: currentUser, isAdmin } = useCurrentUser();

  const [quotations, setQuotations] = useState<QuotationOrder[]>(() => getStoredQuotations());
  const [inventory, setInventory] = useState<InventoryFabric[]>(mockFabricsInventory);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    async function load() {
      const list = await fetchQuotations();
      if (list && list.length > 0) {
        setQuotations(list);
      }
      try {
        const res = await fetch('/api/inventory', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.items)) {
            setInventory(json.items);
          }
        }
      } catch (e) {}
    }
    load();
  }, []);

  const quotation = quotations.find(q => q.id === orderId || q.inspectionId === orderId) || quotations[0];
  // الموظف المقيّد يسعّر بأقمشة فرعه الفعلى دايمًا (المخزون اللي قدامه فى الفرع)،
  // مش بفرع الأوردر المخزّن (ممكن يكون اتسجل بفرع تانى). الأدمن بيشوف فرع الأوردر.
  const fabricBranch = isAdmin ? quotation?.branch : currentUser?.branch;
  const { requestUnlock: requestMgrUnlock, Modal: MgrModal } = useManagerGate();
  const [mgrUnlocked, setMgrUnlocked] = useState<boolean>(false);
  useEffect(() => { setMgrUnlocked(isManagerUnlocked()); }, []);
  const canEditPrices = canUserEditPrices('p_pricing') || mgrUnlocked;
  const requirePriceUnlock = async (): Promise<boolean> => {
    if (canEditPrices) return true;
    const ok = await requestMgrUnlock();
    if (ok) setMgrUnlocked(true);
    return ok;
  };

  // القيم الافتراضية لتسعير الستائر (تُقرأ من /settings/curtain-defaults)
  const curtainDefaults = getCurtainDefaults();

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'INSTALLATION'>('INSTALLATION');
  const [estimator, setEstimator] = useState<string>('أحمد كشك');

  const handleFulfillmentChange = async (type: 'DELIVERY' | 'INSTALLATION', date: string) => {
    setFulfillmentType(type);
    setDeliveryDate(date);

    if (!quotation) return;

    // 1. Update quotation store
    const updatedQuotations = quotations.map(q =>
      q.id === quotation.id ? { ...q, deliveryDate: date, fulfillmentType: type } : q
    );
    setQuotations(updatedQuotations);
    await saveAllQuotations(updatedQuotations);

    // 2. Sync deliveryDate with master pipeline store without altering its pipeline status
    const storedOrders = getStoredPipelineOrders();
    const existingIndex = storedOrders.findIndex(o => o.orderId === quotation.id || o.id === quotation.id || (o.customerName && quotation.customerName && o.customerName === quotation.customerName));

    if (existingIndex >= 0) {
      const updated = [...storedOrders];
      updated[existingIndex] = {
        ...storedOrders[existingIndex],
        deliveryDate: date,
      };
      await saveStoredPipelineOrders(updated);
    }
  };

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

  const [accessoryPrices, setAccessoryPrices] = useState(curtainDefaults.accessoryPrices);

  const [pipeAccessories, setPipeAccessories] = useState<PipeAccessories>({
    doubleBrackets: 0,
    singleBrackets: 0,
    sideCaps: 0,
    doubleRings: 0,
    decorHangers: 0,
  });

  const [installFeeEnabled, setInstallFeeEnabled] = useState<boolean>(true);
  const [installFee, setInstallFee] = useState<number>(curtainDefaults.installFee);
  const [transportFeeEnabled, setTransportFeeEnabled] = useState<boolean>(false);
  const [transportFee, setTransportFee] = useState<number>(curtainDefaults.transportFee);
  const [sheerPieces, setSheerPieces] = useState<'قطعة واحدة' | 'قطعتين'>('قطعة واحدة');

  // Sheer Lining (بطانة شيفون) — خدمة إضافية اختيارية.
  const DEFAULT_SHEER_LINING_PRICE = curtainDefaults.sheerLiningPricePerMeter;
  const [sheerLiningEnabled, setSheerLiningEnabled] = useState<boolean>(false);
  const [sheerLiningPricePerMeter, setSheerLiningPricePerMeter] = useState<number>(DEFAULT_SHEER_LINING_PRICE);

  const [showWorkshopModal, setShowWorkshopModal] = useState<boolean>(false);

  useEffect(() => {
    if (quotation) {
      setEstimator(quotation.estimatorName || 'أحمد كشك');
      setDeliveryDate(quotation.deliveryDate || '');
    }
  }, [quotation]);

  const editingRoom = quotation?.rooms?.find(r => r.id === editingRoomId);
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
    setHeavyTapePrice(TAPE_PRICES[hTape] || 0);
    setHeavyMultiplier(hMul);
    setHeavyMeters(hM);
    setHeavyCode(room.heavyFabricCode || '');
    setHeavyP(room.heavyPrice || 0);

    const sTape = room.sheerTapeType || 'ويفي';
    const sMul = room.sheerMultiplier ?? (TAPE_MULTIPLIERS[sTape] || 2.5);
    const sM = room.sheerMeters || Math.round(widthM * sMul * 100) / 100;
    setSheerTapeType(sTape);
    setSheerTapePrice(TAPE_PRICES[sTape] || 0);
    setSheerMultiplier(sMul);
    setSheerMeters(sM);
    setSheerCode(room.sheerFabricCode || '');
    setSheerP(room.sheerPrice || 0);

    setSheerLiningEnabled(!!(room as any).sheerLiningEnabled);
    setSheerLiningPricePerMeter((room as any).sheerLiningPricePerMeter || DEFAULT_SHEER_LINING_PRICE);
    setSheerPieces((room as any).sheerPieces || 'قطعة واحدة');

    const bkTape = room.blackoutTapeType || 'جراب';
    const bkMul = room.blackoutMultiplier ?? 1.20;
    const bkM = room.blackoutMeters || Math.round(widthM * bkMul * 100) / 100;
    setBlackoutTapeType(bkTape);
    setBlackoutTapePrice(TAPE_PRICES[bkTape] || 0);
    setBlackoutMultiplier(bkMul);
    setBlackoutMeters(bkM);
    setBlackoutCode(room.blackoutFabricCode || '');
    setBlackoutP(room.blackoutPrice || 0);

    const isPipe = room.installationType?.includes('مواسير') || room.installationCategory === 'مواسير فورجيه';
    setInstallationCategory(isPipe ? 'مواسير فورجيه' : 'تراك');
    setTrackPricePerMeter(room.trackPrice || 0);
    setPipeTypeDescription(room.pipeTypeDescription || 'سادة');
    setPipeColor(room.pipeColor || 'فضى');
    setPipePricePerMeter(room.pipePricePerMeter || 0);
    setPipeAccessories(room.pipeAccessories || {
      doubleBrackets: isPipe ? 2 : 0,
      singleBrackets: 0,
      sideCaps: isPipe ? 2 : 0,
      doubleRings: 0,
      decorHangers: 0,
    });

    setInstallFeeEnabled(room.installFeeEnabled !== false);
    setInstallFee(room.installFee ?? 0);
    setTransportFeeEnabled(!!room.transportFeeEnabled);
    setTransportFee(room.transportFee ?? 0);
  };

  const handleHeavyTapeSelect = (tapeName: string) => {
    setHeavyTapeType(tapeName);
    setHeavyTapePrice(TAPE_PRICES[tapeName] || 0);
    const mul = TAPE_MULTIPLIERS[tapeName] || 2.0;
    setHeavyMultiplier(mul);
    setHeavyMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleSheerTapeSelect = (tapeName: string) => {
    setSheerTapeType(tapeName);
    setSheerTapePrice(TAPE_PRICES[tapeName] || 0);
    const mul = TAPE_MULTIPLIERS[tapeName] || 2.5;
    setSheerMultiplier(mul);
    setSheerMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleBlackoutTapeSelect = (tapeName: string) => {
    setBlackoutTapeType(tapeName);
    setBlackoutTapePrice(TAPE_PRICES[tapeName] || 0);
    const mul = blackoutMultiplier || 1.20;
    setBlackoutMultiplier(mul);
    setBlackoutMeters(Math.round(editingWidthM * mul * 100) / 100);
  };

  const handleFabricSelect = (layer: 'heavy' | 'sheer' | 'blackout', code: string) => {
    const fab = inventory.find(f => f.code === code);
    if (!fab) return;

    // #FIX: الحقل الحقيقى القادم من /api/inventory هو sellPrice، وليس pricePerMeter
    if (layer === 'heavy') {
      setHeavyCode(code);
      setHeavyP(fab.sellPrice);
    } else if (layer === 'sheer') {
      setSheerCode(code);
      setSheerP(fab.sellPrice);
    } else if (layer === 'blackout') {
      setBlackoutCode(code);
      setBlackoutP(fab.sellPrice);
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
        const heavyTapeCost = heavyEnabled ? effectiveHeavyMeters * (heavyTapePrice || 0) : 0;
        const sheerTapeCost = sheerEnabled ? effectiveSheerMeters * (sheerTapePrice || 0) : 0;
        const blackoutTapeCost = blackoutEnabled ? effectiveBlackoutMeters * (blackoutTapePrice || 0) : 0;
        const totalTapeCost = heavyTapeCost + sheerTapeCost + blackoutTapeCost;

        // Active layers count
        const activeLayersCount = (heavyEnabled ? 1 : 0) + (sheerEnabled ? 1 : 0) + (blackoutEnabled ? 1 : 0);

        let installationTotal = 0;
        let trackMeters = 0;
        let trackPrice = 0;

        if (installationCategory === 'تراك') {
          trackMeters = editingWidthM * activeLayersCount;
          trackPrice = trackPricePerMeter || 0;
          installationTotal = trackMeters * trackPrice;
        } else {
          // Forge pipe calculation
          const pipeMeters = editingWidthM;
          const pipeBaseCost = pipeMeters * (pipePricePerMeter || 0);
          // #5: يستخدم أسعار المستخدم المُعدَّلة من state (كانت تُتجاهل قبلاً)
          const accessoriesCost =
            (pipeAccessories.doubleBrackets * accessoryPrices.doubleBracket) +
            (pipeAccessories.singleBrackets * accessoryPrices.singleBracket) +
            (pipeAccessories.sideCaps * accessoryPrices.sideCap) +
            (pipeAccessories.doubleRings * accessoryPrices.doubleRing) +
            (pipeAccessories.decorHangers * accessoryPrices.decorHanger);
          installationTotal = pipeBaseCost + accessoriesCost;
        }

        const effectiveInstallFee = installFeeEnabled ? installFee : 0;
        const effectiveTransportFee = transportFeeEnabled ? (transportFee || 0) : 0;

        // Sheer Lining cost
        const sheerLiningCost = (sheerEnabled && sheerLiningEnabled) ? effectiveSheerMeters * (sheerLiningPricePerMeter || 0) : 0;

        const total = heavyCost + sheerCost + blackoutCost + totalTapeCost + installationTotal + effectiveInstallFee + effectiveTransportFee + sheerLiningCost;

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
          sheerPieces, // #17: يُحفظ عدد قطع الشيفون (قطعة/قطعتين) مع الغرفة
          sheerLiningEnabled: sheerEnabled ? sheerLiningEnabled : false,
          sheerLiningPricePerMeter: sheerEnabled && sheerLiningEnabled ? sheerLiningPricePerMeter : 0,

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
          tapePrice: heavyTapePrice || sheerTapePrice || 0,
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
    if (!quotation || quotation.totalAmount === 0) return;
    const updatedList = quotations.map(q => q.id === quotation.id ? { ...q, status: 'تم التحويل للورشة' as const } : q);
    setQuotations(updatedList);
    saveAllQuotations(updatedList);

    const insp = getInspectionById(quotation.inspectionId);
    if (insp) {
      insp.status = 'في الورشة';
      insp.isLocked = true;
      saveOrUpdateInspection(insp);
    }

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
        {/* Section 1: Customer Details Header — includes back button + status badge */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          {/* Card top row: back arrow + title + status badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/pipeline/pricing"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer shrink-0"
                title="العودة للقائمة"
              >
                ←
              </Link>
              <div>
                <h2 className="font-black text-sm text-slate-900 border-r-4 border-amber-500 pr-2.5">
                  معلومات العميل والمعاينة الميدانية:
                </h2>
              </div>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-bold border shrink-0 ${
              quotation.status === 'معتمد ومسدد العربون' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : quotation.status === 'تم إرسال المقايسة' ? 'bg-blue-50 text-blue-800 border-blue-200'
              : quotation.status === 'تم التحويل للورشة' ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {quotation.status}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
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

          {/* Compact Single-Row Date & Fulfillment Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-amber-950 font-black flex items-center gap-1 shrink-0">
                <span>📅 نوع الموعد والتاريخ:</span>
              </span>

              {/* Toggle Buttons (تسليم أو تركيب) */}
              <div className="inline-flex bg-slate-200/90 p-0.5 rounded-lg font-bold">
                <button
                  type="button"
                  onClick={() => handleFulfillmentChange('DELIVERY', deliveryDate)}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer text-xs ${
                    fulfillmentType === 'DELIVERY'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  تسليم
                </button>

                <button
                  type="button"
                  onClick={() => handleFulfillmentChange('INSTALLATION', deliveryDate)}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer text-xs ${
                    fulfillmentType === 'INSTALLATION'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  تركيب
                </button>
              </div>

              {/* Date Input */}
              <input
                type="date"
                value={deliveryDate || ''}
                onChange={(e) => handleFulfillmentChange(fulfillmentType, e.target.value)}
                className="bg-white border border-amber-300 rounded-lg px-3 py-1 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              />
            </div>

            {/* Target Tab Badge Indicator */}
            {deliveryDate && (
              <div className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-amber-200 shadow-3xs">
                📅 موعد ال{fulfillmentType === 'DELIVERY' ? 'تسليم' : 'تركيب'} المطلوب: {deliveryDate}
              </div>
            )}
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
              تفاصيل غرف العميل والأقمشة والتسعير ({(quotation.rooms || []).length} غرفة):
            </h2>
          </div>

          {(quotation.rooms || []).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 bg-slate-50 border border-slate-200 rounded-xl">
              لا توجد غرف مسجلة بهذه المعاينة.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {(quotation.rooms || []).map((room) => {
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
                          {isEditing ? 'إغلاق ✕' : 'تعديل'}
                        </button>
                      </div>
                    </div>

                    {/* Card Body: Show Edit Form In-Place when editing, else show static summary */}
                    {isEditing ? (
                      <div className="bg-amber-50/20 p-4 sm:p-5 rounded-2xl border-2 border-amber-400/70 space-y-5 shadow-xs transition-all">
                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                          <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-600 text-[18px]">tune</span>
                            تخصيص أقمشة ومواصفات ({room.name}) — عرض الحائط: {editingWidthM.toFixed(2)} م
                          </h4>
                          <span className="text-xs text-slate-700 font-mono font-bold bg-white border border-amber-300 px-2.5 py-1 rounded-lg shadow-2xs">
                            المقاس: {room.widthCm}×{room.heightCm} سم
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* Layer 1: Heavy Fabric */}
                          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
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
                                  <SearchableFabricSelect
                                    value={heavyCode}
                                    onChange={(code) => handleFabricSelect('heavy', code)}
                                    options={inventory}
                                    placeholder="-- اختر أو ابحث عن قماش الجوانب --"
                                    targetBranch={fabricBranch}
                                    className="sm:col-span-2"
                                  />
                                  <div className={`flex items-center border rounded-xl px-3 py-2 ${!canEditPrices ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-300'}`}>
                                    <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                                    <input
                                      type="number"
                                      value={heavyP}
                                      disabled={!canEditPrices}
                                      onChange={e => setHeavyP(Number(e.target.value))}
                                      className="w-full font-mono font-bold text-center text-xs disabled:text-slate-500 disabled:cursor-not-allowed"
                                    />
                                    <span className="text-slate-500 font-bold">ج</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Layer 2: Sheer Fabric */}
                          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <label className="font-black text-slate-900 flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sheerEnabled}
                                  onChange={e => setSheerEnabled(e.target.checked)}
                                  className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                                />
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">2</span>
                                ٢. قماش الخلفية (الشيفون)
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
                                  <SearchableFabricSelect
                                    value={sheerCode}
                                    onChange={(code) => handleFabricSelect('sheer', code)}
                                    options={inventory}
                                    placeholder="-- اختر أو ابحث عن قماش الشيفون --"
                                    targetBranch={fabricBranch}
                                    className="sm:col-span-2"
                                  />

                                  <div className={`flex items-center border rounded-xl px-3 py-2 ${!canEditPrices ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-300'}`}>
                                    <span className="text-slate-500 font-bold pl-1">سعر المتر:</span>
                                    <input
                                      type="number"
                                      value={sheerP}
                                      disabled={!canEditPrices}
                                      onChange={e => setSheerP(Number(e.target.value))}
                                      className="w-full font-mono font-bold text-center text-xs disabled:text-slate-500 disabled:cursor-not-allowed"
                                    />
                                    <span className="text-slate-500 font-bold">ج</span>
                                  </div>
                                </div>

                                {/* Sheer Lining (بطانة) Option */}
                                <div className="mt-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-blue-900">
                                    <input
                                      type="checkbox"
                                      checked={sheerLiningEnabled}
                                      onChange={e => setSheerLiningEnabled(e.target.checked)}
                                      className="w-4 h-4 rounded accent-blue-700 cursor-pointer"
                                    />
                                    <span>🧵 بطانة إضافية للشيفون</span>
                                    {sheerLiningEnabled && (
                                      <span className="font-mono text-blue-800 font-bold mr-auto">
                                        إجمالي البطانة: {(sheerMeters * (sheerLiningPricePerMeter || 0)).toLocaleString()} ج
                                      </span>
                                    )}
                                  </label>
                                  {sheerLiningEnabled && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-xs text-blue-700 font-bold">سعر متر البطانة:</span>
                                      <input
                                        type="number"
                                        value={sheerLiningPricePerMeter}
                                        disabled={!canEditPrices}
                                        onChange={e => setSheerLiningPricePerMeter(Number(e.target.value))}
                                        className="w-20 border border-blue-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs bg-white"
                                      />
                                      <span className="text-xs text-blue-600">ج/م</span>
                                      <span className="text-xs text-blue-500 mr-1">× {sheerMeters} م</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Layer 3: Blackout Layer */}
                          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <label className="font-black text-slate-900 flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={blackoutEnabled}
                                  onChange={e => setBlackoutEnabled(e.target.checked)}
                                  className="w-4 h-4 rounded accent-slate-900 cursor-pointer"
                                />
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">3</span>
                                ٣. طبقة البلاك آوت (العازل)
                              </label>
                              {blackoutEnabled && (
                                <span className="font-mono text-slate-800 font-bold text-xs">
                                  الكمية: {blackoutMeters} متر • الإجمالي: {(blackoutMeters * blackoutP).toLocaleString()} ج
                                </span>
                              )}
                            </div>

                            {blackoutEnabled && (
                              <>
                                <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-200">
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

                                    <span className="text-slate-500 text-xs">معامل:</span>
                                    <input
                                      type="number"
                                      step="0.1"
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
                                      className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs bg-amber-50/50"
                                    />
                                    <span className="text-slate-500 text-xs">متر</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                                  <SearchableFabricSelect
                                    value={blackoutCode}
                                    onChange={(code) => handleFabricSelect('blackout', code)}
                                    options={inventory}
                                    placeholder="-- اختر أو ابحث عن خامة البلاك آوت --"
                                    targetBranch={fabricBranch}
                                    className="sm:col-span-2"
                                  />

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
                              </>
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

                        {/* Form Actions inside card */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-amber-200/80">
                          <button
                            type="button"
                            onClick={() => setEditingRoomId(null)}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors bg-white"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => saveRoomPricing(room.id)}
                            className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors shadow-gold"
                          >
                            حفظ تسعير الغرفة والأقمشة ✓
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Static Summary Card Body */
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
                                شريط {room.blackoutTapeType || 'جراب'} (معامل ×{room.blackoutMultiplier ?? 1.20}) • {room.blackoutMeters}م
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>



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
          {(quotation.rooms || []).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {(quotation.rooms || []).map((rm, idx) => (
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
            disabled={!quotation}
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
            تحويل لقص القماش
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
                <p className="text-xs text-slate-600">أمر تشغيل الورشة والمقايسة المعتمدة</p>
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
                onClick={async () => {
                  if (!quotation) return;

                  // 1. Update Quotation status to 'في المقص'
                  const updatedList = quotations.map(q => q.id === quotation.id ? { ...q, status: 'في المقص' as any } : q);
                  setQuotations(updatedList);

                  // Map rooms to RoomFabricItem[] format which cutting/tailoring expects
                  const mappedRooms = (quotation.rooms || []).map((r: any, idx: number) => ({
                    roomName: r.name || `غرفة ${idx + 1}`,
                    heavyFabric: (r.heavyEnabled !== false && (Number(r.heavyMeters) > 0 || r.heavyFabricName)) ? {
                      name: r.heavyFabricName || 'قماش ثقيل',
                      code: r.heavyFabricCode || 'HV-101',
                      meters: Number(r.heavyMeters) || 0,
                      tapeType: r.heavyTapeType || '٣ فتلة',
                      netHeight: String(r.heightCm || 280),
                    } : undefined,
                    sheerFabric: (r.sheerEnabled !== false && (Number(r.sheerMeters) > 0 || r.sheerFabricName)) ? {
                      name: r.sheerFabricName || 'شيفون',
                      code: r.sheerFabricCode || 'SH-101',
                      meters: Number(r.sheerMeters) || 0,
                      tapeType: r.sheerTapeType || 'ويفي',
                      netHeight: String(r.heightCm || 280),
                      hasLining: !!(r.sheerLiningEnabled),
                      liningPricePerMeter: r.sheerLiningPricePerMeter || 0,
                    } : undefined,
                    blackoutFabric: (r.blackoutEnabled && (Number(r.blackoutMeters) > 0 || r.blackoutFabricName)) ? {
                      name: r.blackoutFabricName || 'بلاك آوت',
                      code: r.blackoutFabricCode || 'BK-301',
                      meters: Number(r.blackoutMeters) || 0,
                      tapeType: r.blackoutTapeType || 'جراب',
                      netHeight: String(r.heightCm || 280),
                    } : undefined,
                  }));

                  // 2. Fetch latest pipeline orders and upsert
                  const storedOrders = await fetchPipelineOrders();
                  const existingIndex = storedOrders.findIndex(o => o.orderId === quotation.id || o.id === quotation.id || o.id === `ORD-${quotation.id}` || (o.customerName && quotation.customerName && o.customerName === quotation.customerName));

                  const orderIdToUse = quotation.id || `ORD-${Date.now()}`;
                  const orderPayload: PipelineMasterOrder = {
                    id: existingIndex >= 0 ? storedOrders[existingIndex].id : `ORD-${quotation.id}`,
                    orderId: orderIdToUse,
                    customerName: quotation.customerName || 'عميل',
                    phone: quotation.phone || '',
                    address: quotation.address || '',
                    branch: quotation.branch || 'الفرع الرئيسي',
                    deliveryDate: quotation.deliveryDate || '',
                    status: 'في المقص',
                    localStatus: 'بانتظار القص',
                    createdAt: quotation.date || new Date().toISOString().split('T')[0],
                    totalAmount: Number(quotation.totalAmount) || 0,
                    depositPaid: Number(quotation.depositPaid) || 0,
                    remainingAmount: Number(quotation.remainingAmount) || 0,
                    rooms: mappedRooms.length > 0 ? mappedRooms : quotation.rooms || [],
                  };

                  let updatedOrdersList: PipelineMasterOrder[];
                  if (existingIndex >= 0) {
                    updatedOrdersList = [...storedOrders];
                    updatedOrdersList[existingIndex] = { ...storedOrders[existingIndex], ...orderPayload };
                  } else {
                    updatedOrdersList = [orderPayload, ...storedOrders];
                  }

                  // 3. Save all in parallel and wait
                  const promises: Promise<any>[] = [
                    saveAllQuotations(updatedList),
                    saveStoredPipelineOrders(updatedOrdersList),
                  ];

                  if (quotation.inspectionId) {
                    const insp = getInspectionById(quotation.inspectionId);
                    if (insp) {
                      insp.status = 'في الورشة';
                      insp.isLocked = true;
                      promises.push(saveOrUpdateInspection(insp));
                    }
                  }

                  await Promise.all(promises);

                  setShowWorkshopModal(false);
                  router.push('/pipeline/cutting');
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                تأكيد التحويل للقص ✓
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

      {/* شريط تنبيه عند قفل الأسعار — يفتح مودال المدير */}
      {!canEditPrices && (
        <div className="fixed bottom-4 left-4 right-4 md:right-auto z-40 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-2xl p-3 flex items-center gap-3 max-w-md mx-auto md:mx-0">
          <span className="material-symbols-outlined text-amber-800">lock</span>
          <div className="flex-1">
            <p className="font-black text-slate-900 text-xs">تعديل الأسعار مقفول لدورك</p>
            <p className="text-[11px] text-slate-600">اطلب من المدير فتح الصلاحية لهذه الجلسة</p>
          </div>
          <button
            type="button"
            onClick={() => requirePriceUnlock()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs shadow"
          >فتح</button>
        </div>
      )}
      {MgrModal}
    </PageShell>
  );
}
