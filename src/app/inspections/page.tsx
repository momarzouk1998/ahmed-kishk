'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { formatDate } from '@/lib/dateUtils';

interface FabricLayer {
  layer: string;
  code: string;
  fullness: number; // e.g. 2.5x for sheer, 1.8x for heavy, 1.2x for blackout
  pricePerMeter: number;
  meters: number;
  tape: boolean;
  eyelet: boolean;
}

interface Room {
  id: string;
  name: string;
  type: 'شباك' | 'بلكونة';
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  trackPricePerMeter: number;
  ceilingType: string;
  fabrics: FabricLayer[];
  tapePricePerMeter: number;
  tailoringFeePerSide: number;
  installFee: number;
  totalCost: number;
  totalSellPrice: number;
}

interface InspectionRequest {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  scheduledAt: string;
  technician: string;
  status: 'مُجدول' | 'قيد الانتظار' | 'مكتمل' | 'ملغي';
  stage: 'معاينة' | 'اختيار قماش' | 'ورشة' | 'تركيب';
  rooms: Room[];
  notes: string;
}

const defaultRooms: Room[] = [];

export default function InspectionsPage() {
  const [requests, setRequests] = useState<InspectionRequest[]>([]);

  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'rooms' | 'pricing' | 'info'>('rooms');
  const [filterStatus, setFilterStatus] = useState<string>('الكل');

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // New Request state
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [techName, setTechName] = useState('أحمد حسن');
  const [reqNotes, setReqNotes] = useState('');

  // Room Measurement & Smart Calculation State
  const [roomName, setRoomName] = useState('الصالة');
  const [roomType, setRoomType] = useState<'شباك' | 'بلكونة'>('شباك');
  const [widthCm, setWidthCm] = useState<number>(250);
  const [heightCm, setHeightCm] = useState<number>(270);
  const [sides, setSides] = useState<number>(2);
  const [installType, setInstallType] = useState('مجرى سقف (تراك ألومنيوم)');
  const [trackPrice, setTrackPrice] = useState<number>(85);
  const [ceilingType, setCeilingType] = useState('جيبسون بورد / بيت نور');

  // Layer 1: Sheer (تول)
  const [hasSheer, setHasSheer] = useState(true);
  const [sheerCode, setSheerCode] = useState('T-101');
  const [sheerFullness, setSheerFullness] = useState<number>(2.5); // 2.5x standard
  const [sheerPrice, setSheerPrice] = useState<number>(160);

  // Layer 2: Heavy (ثقيل)
  const [hasHeavy, setHasHeavy] = useState(true);
  const [heavyCode, setHeavyCode] = useState('V-202');
  const [heavyFullness, setHeavyFullness] = useState<number>(1.8); // 1.8x standard
  const [heavyPrice, setHeavyPrice] = useState<number>(380);

  // Layer 3: Blackout (بلاك آوت)
  const [hasBlackout, setHasBlackout] = useState(false);
  const [blackoutCode, setBlackoutCode] = useState('BL-01');
  const [blackoutFullness, setBlackoutFullness] = useState<number>(1.3); // 1.3x flat/subtle
  const [blackoutPrice, setBlackoutPrice] = useState<number>(280);

  // Accessories & Fees
  const [tapePrice, setTapePrice] = useState<number>(18);
  const [tailorFeePerSide, setTailorFeePerSide] = useState<number>(120);
  const [installFee, setInstallFee] = useState<number>(150);

  // Load from API on mount
  useEffect(() => {
    fetch('/api/inspections')
      .then(res => res.json())
      .then(data => {
        if (data.inspections && data.inspections.length > 0) {
          // Format from DB
          const formatted = data.inspections.map((ins: any) => ({
            id: ins.id,
            customerName: ins.customer?.name || 'عميل',
            phone: ins.customer?.phone || '',
            address: ins.address || '',
            scheduledAt: ins.scheduledAt || '',
            technician: ins.assignedTo?.name || 'أحمد حسن',
            status: ins.status === 'SCHEDULED' ? 'مُجدول' : ins.status === 'COMPLETED' ? 'مكتمل' : 'قيد الانتظار',
            stage: ins.stage || 'معاينة',
            notes: ins.notes || '',
            rooms: (ins.rooms || []).map((rm: any) => ({
              id: rm.id,
              name: rm.roomName,
              type: rm.roomType === 'BALCONY' ? 'بلكونة' : 'شباك',
              widthCm: rm.widthCm,
              heightCm: rm.heightCm,
              sides: rm.sides,
              installationType: rm.installationType === 'RODS' ? 'مواسير استيل' : 'مجرى سقف',
              trackPricePerMeter: 85,
              ceilingType: rm.ceilingType === 'HOLLOW_GYPSUM' ? 'جيبسون بورد' : 'سقف عادي',
              tapePricePerMeter: 18,
              tailoringFeePerSide: 120,
              installFee: 150,
              fabrics: (rm.fabrics || []).map((fb: any) => ({
                layer: fb.layerName,
                code: fb.fabricCode,
                fullness: fb.layerName.includes('تول') ? 2.5 : fb.layerName.includes('بلاك') ? 1.3 : 1.8,
                pricePerMeter: rm.avgPricePerMeter || 250,
                meters: rm.fabricMeters || 0,
                tape: fb.hasPleatedTape,
                eyelet: fb.hasEyeletRings,
              })),
              totalCost: rm.estimatedCost || 0,
              totalSellPrice: (rm.estimatedCost || 0) * 1.45,
            })),
          }));
          setRequests(formatted);
          setSelectedId(formatted[0].id);
        }
      })
      .catch(() => { });
  }, []);

  const selected = requests.find(r => r.id === selectedId) || requests[0];
  const filtered = filterStatus === 'الكل' ? requests : requests.filter(r => r.status === filterStatus);

  // Dynamic calculations for room
  const widthM = widthCm / 100;
  const sheerMetersCalc = Number((widthM * sheerFullness).toFixed(2));
  const heavyMetersCalc = Number((widthM * heavyFullness).toFixed(2));
  const blackoutMetersCalc = Number((widthM * blackoutFullness).toFixed(2));

  // Smart Room Total Calculation
  const calculateRoomTotals = () => {
    let fabricTotalCost = 0;
    let tapeMeters = 0;

    if (hasSheer) {
      fabricTotalCost += sheerMetersCalc * sheerPrice;
      tapeMeters += sheerMetersCalc;
    }
    if (hasHeavy) {
      fabricTotalCost += heavyMetersCalc * heavyPrice;
      tapeMeters += heavyMetersCalc;
    }
    if (hasBlackout) {
      fabricTotalCost += blackoutMetersCalc * blackoutPrice;
      tapeMeters += blackoutMetersCalc;
    }

    const trackCost = widthM * trackPrice;
    const tapeCost = tapeMeters * tapePrice;
    const tailoringCost = sides * tailorFeePerSide;
    const finalCost = Math.round(fabricTotalCost + trackCost + tapeCost + tailoringCost + installFee);
    const finalSellPrice = Math.round(finalCost * 1.35); // 35% margin standard

    return { finalCost, finalSellPrice };
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const { finalCost, finalSellPrice } = calculateRoomTotals();

    const fabrics: FabricLayer[] = [];
    if (hasSheer) fabrics.push({ layer: 'تول خفيف', code: sheerCode, fullness: sheerFullness, pricePerMeter: sheerPrice, meters: sheerMetersCalc, tape: true, eyelet: false });
    if (hasHeavy) fabrics.push({ layer: 'قماش ثقيل', code: heavyCode, fullness: heavyFullness, pricePerMeter: heavyPrice, meters: heavyMetersCalc, tape: true, eyelet: true });
    if (hasBlackout) fabrics.push({ layer: 'بلاك آوت', code: blackoutCode, fullness: blackoutFullness, pricePerMeter: blackoutPrice, meters: blackoutMetersCalc, tape: true, eyelet: false });

    const newRoom: Room = {
      id: editingRoomId || `rm-${Date.now()}`,
      name: roomName,
      type: roomType,
      widthCm,
      heightCm,
      sides,
      installationType: installType,
      trackPricePerMeter: trackPrice,
      ceilingType,
      tapePricePerMeter: tapePrice,
      tailoringFeePerSide: tailorFeePerSide,
      installFee,
      fabrics,
      totalCost: finalCost,
      totalSellPrice: finalSellPrice,
    };

    setRequests(prev => prev.map(r => {
      if (r.id !== selected.id) return r;
      if (editingRoomId) {
        return { ...r, rooms: r.rooms.map(rm => rm.id === editingRoomId ? newRoom : rm) };
      }
      return { ...r, rooms: [...r.rooms, newRoom] };
    }));

    setShowRoomModal(false);
  };

  const handleSaveNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    const newReq: InspectionRequest = {
      id: `INS-${String(requests.length + 1).padStart(3, '0')}`,
      customerName: custName,
      phone: custPhone,
      address: custAddress,
      scheduledAt: scheduleTime,
      technician: techName,
      status: 'مُجدول',
      stage: 'معاينة',
      notes: reqNotes,
      rooms: [],
    };

    setRequests([newReq, ...requests]);
    setSelectedId(newReq.id);
    setShowNewRequestModal(false);

    // Save to Database API
    fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: custName,
        phone: custPhone,
        address: custAddress,
        scheduledAt: scheduleTime,
        technician: techName,
        notes: reqNotes,
      }),
    }).catch(() => { });
  };

  const handleShareWhatsApp = () => {
    if (!selected) return;
    const roomsText = selected.rooms.length > 0
      ? selected.rooms.map(r => `\n• *${r.name}* (${r.type}): ${r.widthCm}سم عرض × ${r.heightCm}سم ارتفاع (${r.installationType}) — التكلفة: ${r.totalSellPrice.toLocaleString()} ج.م`).join('')
      : '\nلم تسجل غرف بعد';

    const text = encodeURIComponent(
      `*معاينة ومقاسات ستائر — أحمد كشك*\nالعميل: ${selected.customerName}\nالهاتف: ${selected.phone}\nالعنوان: ${selected.address}\nالفني: ${selected.technician}\n\n*تفاصيل الغرف والتسعير:*${roomsText}\n\n*الإجمالي: ${selected.rooms.reduce((s, r) => s + r.totalSellPrice, 0).toLocaleString()} ج.م*`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <PageShell title="المعاينات ورفع المقاسات">
      <div className="flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-primary">المعاينات ورفع المقاسات</h1>
            <p className="text-on-surface-variant text-xs sm:text-sm mt-1">تسجيل طلبات المعاينة الميدانية ومقاسات وتفاصيل كل غرفة.</p>
          </div>
          <button
            onClick={() => {
              setCustName(''); setCustPhone(''); setCustAddress(''); setScheduleTime(''); setReqNotes('');
              setShowNewRequestModal(true);
            }}
            className="bg-primary text-on-primary px-4 sm:px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-xs sm:text-sm shadow w-full sm:w-auto justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            طلب معاينة جديد
          </button>
        </div>

        {/* Master Detail Split */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">assignment</span>
            <h3 className="font-bold text-lg text-slate-800">لا توجد طلبات معاينة مسجلة حتى الآن</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">ابدأ بإضافة أول طلب معاينة لربط المقاسات وتسعير الأقمشة والستائر.</p>
            <button
              onClick={() => setShowNewRequestModal(true)}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-inverse-surface transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              طلب معاينة جديد
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Requests List */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {filtered.map(req => (
              <div
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className={`p-5 rounded-2xl border bg-white cursor-pointer transition-all ${req.id === selected?.id ? 'border-brand-gold ring-2 ring-brand-gold/30 shadow-md' : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{req.id}</span>
                    <h3 className="font-bold text-base text-slate-900">{req.customerName}</h3>
                    <p className="text-xs text-slate-500 font-mono" dir="ltr">{req.phone}</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    {req.status}
                  </span>
                </div>
                {req.address && (
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {req.address}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-brand-gold-dark">📍 {req.stage}</span>
                  <span className="font-mono text-slate-500">{req.rooms.length} غرف مسجلة</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Selected Request Detail */}
          {selected && (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-soft">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between p-4 sm:p-6 border-b border-slate-100 gap-4">
              <div className="min-w-0">
                <span className="text-xs font-mono font-bold text-brand-gold-dark">{selected.id}</span>
                <h2 className="font-bold text-xl sm:text-2xl text-slate-900 truncate">{selected.customerName}</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate" dir="ltr">{selected.phone} {selected.address && `| ${selected.address}`}</p>
              </div>
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <button onClick={handleShareWhatsApp} className="flex-1 sm:flex-none justify-center border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:border-slate-400 flex items-center gap-1.5 shadow-xs">
                  <span className="material-symbols-outlined text-[16px]">share</span> واتساب
                </button>
                <button onClick={() => window.print()} className="flex-1 sm:flex-none justify-center border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:border-slate-400 flex items-center gap-1.5 shadow-xs">
                  <span className="material-symbols-outlined text-[16px]">print</span> طباعة المقايسة
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-4 sm:px-6 gap-3 sm:gap-0">
              <div className="flex overflow-x-auto -mb-px scrollbar-none">
                {[
                  { id: 'rooms', label: `الغرف والمقاسات (${selected.rooms.length})` },
                  { id: 'pricing', label: 'مصفوفة وجدول التسعير الذكي' },
                  { id: 'info', label: 'بيانات الموعد والفني' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setEditingRoomId(null);
                  setRoomName(`غرفة ${selected.rooms.length + 1}`);
                  setShowRoomModal(true);
                }}
                className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-gold sm:mb-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                رفع مقاسات غرفة
              </button>
            </div>

            {/* Tab 1: Rooms Overview */}
            {activeTab === 'rooms' && (
              <div className="p-4 sm:p-6 flex flex-col gap-4">
                {selected.rooms.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <span className="material-symbols-outlined text-[48px] text-slate-400 block mb-2">square_foot</span>
                    <h3 className="font-bold text-slate-900">لم يتم رفع مقاسات بعد</h3>
                    <p className="text-xs text-slate-500 mt-1">اضغط على زر رفع مقاسات غرفة لتطبيق معادلة الكشكشة والتسعير.</p>
                  </div>
                ) : (
                  selected.rooms.map(room => (
                    <div key={room.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-slate-900">{room.name}</h3>
                            <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">{room.type}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {room.installationType} • {room.ceilingType} • {room.sides === 2 ? 'جنبين' : 'جنب واحد'}
                          </p>
                        </div>
                        <div className="text-left">
                          <div className="font-mono font-black text-xl text-slate-900">{room.totalSellPrice.toLocaleString()} ج.م</div>
                          <div className="text-[11px] text-emerald-700 font-bold font-mono">صافي الربح: +{(room.totalSellPrice - room.totalCost).toLocaleString()} ج</div>
                        </div>
                      </div>

                      {/* Dimensions Bar */}
                      <div className="grid grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-slate-200 text-center text-xs mb-3">
                        <div>
                          <div className="font-mono font-black text-slate-900">{room.widthCm} سم</div>
                          <div className="text-[11px] text-slate-400">العرض</div>
                        </div>
                        <div>
                          <div className="font-mono font-black text-slate-900">{room.heightCm} سم</div>
                          <div className="text-[11px] text-slate-400">الارتفاع</div>
                        </div>
                        <div>
                          <div className="font-mono font-black text-slate-900">{room.sides}</div>
                          <div className="text-[11px] text-slate-400">الجوانب</div>
                        </div>
                        <div>
                          <div className="font-mono font-black text-slate-900">{room.totalCost.toLocaleString()} ج</div>
                          <div className="text-[11px] text-slate-400">إجمالي التكلفة</div>
                        </div>
                      </div>

                      {/* Fabrics table */}
                      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto text-xs">
                        <table className="w-full text-right min-w-[480px]">
                          <thead className="bg-slate-50 font-mono text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">الخامة</th>
                              <th className="p-2.5">الكود</th>
                              <th className="p-2.5 text-center">نسبة الكشكشة</th>
                              <th className="p-2.5 text-center">الأمتار المطلوبة</th>
                              <th className="p-2.5 text-left">سعر المتر</th>
                            </tr>
                          </thead>
                          <tbody>
                            {room.fabrics.map((f, i) => (
                              <tr key={i} className="border-t border-slate-100">
                                <td className="p-2.5 font-bold text-slate-900">{f.layer}</td>
                                <td className="p-2.5 font-mono text-slate-500">{f.code || '—'}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-brand-gold-dark">{f.fullness}x</td>
                                <td className="p-2.5 text-center font-mono font-black text-slate-900">{f.meters} م</td>
                                <td className="p-2.5 text-left font-mono font-bold text-slate-900">{f.pricePerMeter} ج</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}

                {selected.rooms.length > 0 && (
                  <div className="bg-slate-950 text-white p-6 rounded-2xl flex justify-between items-center shadow-xl border border-slate-800">
                    <div>
                      <div className="font-bold text-lg">إجمالي قيمة المقايسة للعميل</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">شامل الأقمشة والتراكات والأشرطة ومصنعية الورشة والتركيب</div>
                    </div>
                    <div className="font-display font-black text-3xl text-brand-gold">
                      {selected.rooms.reduce((s, r) => s + r.totalSellPrice, 0).toLocaleString()} ج.م
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Smart Pricing Matrix */}
            {activeTab === 'pricing' && (
              <div className="p-4 sm:p-6 flex flex-col gap-4">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">جدول تفكيك التكلفة والأرباح لكل غرفة</h3>
                <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-soft">
                  <table className="w-full text-right text-xs min-w-[700px]">
                    <thead className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">الغرفة</th>
                        <th className="p-3.5 text-center">أمتار القماش</th>
                        <th className="p-3.5 text-left">تكلفة الأقمشة</th>
                        <th className="p-3.5 text-left">التراك والمواسير</th>
                        <th className="p-3.5 text-left">الورشة والأشرطة</th>
                        <th className="p-3.5 text-left">إجمالي التكلفة</th>
                        <th className="p-3.5 text-left">سعر البيع</th>
                        <th className="p-3.5 text-left text-emerald-700">صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.rooms.map(r => {
                        const totalFabricsMeters = r.fabrics.reduce((s, f) => s + f.meters, 0);
                        const totalFabricsCost = r.fabrics.reduce((s, f) => s + (f.meters * f.pricePerMeter), 0);
                        const trackCost = (r.widthCm / 100) * r.trackPricePerMeter;
                        const tailoringCost = (r.sides * r.tailoringFeePerSide) + (totalFabricsMeters * r.tapePricePerMeter);
                        const profit = r.totalSellPrice - r.totalCost;

                        return (
                          <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="p-3.5 font-bold text-slate-900">{r.name}</td>
                            <td className="p-3.5 text-center font-mono font-bold">{totalFabricsMeters.toFixed(2)} م</td>
                            <td className="p-3.5 text-left font-mono font-bold text-slate-800">{Math.round(totalFabricsCost).toLocaleString()} ج</td>
                            <td className="p-3.5 text-left font-mono text-slate-600">{Math.round(trackCost).toLocaleString()} ج</td>
                            <td className="p-3.5 text-left font-mono text-slate-600">{Math.round(tailoringCost).toLocaleString()} ج</td>
                            <td className="p-3.5 text-left font-mono font-bold text-slate-900">{r.totalCost.toLocaleString()} ج</td>
                            <td className="p-3.5 text-left font-mono font-black text-brand-gold-dark">{r.totalSellPrice.toLocaleString()} ج</td>
                            <td className="p-3.5 text-left font-mono font-black text-emerald-600">+{profit.toLocaleString()} ج</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Info */}
            {activeTab === 'info' && (
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold block">الفني المسؤول:</span>
                  <span className="font-bold text-slate-900 text-sm mt-1 block">{selected.technician}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold block">موعد المعاينة الميدانية:</span>
                  <span className="font-bold text-slate-900 text-sm font-mono mt-1 block">{selected.scheduledAt ? formatDate(selected.scheduledAt) : 'لم يحدد'}</span>
                </div>
                {selected.notes && (
                  <div className="sm:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-bold block mb-1">ملاحظات المعاينة:</span>
                    <p className="text-sm text-slate-900">{selected.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
        )}
      </div>

      {/* Modal: New Request */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 mb-4">إنشاء طلب معاينة ومقاسات جديد</h2>
            <form onSubmit={handleSaveNewRequest} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم العميل *</label>
                  <input value={custName} onChange={e => setCustName(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="الاسم الكامل" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">رقم الهاتف *</label>
                  <input value={custPhone} onChange={e => setCustPhone(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="01xxxxxxxxx" dir="ltr" required />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">العنوان بالتفصيل</label>
                <input value={custAddress} onChange={e => setCustAddress(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="المنطقة، الشارع، رقم الشقة" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">موعد المعاينة</label>
                  <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفني المسؤول</label>
                  <select value={techName} onChange={e => setTechName(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm">
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                    <option>علي إبراهيم</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات</label>
                <textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm h-20 resize-none" />
              </div>

              <div className="flex gap-2 mt-3">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl font-bold text-sm shadow-gold">
                  حفظ المعاينة
                </button>
                <button type="button" onClick={() => setShowNewRequestModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Smart Room Measurement & Fullness Factor */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-2xl my-4 sm:my-8 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-xs font-bold text-brand-gold-dark font-mono">حاسبة الأمتار والتسعير الدقيق</span>
                <h2 className="font-display font-black text-xl text-slate-900">رفع مقاسات الغرفة وتحديد نسب الكشكشة</h2>
              </div>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="flex flex-col gap-4">
              {/* Room name & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم الغرفة *</label>
                  <input value={roomName} onChange={e => setRoomName(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm" placeholder="الصالة، غرفة نوم..." required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">نوع المكان</label>
                  <select value={roomType} onChange={e => setRoomType(e.target.value as any)} className="border border-slate-200 rounded-xl p-2 text-sm">
                    <option value="شباك">شباك</option>
                    <option value="بلكونة">بلكونة</option>
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">العرض (سم) *</label>
                  <input type="number" value={widthCm} onChange={e => setWidthCm(Number(e.target.value))} className="border border-slate-300 rounded-xl p-2 text-sm font-mono font-black" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الارتفاع (سم) *</label>
                  <input type="number" value={heightCm} onChange={e => setHeightCm(Number(e.target.value))} className="border border-slate-300 rounded-xl p-2 text-sm font-mono font-black" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">عدد الجوانب</label>
                  <select value={sides} onChange={e => setSides(Number(e.target.value))} className="border border-slate-300 rounded-xl p-2 text-sm font-bold">
                    <option value={2}>جنبين (2)</option>
                    <option value={1}>جنب واحد (1)</option>
                  </select>
                </div>
              </div>

              {/* Installation & Track Price */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">نوع التركيب</label>
                  <select value={installType} onChange={e => setInstallType(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs">
                    <option value="تراك سقف">تراك سقف</option>
                    <option value="تراك حائط">تراك حائط</option>
                    <option value="مواسير فورجيه">مواسير فورجيه</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">سعر متر التراك/المواسير</label>
                  <input type="number" value={trackPrice} onChange={e => setTrackPrice(Number(e.target.value))} className="border border-slate-200 rounded-xl p-2 text-sm font-mono" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">نوع السقف</label>
                  <select value={ceilingType} onChange={e => setCeilingType(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs">
                    <option value="بيت نور خرسانه">بيت نور خرسانه</option>
                    <option value="بيت نور / جبس بورد">بيت نور / جبس بورد</option>
                    <option value="سقف عادي خرسانه">سقف عادي خرسانه</option>
                  </select>
                </div>
              </div>

              {/* Fabric Layers with Custom Fullness Factors */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-amber-50/30">
                <div className="text-xs font-black text-slate-900">طبقات الأقمشة ومعادلات الكشكشة التلقائية:</div>

                {/* Layer 1: Sheer */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                      <input type="checkbox" checked={hasSheer} onChange={e => setHasSheer(e.target.checked)} className="rounded" />
                      <span>قماش خفيف (تول / شيفون)</span>
                    </label>
                    {hasSheer && (
                      <span className="text-xs font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        المطلوب: {sheerMetersCalc} متر
                      </span>
                    )}
                  </div>
                  {hasSheer && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <input value={sheerCode} onChange={e => setSheerCode(e.target.value)} placeholder="كود القماش" className="border border-slate-200 rounded-lg p-1.5 font-mono" />
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">كشكشة:</span>
                        <select value={sheerFullness} onChange={e => setSheerFullness(Number(e.target.value))} className="border border-slate-200 rounded-lg p-1 font-mono font-bold">
                          <option value={2.5}>2.5x (قياسي)</option>
                          <option value={3.0}>3.0x (كثيف)</option>
                          <option value={2.0}>2.0x (خفيف)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">سعر/م:</span>
                        <input type="number" value={sheerPrice} onChange={e => setSheerPrice(Number(e.target.value))} className="border border-slate-200 rounded-lg p-1.5 w-20 font-mono" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Layer 2: Heavy */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                      <input type="checkbox" checked={hasHeavy} onChange={e => setHasHeavy(e.target.checked)} className="rounded" />
                      <span>قماش ثقيل (قطيفة / كتان)</span>
                    </label>
                    {hasHeavy && (
                      <span className="text-xs font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        المطلوب: {heavyMetersCalc} متر
                      </span>
                    )}
                  </div>
                  {hasHeavy && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <input value={heavyCode} onChange={e => setHeavyCode(e.target.value)} placeholder="كود القماش" className="border border-slate-200 rounded-lg p-1.5 font-mono" />
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">كشكشة:</span>
                        <select value={heavyFullness} onChange={e => setHeavyFullness(Number(e.target.value))} className="border border-slate-200 rounded-lg p-1 font-mono font-bold">
                          <option value={1.8}>1.8x (قياسي)</option>
                          <option value={2.0}>2.0x (كثيف)</option>
                          <option value={1.5}>1.5x (متوسط)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">سعر/م:</span>
                        <input type="number" value={heavyPrice} onChange={e => setHeavyPrice(Number(e.target.value))} className="border border-slate-200 rounded-lg p-1.5 w-20 font-mono" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Layer 3: Blackout */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                      <input type="checkbox" checked={hasBlackout} onChange={e => setHasBlackout(e.target.checked)} className="rounded" />
                      <span>بلاك آوت عازل ضوء</span>
                    </label>
                    {hasBlackout && (
                      <span className="text-xs font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        المطلوب: {blackoutMetersCalc} متر
                      </span>
                    )}
                  </div>
                  {hasBlackout && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <input value={blackoutCode} onChange={e => setBlackoutCode(e.target.value)} placeholder="كود البلاك آوت" className="border border-slate-200 rounded-lg p-1.5 font-mono" />
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">كشكشة:</span>
                        <select value={blackoutFullness} onChange={e => setBlackoutFullness(Number(e.target.value))} className="border border-slate-200 rounded-lg p-1 font-mono font-bold">
                          <option value={1.3}>1.3x (فلات/خفيف)</option>
                          <option value={1.5}>1.5x</option>
                          <option value={1.0}>1.0x (بدون كشكشة)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">سعر/م:</span>
                        <input type="number" value={blackoutPrice} onChange={e => setBlackoutPrice(Number(e.target.value))} className="border border-slate-200 rounded-lg p-1.5 w-20 font-mono" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tailoring & Install Fees */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-slate-600 block mb-1">شريط كشكشة (ج/م):</label>
                  <input type="number" value={tapePrice} onChange={e => setTapePrice(Number(e.target.value))} className="border border-slate-300 rounded-lg p-1.5 w-full font-mono font-bold" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">مصنعية الورشة لكل جنب:</label>
                  <input type="number" value={tailorFeePerSide} onChange={e => setTailorFeePerSide(Number(e.target.value))} className="border border-slate-300 rounded-lg p-1.5 w-full font-mono font-bold" />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">تكلفة التركيب:</label>
                  <input type="number" value={installFee} onChange={e => setInstallFee(Number(e.target.value))} className="border border-slate-300 rounded-lg p-1.5 w-full font-mono font-bold" />
                </div>
              </div>

              {/* Dynamic Live Cost Preview */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block">إجمالي التكلفة المحسوبة:</span>
                  <span className="font-mono font-bold text-sm text-slate-200">{calculateRoomTotals().finalCost.toLocaleString()} ج.م</span>
                </div>
                <div className="text-left">
                  <span className="text-brand-gold font-bold block">سعر البيع المقترح (+35%):</span>
                  <span className="font-mono font-black text-xl text-brand-gold">{calculateRoomTotals().finalSellPrice.toLocaleString()} ج.م</span>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-3 rounded-xl font-bold text-sm shadow-gold">
                  حفظ مقاسات الغرفة والحسابات
                </button>
                <button type="button" onClick={() => setShowRoomModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
