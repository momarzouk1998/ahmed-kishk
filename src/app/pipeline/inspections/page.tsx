'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';

interface FabricLayer {
  layer: string;
  code: string;
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
  ceilingType: string;
  fabrics: FabricLayer[];
  notes?: string;
}

interface InspectionRequest {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  scheduledAt: string;
  technician: string;
  status: 'مُجدول' | 'تم رفع المقاسات' | 'قيد التسعير' | 'في الورشة' | 'مكتمل';
  isLocked: boolean; // Locked when next stage claims or starts
  rooms: Room[];
  notes: string;
}

const defaultRooms: Room[] = [
  {
    id: 'r1',
    name: 'الصالة الرئيسية (بلكونة)',
    type: 'بلكونة',
    widthCm: 350,
    heightCm: 280,
    sides: 2,
    installationType: 'مجرى سقف (تراك ألومنيوم)',
    ceilingType: 'جيبسون بورد / بيت نور',
    fabrics: [
      { layer: 'قماش خفيف (تول)', code: 'T-402', tape: true, eyelet: false },
      { layer: 'قماش ثقيل (قطيفة تركي)', code: 'V-990', tape: true, eyelet: true },
    ],
    notes: 'يوجد بيت نور بعمق 15سم — ثني الذيل 12سم',
  },
  {
    id: 'r2',
    name: 'غرفة النوم الرئيسية',
    type: 'شباك',
    widthCm: 200,
    heightCm: 260,
    sides: 2,
    installationType: 'مواسير استيل مذهبة',
    ceilingType: 'سقف عادي خرسانة',
    fabrics: [
      { layer: 'بلاك آوت عازل ضوء', code: 'BL-220', tape: false, eyelet: true },
      { layer: 'شيفون ناعم', code: 'SH-10', tape: true, eyelet: false },
    ],
    notes: 'تثبيت الماسورة أعلى حلق الشباك بـ 15سم',
  }
];

const initialInspections: InspectionRequest[] = [
  {
    id: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    scheduledAt: '2026-08-26T16:00',
    technician: 'أحمد حسن',
    status: 'تم رفع المقاسات',
    isLocked: false,
    notes: 'شقة 3 غرف + صالة بلكونة',
    rooms: defaultRooms,
  },
  {
    id: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    scheduledAt: '2026-08-27T12:00',
    technician: 'محمد علي',
    status: 'مُجدول',
    isLocked: false,
    notes: 'شقة عروسة — مطلوب معاينة 4 غرف',
    rooms: [],
  },
  {
    id: 'INS-003',
    customerName: 'شركة المعمار للمقاولات',
    phone: '01155556666',
    address: 'المهندسين، شارع البطل أحمد عبد العزيز',
    scheduledAt: '2026-08-24T11:00',
    technician: 'محمد علي',
    status: 'في الورشة',
    isLocked: true, // Locked because workshop already started cutting
    notes: 'مكاتب إدارية — تم إرسال المقاسات للورشة',
    rooms: [
      {
        id: 'r3',
        name: 'قاعة الاجتماعات الرئيسية',
        type: 'شباك',
        widthCm: 500,
        heightCm: 300,
        sides: 2,
        installationType: 'مجرى سقف (تراك كهربائي)',
        ceilingType: 'جيبسون بورد / بيت نور',
        fabrics: [{ layer: 'بلاك آوت عازل ضوء', code: 'BL-900', tape: true, eyelet: false }],
      }
    ],
  }
];

export default function PipelineInspectionsPage() {
  const [requests, setRequests] = useState<InspectionRequest[]>(initialInspections);
  const [selectedId, setSelectedId] = useState<string>('INS-001');
  const [filterStatus, setFilterStatus] = useState<string>('الكل');

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // New Request Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [techName, setTechName] = useState('أحمد حسن');
  const [reqNotes, setReqNotes] = useState('');

  // Field Technician Room Form (100% Zero Pricing Fields)
  const [roomName, setRoomName] = useState('الصالة الرئيسية');
  const [roomType, setRoomType] = useState<'شباك' | 'بلكونة'>('شباك');
  const [widthCm, setWidthCm] = useState<number>(250);
  const [heightCm, setHeightCm] = useState<number>(270);
  const [sides, setSides] = useState<number>(2);
  const [installType, setInstallType] = useState('مجرى سقف (تراك ألومنيوم)');
  const [ceilingType, setCeilingType] = useState('جيبسون بورد / بيت نور');
  const [roomNotes, setRoomNotes] = useState('');

  // Layers & Codes
  const [hasSheer, setHasSheer] = useState(true);
  const [sheerCode, setSheerCode] = useState('T-101');
  const [hasHeavy, setHasHeavy] = useState(true);
  const [heavyCode, setHeavyCode] = useState('V-202');
  const [hasBlackout, setHasBlackout] = useState(false);
  const [blackoutCode, setBlackoutCode] = useState('BL-01');

  // Finishing styles
  const [tapeSelected, setTapeSelected] = useState(true);
  const [eyeletSelected, setEyeletSelected] = useState(false);

  const selected = requests.find(r => r.id === selectedId) || requests[0];
  const filtered = filterStatus === 'الكل' ? requests : requests.filter(r => r.status === filterStatus);

  const openNewRoomModal = (room?: Room) => {
    if (room) {
      setEditingRoomId(room.id);
      setRoomName(room.name);
      setRoomType(room.type);
      setWidthCm(room.widthCm);
      setHeightCm(room.heightCm);
      setSides(room.sides);
      setInstallType(room.installationType);
      setCeilingType(room.ceilingType);
      setRoomNotes(room.notes || '');
      setHasSheer(room.fabrics.some(f => f.layer.includes('خفيف')));
      setHasHeavy(room.fabrics.some(f => f.layer.includes('ثقيل')));
      setHasBlackout(room.fabrics.some(f => f.layer.includes('بلاك')));
      setTapeSelected(room.fabrics.some(f => f.tape));
      setEyeletSelected(room.fabrics.some(f => f.eyelet));
    } else {
      setEditingRoomId(null);
      setRoomName(`غرفة ${selected.rooms.length + 1}`);
      setRoomType('شباك');
      setWidthCm(250);
      setHeightCm(270);
      setSides(2);
      setInstallType('مجرى سقف (تراك ألومنيوم)');
      setCeilingType('جيبسون بورد / بيت نور');
      setRoomNotes('');
      setHasSheer(true);
      setSheerCode('T-101');
      setHasHeavy(true);
      setHeavyCode('V-202');
      setHasBlackout(false);
      setBlackoutCode('BL-01');
      setTapeSelected(true);
      setEyeletSelected(false);
    }
    setShowRoomModal(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.isLocked) {
      alert('لا يمكن تعديل المقاسات، الطلب مقفول لأنه قيد التنفيذ في الورشة');
      return;
    }

    const fabrics: FabricLayer[] = [];
    if (hasSheer) fabrics.push({ layer: 'قماش خفيف (تول)', code: sheerCode, tape: tapeSelected, eyelet: eyeletSelected });
    if (hasHeavy) fabrics.push({ layer: 'قماش ثقيل (قطيفة/كتان)', code: heavyCode, tape: tapeSelected, eyelet: eyeletSelected });
    if (hasBlackout) fabrics.push({ layer: 'بلاك آوت عازل ضوء', code: blackoutCode, tape: tapeSelected, eyelet: eyeletSelected });

    const newRoom: Room = {
      id: editingRoomId || `rm-${Date.now()}`,
      name: roomName,
      type: roomType,
      widthCm,
      heightCm,
      sides,
      installationType: installType,
      ceilingType,
      fabrics,
      notes: roomNotes,
    };

    setRequests(prev => prev.map(r => {
      if (r.id !== selected.id) return r;
      if (editingRoomId) {
        return { ...r, status: 'تم رفع المقاسات', rooms: r.rooms.map(rm => rm.id === editingRoomId ? newRoom : rm) };
      }
      return { ...r, status: 'تم رفع المقاسات', rooms: [...r.rooms, newRoom] };
    }));

    setShowRoomModal(false);
  };

  const handleDeleteRoom = (roomId: string) => {
    if (selected.isLocked) {
      alert('الطلب مقفول ولا يمكن حذف الغرف');
      return;
    }
    if (!confirm('هل تريد حذف هذه الغرفة من المقاسات؟')) return;
    setRequests(prev => prev.map(r => r.id === selected.id ? {
      ...r,
      rooms: r.rooms.filter(rm => rm.id !== roomId)
    } : r));
  };

  const handleSendToPricing = () => {
    if (selected.rooms.length === 0) {
      alert('يرجى رفع مقاسات غرفة واحدة على الأقل قبل الإرسال للتسعير');
      return;
    }
    setRequests(prev => prev.map(r => r.id === selected.id ? {
      ...r,
      status: 'قيد التسعير',
    } : r));
    alert('تم إرسال المقاسات بنجاح إلى مرحلة (2. التسعير والعقد والعربون) لدى الإدارة والمبيعات.');
  };

  return (
    <PageShell title="المرحلة 1: المعاينات ورفع المقاسات الفنية">
      <div className="flex flex-col gap-6">
        {/* Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                المرحلة الأولى • فني المعاينات
              </span>
              <span className="text-xs text-slate-500 font-bold">
                (واجهة فنية مخصصة للفني — بدون أي أسعار أو أرقام مالية)
              </span>
            </div>
            <h1 className="font-display font-black text-2xl text-slate-900">المعاينات الميدانية ورفع مقاسات الغرف</h1>
            <p className="text-slate-500 text-sm mt-0.5">تسجيل الأبعاد، أنواع الأسقف، طرق التركيب، وأكواد الأقمشة المطلوبة لكل عميل.</p>
          </div>

          <button
            onClick={() => {
              setCustName(''); setCustPhone(''); setCustAddress(''); setScheduleTime(''); setReqNotes('');
              setShowNewRequestModal(true);
            }}
            className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm shadow-gold flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            طلب معاينة جديد
          </button>
        </div>

        {/* Master Detail Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Requests List */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {filtered.map(req => (
              <div
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className={`p-5 rounded-2xl border bg-white cursor-pointer transition-all ${
                  req.id === selected.id ? 'border-brand-gold ring-2 ring-brand-gold/30 shadow-md' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{req.id}</span>
                    <h3 className="font-bold text-base text-slate-900">{req.customerName}</h3>
                    <p className="text-xs text-slate-500 font-mono" dir="ltr">{req.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      req.status === 'تم رفع المقاسات' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      : req.status === 'في الورشة' ? 'bg-purple-100 text-purple-900 border-purple-200'
                      : req.status === 'قيد التسعير' ? 'bg-blue-100 text-blue-900 border-blue-200'
                      : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {req.status}
                    </span>
                    {req.isLocked && (
                      <span className="text-[10px] text-rose-700 font-bold flex items-center gap-0.5 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        مقفول (في الورشة)
                      </span>
                    )}
                  </div>
                </div>

                {req.address && (
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {req.address}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>الفني: <strong className="text-slate-800">{req.technician}</strong></span>
                  <span className="font-bold text-slate-900">{req.rooms.length} غرف مسجلة</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Selected Request Detail */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-soft">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between pb-5 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-brand-gold-dark">{selected.id}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800">
                    {selected.status}
                  </span>
                  {selected.isLocked && (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      مقفول للتعديل
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-2xl text-slate-900 mt-1">{selected.customerName}</h2>
                <p className="text-xs text-slate-500" dir="ltr">{selected.phone} {selected.address && `| ${selected.address}`}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  disabled={selected.isLocked}
                  onClick={() => openNewRoomModal()}
                  className="bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-gold"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  + رفع مقاسات غرفة جديدة
                </button>

                <button
                  onClick={handleSendToPricing}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  إرسال للمبيعات والتسعير ←
                </button>
              </div>
            </div>

            {/* Lock Notice if locked */}
            {selected.isLocked && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-rose-600">lock</span>
                <span>
                  <strong>تنبيه:</strong> هذا الطلب تم استلامه في الورشة المركزية لبدء القص والتفصيل، لذلك تم قفل تعديل المقاسات للحفاظ على سلامة الإنتاج.
                </span>
              </div>
            )}

            {/* Rooms List */}
            <div className="mt-6 flex flex-col gap-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center justify-between">
                <span>الغرف والمقاسات الفنية المسجلة ({selected.rooms.length}):</span>
              </h3>

              {selected.rooms.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <span className="material-symbols-outlined text-[48px] text-slate-400 block mb-2">square_foot</span>
                  <h4 className="font-bold text-slate-900">لا توجد غرف مسجلة لهذا العميل بعد</h4>
                  <p className="text-xs text-slate-500 mt-1">اضغط على زر &quot;رفع مقاسات غرفة جديدة&quot; لتسجيل الأبعاد والخامات.</p>
                </div>
              ) : (
                selected.rooms.map(room => (
                  <div key={room.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-slate-900">{room.name}</h4>
                          <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">{room.type}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          طريقة التركيب: <strong className="text-slate-900">{room.installationType}</strong> • نوع السقف: <strong className="text-slate-900">{room.ceilingType}</strong>
                        </p>
                      </div>

                      {!selected.isLocked && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openNewRoomModal(room)} className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors" title="تعديل">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteRoom(room.id)} className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-white transition-colors" title="حذف">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Dimensions Row */}
                    <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-center text-xs mb-3">
                      <div>
                        <div className="font-mono font-black text-lg text-slate-900">{room.widthCm} سم</div>
                        <div className="text-[11px] text-slate-400">عرض الشباك/البلكونة</div>
                      </div>
                      <div>
                        <div className="font-mono font-black text-lg text-slate-900">{room.heightCm} سم</div>
                        <div className="text-[11px] text-slate-400">ارتفاع السقف/الماسورة</div>
                      </div>
                      <div>
                        <div className="font-mono font-black text-lg text-slate-900">{room.sides === 2 ? 'جنبين (2)' : 'جنب واحد (1)'}</div>
                        <div className="text-[11px] text-slate-400">عدد الجوانب</div>
                      </div>
                    </div>

                    {/* Fabrics Table */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-right">
                        <thead className="bg-slate-50 font-mono text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">الطبقة المطلوبة</th>
                            <th className="p-2.5">كود القماش المختار</th>
                            <th className="p-2.5 text-center">شريط كشكشة 3 فتلة</th>
                            <th className="p-2.5 text-center">حلقات كبس</th>
                          </tr>
                        </thead>
                        <tbody>
                          {room.fabrics.map((f, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="p-2.5 font-bold text-slate-900">{f.layer}</td>
                              <td className="p-2.5 font-mono font-bold text-brand-gold-dark">{f.code || 'لم يحدد'}</td>
                              <td className="p-2.5 text-center">{f.tape ? '✓' : '—'}</td>
                              <td className="p-2.5 text-center">{f.eyelet ? '✓' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {room.notes && (
                      <div className="mt-2.5 text-xs text-amber-950 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                        <strong>ملاحظات الفني:</strong> {room.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Request */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="font-display font-bold text-xl text-slate-900 mb-4">تسجيل طلب معاينة جديد</h2>
            <form onSubmit={(e) => {
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
                isLocked: false,
                notes: reqNotes,
                rooms: [],
              };
              setRequests([newReq, ...requests]);
              setSelectedId(newReq.id);
              setShowNewRequestModal(false);
            }} className="flex flex-col gap-3">
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
                <input value={custAddress} onChange={e => setCustAddress(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="المنطقة، الشارع، العمارة، الشقة" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">موعد الزيارة</label>
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
                <label className="text-xs font-bold text-slate-700">ملاحظات الطلب</label>
                <textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm h-20 resize-none" placeholder="عدد الغرف، تفضيلات العميل..." />
              </div>

              <div className="flex gap-2 mt-3">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl font-bold text-sm shadow-gold">
                  حفظ الطلب
                </button>
                <button type="button" onClick={() => setShowNewRequestModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Technician Room Measurements Form (100% Zero Prices) */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl my-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">استمارة الفني الميداني</span>
                <h2 className="font-display font-black text-xl text-slate-900 mt-1">
                  {editingRoomId ? 'تعديل مقاسات الغرفة' : 'رفع مقاسات غرفة جديدة'}
                </h2>
              </div>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="flex flex-col gap-4">
              {/* Room Name & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم الغرفة *</label>
                  <input value={roomName} onChange={e => setRoomName(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm" placeholder="الصالة، نوم رئيسية..." required />
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

              {/* Installation & Ceiling */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">طريقة التركيب</label>
                  <select value={installType} onChange={e => setInstallType(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs">
                    <option value="مجرى سقف (تراك ألومنيوم)">مجرى سقف (تراك ألومنيوم)</option>
                    <option value="مجرى حائط">مجرى حائط</option>
                    <option value="مواسير استيل مذهبة">مواسير استيل مذهبة</option>
                    <option value="مواسير خشب">مواسير خشب</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">مكان ونوع السقف</label>
                  <select value={ceilingType} onChange={e => setCeilingType(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs">
                    <option value="جيبسون بورد / بيت نور">جيبسون بورد / بيت نور</option>
                    <option value="سقف عادي خرسانة">سقف عادي خرسانة</option>
                    <option value="سقف معلق خشب">سقف معلق خشب</option>
                  </select>
                </div>
              </div>

              {/* Fabric Layer selection (Only Checkbox + Code) */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <div className="text-xs font-black text-slate-900">طبقات الأقمشة والأكواد المطلوبة:</div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" checked={hasSheer} onChange={e => setHasSheer(e.target.checked)} className="rounded" />
                    <span>قماش خفيف (تول / شيفون)</span>
                  </label>
                  {hasSheer && (
                    <input value={sheerCode} onChange={e => setSheerCode(e.target.value)} placeholder="كود القماش (مثلاً T-101)" className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono w-44" />
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" checked={hasHeavy} onChange={e => setHasHeavy(e.target.checked)} className="rounded" />
                    <span>قماش ثقيل (قطيفة / كتان)</span>
                  </label>
                  {hasHeavy && (
                    <input value={heavyCode} onChange={e => setHeavyCode(e.target.value)} placeholder="كود القماش (مثلاً V-202)" className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono w-44" />
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" checked={hasBlackout} onChange={e => setHasBlackout(e.target.checked)} className="rounded" />
                    <span>بلاك آوت عازل ضوء</span>
                  </label>
                  {hasBlackout && (
                    <input value={blackoutCode} onChange={e => setBlackoutCode(e.target.value)} placeholder="كود القماش (مثلاً BL-01)" className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono w-44" />
                  )}
                </div>
              </div>

              {/* Finishing Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer font-bold">
                  <input type="checkbox" checked={tapeSelected} onChange={e => setTapeSelected(e.target.checked)} className="rounded" />
                  <span>شريط كشكشة (3 فتلة)</span>
                </label>
                <label className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer font-bold">
                  <input type="checkbox" checked={eyeletSelected} onChange={e => setEyeletSelected(e.target.checked)} className="rounded" />
                  <span>حلقات كبس</span>
                </label>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات الفني على الشباك/السقف</label>
                <textarea value={roomNotes} onChange={e => setRoomNotes(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs h-16 resize-none" placeholder="بروز تكييف، زوايا، ارتفاعات خاصة..." />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-3 rounded-xl font-bold text-sm shadow-gold">
                  حفظ مقاسات الغرفة
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
