'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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

interface InspectionData {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  scheduledAt: string;
  technician: string;
  status: 'مُجدول' | 'تم رفع المقاسات' | 'قيد التسعير' | 'في الورشة' | 'مكتمل';
  isLocked: boolean;
  notes: string;
  rooms: Room[];
}

const mockDetail: Record<string, InspectionData> = {
  'INS-001': {
    id: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42 شارع التسعين',
    branch: 'الفرع الرئيسي',
    scheduledAt: '2026-08-26 16:00',
    technician: 'أحمد حسن',
    status: 'تم رفع المقاسات',
    isLocked: false,
    notes: 'شقة 3 غرف + ريسبشن بلكونة كبيرة',
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
    ],
  },
  'INS-002': {
    id: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    branch: 'فرع عرابي',
    scheduledAt: '2026-08-27 12:00',
    technician: 'محمد علي',
    status: 'مُجدول',
    isLocked: false,
    notes: 'شقة عروسة — مطلوب معاينة ورفع مقاسات 4 غرف',
    rooms: [],
  }
};

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = (params?.id as string) || 'INS-001';

  const [data, setData] = useState<InspectionData>(
    mockDetail[inspectionId] || {
      id: inspectionId,
      customerName: 'عميل تجريبي',
      phone: '01000000000',
      address: 'القاهرة',
      branch: 'الفرع الرئيسي',
      scheduledAt: '2026-08-26 12:00',
      technician: 'أحمد حسن',
      status: 'مُجدول',
      isLocked: false,
      notes: '',
      rooms: [],
    }
  );

  // Room modal
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Room Form State (100% Zero Prices)
  const [roomName, setRoomName] = useState('الصالة');
  const [roomType, setRoomType] = useState<'شباك' | 'بلكونة'>('شباك');
  const [widthCm, setWidthCm] = useState<number>(250);
  const [heightCm, setHeightCm] = useState<number>(270);
  const [sides, setSides] = useState<number>(2);
  const [installType, setInstallType] = useState('مجرى سقف (تراك ألومنيوم)');
  const [ceilingType, setCeilingType] = useState('جيبسون بورد / بيت نور');
  const [roomNotes, setRoomNotes] = useState('');

  // Fabrics & Codes
  const [hasSheer, setHasSheer] = useState(true);
  const [sheerCode, setSheerCode] = useState('T-101');
  const [hasHeavy, setHasHeavy] = useState(true);
  const [heavyCode, setHeavyCode] = useState('V-202');
  const [hasBlackout, setHasBlackout] = useState(false);
  const [blackoutCode, setBlackoutCode] = useState('BL-01');

  // Finishing
  const [tapeSelected, setTapeSelected] = useState(true);
  const [eyeletSelected, setEyeletSelected] = useState(false);

  const openRoomModal = (room?: Room) => {
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
      setRoomName(`غرفة ${data.rooms.length + 1}`);
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
    if (data.isLocked) {
      alert('لا يمكن التعديل: المعاينة مقفولة لأنها قيد التنفيذ في الورشة');
      return;
    }

    const fabrics: FabricLayer[] = [];
    if (hasSheer) fabrics.push({ layer: 'قماش خفيف (تول/شيفون)', code: sheerCode, tape: tapeSelected, eyelet: eyeletSelected });
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

    if (editingRoomId) {
      setData(prev => ({
        ...prev,
        status: 'تم رفع المقاسات',
        rooms: prev.rooms.map(rm => rm.id === editingRoomId ? newRoom : rm)
      }));
    } else {
      setData(prev => ({
        ...prev,
        status: 'تم رفع المقاسات',
        rooms: [...prev.rooms, newRoom]
      }));
    }

    setShowRoomModal(false);
  };

  const handleDeleteRoom = (roomId: string) => {
    if (data.isLocked) return;
    if (!confirm('هل تريد حذف هذه الغرفة من المقاسات؟')) return;
    setData(prev => ({
      ...prev,
      rooms: prev.rooms.filter(rm => rm.id !== roomId)
    }));
  };

  const handleSendToPricing = () => {
    if (data.rooms.length === 0) {
      alert('يرجى رفع مقاسات غرفة واحدة على الأقل');
      return;
    }
    setData(prev => ({ ...prev, status: 'قيد التسعير' }));
    alert('تم إرسال المقاسات بنجاح إلى مرحلة (2. التسعير والعقد والعربون) لدى الإدارة والمبيعات.');
    router.push('/pipeline/pricing');
  };

  return (
    <PageShell title={`معاينة ${data.id} — ${data.customerName}`}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Navigation Bar Back Button */}
        <div className="flex items-center justify-between">
          <Link
            href="/pipeline/inspections"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            العودة لقائمة المعاينات
          </Link>

          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              طباعة الكشف
            </button>
          </div>
        </div>

        {/* Customer Header Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-brand-gold-dark bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  {data.id}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  data.status === 'تم رفع المقاسات' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  : data.status === 'في الورشة' ? 'bg-purple-100 text-purple-900 border-purple-200'
                  : 'bg-amber-100 text-amber-900 border-amber-200'
                }`}>
                  {data.status}
                </span>
                {data.isLocked && (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    مقفول للتعديل (في الورشة)
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 mt-2">{data.customerName}</h1>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${data.phone}`}
                className="flex-1 sm:flex-none bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span dir="ltr">{data.phone}</span>
              </a>
              <a
                href={`https://wa.me/2${data.phone}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
              >
                واتساب
              </a>
            </div>
          </div>

          {/* Quick info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">العنوان:</span>
              <strong className="text-slate-800">{data.address || 'غير مسجل'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الفرع المتابع:</span>
              <strong className="text-slate-800">{data.branch}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الفني المسؤول:</span>
              <strong className="text-slate-800">{data.technician}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">موعد الزيارة:</span>
              <strong className="text-slate-800 font-mono">{data.scheduledAt}</strong>
            </div>
          </div>

          {data.notes && (
            <div className="mt-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <strong>ملاحظات العميل:</strong> {data.notes}
            </div>
          )}
        </div>

        {/* Lock Notice */}
        {data.isLocked && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-rose-600 shrink-0">lock</span>
            <div>
              <strong>تنبيه الأمان الفني:</strong> هذا الطلب تم اعتماده وبدء القص في الورشة المركزية، لذلك تم قفل إمكانية تعديل المقاسات لتفادي تلف الأقمشة.
            </div>
          </div>
        )}

        {/* Rooms Section Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-black text-xl text-slate-900">
              مقاسات الغرف المسجلة ({data.rooms.length} غرف)
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              الأبعاد الدقيقة، أنواع التراكات، وأكواد الأقمشة المختارة (نسخة الفني).
            </p>
          </div>

          <button
            disabled={data.isLocked}
            onClick={() => openRoomModal()}
            className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-40 text-slate-950 px-5 py-3 rounded-xl font-black text-xs sm:text-sm shadow-gold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            + إضافة مقاسات غرفة جديدة
          </button>
        </div>

        {/* Rooms Grid / Cards */}
        {data.rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-slate-300 block mb-2">square_foot</span>
            <h3 className="font-bold text-slate-800 text-base">لم يتم رفع مقاسات أي غرفة بعد</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">اضغط على زر &quot;إضافة مقاسات غرفة جديدة&quot; لبدء تسجيل الأبعاد.</p>
            <button
              onClick={() => openRoomModal()}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow"
            >
              + إضافة الغرفة الأولى
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {data.rooms.map((room, idx) => (
              <div key={room.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-gold text-slate-950 flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-lg text-slate-900">{room.name}</h3>
                        <span className="text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                          {room.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        طريقة التركيب: <strong className="text-slate-800">{room.installationType}</strong>
                      </p>
                    </div>

                    {!data.isLocked && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openRoomModal(room)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                          title="تعديل"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-slate-100"
                          title="حذف"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dimensions Box - Big bold readable numbers for technicians */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center mb-3">
                    <div>
                      <div className="font-mono font-black text-xl text-slate-900">{room.widthCm} <span className="text-xs font-normal">سم</span></div>
                      <div className="text-[10px] text-slate-400 font-bold">العرض</div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-xl text-slate-900">{room.heightCm} <span className="text-xs font-normal">سم</span></div>
                      <div className="text-[10px] text-slate-400 font-bold">الارتفاع</div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-base text-slate-900 mt-0.5">{room.sides === 2 ? 'جنبين (2)' : 'جنب (1)'}</div>
                      <div className="text-[10px] text-slate-400 font-bold">الجوانب</div>
                    </div>
                  </div>

                  {/* Ceiling & Installation */}
                  <div className="text-xs text-slate-600 bg-amber-50/60 border border-amber-200/80 p-2.5 rounded-xl mb-3">
                    <strong>مكان ونوع السقف:</strong> {room.ceilingType}
                  </div>

                  {/* Fabrics table */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden text-xs mb-3">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 font-mono text-[11px] text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2">الطبقة</th>
                          <th className="p-2">كود القماش</th>
                          <th className="p-2 text-center">شريط</th>
                          <th className="p-2 text-center">كبس</th>
                        </tr>
                      </thead>
                      <tbody>
                        {room.fabrics.map((f, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="p-2 font-bold text-slate-900">{f.layer}</td>
                            <td className="p-2 font-mono font-bold text-brand-gold-dark">{f.code || 'لم يحدد'}</td>
                            <td className="p-2 text-center">{f.tape ? '✓' : '—'}</td>
                            <td className="p-2 text-center">{f.eyelet ? '✓' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {room.notes && (
                    <div className="text-xs text-slate-700 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                      <strong>ملاحظات فنية:</strong> {room.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit to Sales & Pricing Button */}
        {data.rooms.length > 0 && (
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
            <div>
              <h3 className="font-bold text-base">جاهز لاعتماد المقاسات والتسعير؟</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سيتم إرسال المقاسات مباشرة لمسؤول المبيعات لحساب التكاليف وطباعة العقد للعميل.
              </p>
            </div>
            <button
              onClick={handleSendToPricing}
              className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-6 py-3 rounded-xl font-black text-sm shadow-gold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>إرسال للمبيعات والتسعير والعربون</span>
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Room Form (Technician Zero Prices) */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-xl my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">استمارة الفني</span>
                <h2 className="font-display font-black text-lg sm:text-xl text-slate-900 mt-1">
                  {editingRoomId ? 'تعديل مقاسات الغرفة' : 'رفع مقاسات غرفة جديدة'}
                </h2>
              </div>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="flex flex-col gap-3.5">
              {/* Room name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم الغرفة / المكان *</label>
                  <input value={roomName} onChange={e => setRoomName(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="الصالة، نوم رئيسية..." required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">نوع المكان</label>
                  <select value={roomType} onChange={e => setRoomType(e.target.value as any)} className="border border-slate-200 rounded-xl p-2.5 text-sm">
                    <option value="شباك">شباك</option>
                    <option value="بلكونة">بلكونة</option>
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700">العرض (سم) *</label>
                  <input type="number" value={widthCm} onChange={e => setWidthCm(Number(e.target.value))} className="border border-slate-300 rounded-xl p-2 text-sm font-mono font-black text-center" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700">الارتفاع (سم) *</label>
                  <input type="number" value={heightCm} onChange={e => setHeightCm(Number(e.target.value))} className="border border-slate-300 rounded-xl p-2 text-sm font-mono font-black text-center" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700">الجوانب</label>
                  <select value={sides} onChange={e => setSides(Number(e.target.value))} className="border border-slate-300 rounded-xl p-2 text-xs font-bold text-center">
                    <option value={2}>جنبين (2)</option>
                    <option value={1}>جنب (1)</option>
                  </select>
                </div>
              </div>

              {/* Installation & Ceiling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">طريقة التركيب</label>
                  <select value={installType} onChange={e => setInstallType(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-xs">
                    <option value="مجرى سقف (تراك ألومنيوم)">مجرى سقف (تراك ألومنيوم)</option>
                    <option value="مجرى حائط">مجرى حائط</option>
                    <option value="مواسير استيل مذهبة">مواسير استيل مذهبة</option>
                    <option value="مواسير خشب">مواسير خشب</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">مكان ونوع السقف</label>
                  <select value={ceilingType} onChange={e => setCeilingType(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-xs">
                    <option value="جيبسون بورد / بيت نور">جيبسون بورد / بيت نور</option>
                    <option value="سقف عادي خرسانة">سقف عادي خرسانة</option>
                    <option value="سقف معلق خشب">سقف معلق خشب</option>
                  </select>
                </div>
              </div>

              {/* Fabrics & Codes (Zero Prices) */}
              <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2.5 bg-slate-50/50">
                <div className="text-xs font-black text-slate-900">طبقات الأقمشة والأكواد:</div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" checked={hasSheer} onChange={e => setHasSheer(e.target.checked)} className="rounded" />
                    <span>تول / شيفون خفيف</span>
                  </label>
                  {hasSheer && (
                    <input value={sheerCode} onChange={e => setSheerCode(e.target.value)} placeholder="كود القماش (مثلاً T-101)" className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono w-40" />
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" checked={hasHeavy} onChange={e => setHasHeavy(e.target.checked)} className="rounded" />
                    <span>قطيفة / كتان ثقيل</span>
                  </label>
                  {hasHeavy && (
                    <input value={heavyCode} onChange={e => setHeavyCode(e.target.value)} placeholder="كود القماش (مثلاً V-202)" className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono w-40" />
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input type="checkbox" checked={hasBlackout} onChange={e => setHasBlackout(e.target.checked)} className="rounded" />
                    <span>بلاك آوت عازل ضوء</span>
                  </label>
                  {hasBlackout && (
                    <input value={blackoutCode} onChange={e => setBlackoutCode(e.target.value)} placeholder="كود القماش (مثلاً BL-01)" className="border border-slate-200 rounded-lg p-1.5 text-xs font-mono w-40" />
                  )}
                </div>
              </div>

              {/* Finishing */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer font-bold">
                  <input type="checkbox" checked={tapeSelected} onChange={e => setTapeSelected(e.target.checked)} className="rounded" />
                  <span>شريط كشكشة (3 فتلة)</span>
                </label>
                <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer font-bold">
                  <input type="checkbox" checked={eyeletSelected} onChange={e => setEyeletSelected(e.target.checked)} className="rounded" />
                  <span>حلقات كبس</span>
                </label>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات الفني على الموقع</label>
                <textarea value={roomNotes} onChange={e => setRoomNotes(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs h-16 resize-none" placeholder="بروز تكييف، زوايا، ارتفاعات خاصة..." />
              </div>

              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
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
