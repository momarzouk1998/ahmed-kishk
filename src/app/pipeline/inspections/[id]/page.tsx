'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  type: 'شباك' | 'بلكونة';
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  ceilingType: string;
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
    address: 'التجمع الخامس، فيلا 42',
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
        notes: 'تثبيت الماسورة أعلى حلق الشباك بـ 15سم',
      }
    ],
  },
  'INS-002': {
    id: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، بيفرلي هيلز',
    branch: 'فرع عرابي',
    scheduledAt: '2026-08-27 12:00',
    technician: 'محمد علي',
    status: 'مُجدول',
    isLocked: false,
    notes: 'شقة عروسة — 4 غرف',
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

  // Pure Geometric Measurements State (100% Zero Prices, No Fabrics)
  const [roomName, setRoomName] = useState('الصالة');
  const [roomType, setRoomType] = useState<'شباك' | 'بلكونة'>('شباك');
  const [widthCm, setWidthCm] = useState<number>(250);
  const [heightCm, setHeightCm] = useState<number>(270);
  const [sides, setSides] = useState<number>(2);
  const [installType, setInstallType] = useState('مجرى سقف (تراك ألومنيوم)');
  const [ceilingType, setCeilingType] = useState('جيبسون بورد / بيت نور');
  const [roomNotes, setRoomNotes] = useState('');

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
    }
    setShowRoomModal(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.isLocked) {
      alert('لا يمكن التعديل: المعاينة مقفولة لأنها قيد التنفيذ في الورشة');
      return;
    }

    const newRoom: Room = {
      id: editingRoomId || `rm-${Date.now()}`,
      name: roomName,
      type: roomType,
      widthCm,
      heightCm,
      sides,
      installationType: installType,
      ceilingType,
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
    alert('تم إرسال المقاسات بنجاح إلى مرحلة (التسعير والعقد) لدى المبيعات.');
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

            {/* Quick Contact Buttons */}
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
        </div>

        {/* Lock Notice */}
        {data.isLocked && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-rose-600 shrink-0">lock</span>
            <div>
              <strong>تنبيه:</strong> هذا الطلب تم اعتماده وبدء القص في الورشة، لذلك تم قفل تعديل المقاسات لتفادي تلف الأقمشة.
            </div>
          </div>
        )}

        {/* Rooms Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display font-black text-xl text-slate-900">
            مقاسات الغرف المسجلة ({data.rooms.length} غرف)
          </h2>

          <button
            disabled={data.isLocked}
            onClick={() => openRoomModal()}
            className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-hover disabled:opacity-40 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-gold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>إضافة غرفة جديدة</span>
          </button>
        </div>

        {/* Rooms Grid */}
        {data.rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-slate-300 block mb-2">square_foot</span>
            <h3 className="font-bold text-slate-800 text-base">لم يتم رفع مقاسات أي غرفة بعد</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">اضغط على زر &quot;إضافة غرفة جديدة&quot; لتسجيل الأبعاد.</p>
            <button
              onClick={() => openRoomModal()}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow"
            >
              + إضافة الغرفة الأولى
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.rooms.map((room, idx) => (
              <div key={room.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-brand-gold text-slate-950 flex items-center justify-center font-black text-xs">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-lg text-slate-900">{room.name}</h3>
                      <span className="text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                        {room.type}
                      </span>
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

                  {/* Big Dimensions Box */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center mb-3">
                    <div>
                      <div className="font-mono font-black text-xl text-slate-900">{room.widthCm} <span className="text-xs font-normal">سم</span></div>
                      <div className="text-[10px] text-slate-400 font-bold">العرض</div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-xl text-slate-900">{room.heightCm} <span className="text-xs font-normal">سم</span></div>
                      <div className="text-[10px] text-slate-400 font-bold">الارتفاع</div>
                    </div>
                    <div>
                      <div className="font-mono font-black text-base text-slate-900 mt-0.5">{room.sides === 2 ? 'جنبين' : 'جنب واحد'}</div>
                      <div className="text-[10px] text-slate-400 font-bold">الجوانب</div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium text-slate-700">
                    <div><strong>طريقة التركيب:</strong> {room.installationType}</div>
                    <div><strong>مكان ونوع السقف:</strong> {room.ceilingType}</div>
                  </div>

                  {room.notes && (
                    <div className="text-xs text-amber-950 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
                      <strong>ملاحظات فنية:</strong> {room.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit to Sales Button */}
        {data.rooms.length > 0 && (
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
            <div>
              <h3 className="font-bold text-base">اعتماد المقاسات وإرسالها للمبيعات</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سيتم تحويل المقاسات مباشرة لمسؤول المبيعات لحساب التكاليف والعقد.
              </p>
            </div>
            <button
              onClick={handleSendToPricing}
              className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-6 py-3 rounded-xl font-black text-sm shadow-gold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>إرسال للتسعير والعقد</span>
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Room Form (Pure Measurements Only) */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h2 className="font-display font-black text-lg text-slate-900">
                {editingRoomId ? 'تعديل مقاسات الغرفة' : 'رفع مقاسات غرفة جديدة'}
              </h2>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="flex flex-col gap-3.5">
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
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
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
