'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import {
  getInspectionById,
  saveOrUpdateInspection,
  syncInspectionToPricing,
  InspectionData,
  Room
} from '@/lib/inspectionsStore';

const installOptions = [
  'تراك سقف',
  'تراك حائط',
  'مواسير فورجيه',
];

const ceilingOptions = [
  'بيت نور خرسانه',
  'بيت نور / جبس بورد',
  'سقف عادي خرسانه',
];

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || 'INS-001';
  const inspectionId = decodeURIComponent(rawId);

  const [data, setData] = useState<InspectionData>(() => {
    if (typeof window !== 'undefined') {
      const item = getInspectionById(inspectionId);
      if (item) return item;
    }
    return {
      id: inspectionId,
      customerName: 'طلب معاينة',
      phone: '',
      address: '',
      branch: 'الفرع الرئيسي',
      scheduledAt: 'غير محدد',
      technician: 'أحمد حسن',
      status: 'مُجدول',
      isLocked: false,
      notes: '',
      rooms: [],
    };
  });

  useEffect(() => {
    const item = getInspectionById(inspectionId);
    if (item) {
      setData(item);
    }
  }, [inspectionId]);

  // Modal State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Form State
  const [roomName, setRoomName] = useState('الصالة');
  const [roomType, setRoomType] = useState<'شباك' | 'بلكونة'>('شباك');
  const [widthCm, setWidthCm] = useState<number>(250);
  const [heightCm, setHeightCm] = useState<number>(270);
  const [sides, setSides] = useState<number>(2);
  const [installType, setInstallType] = useState('تراك سقف');
  const [ceilingType, setCeilingType] = useState('بيت نور / جبس بورد');
  const [roomNotes, setRoomNotes] = useState('');

  // Lock status (Read-Only when locked or sent)
  const isReadOnly = data.isLocked || data.status === 'قيد التسعير' || data.status === 'في الورشة' || data.status === 'مكتمل';

  const openRoomModal = (room?: Room) => {
    if (room) {
      if (isReadOnly) return; // Editing existing room is disabled when locked
      setEditingRoomId(room.id);
      setRoomName(room.name);
      setRoomType(room.type);
      setWidthCm(room.widthCm);
      setHeightCm(room.heightCm);
      setSides(room.sides);
      setInstallType(room.installationType || 'تراك سقف');
      setCeilingType(room.ceilingType || 'بيت نور / جبس بورد');
      setRoomNotes(room.notes || '');
    } else {
      // Adding NEW room is allowed even if completed or locked
      setEditingRoomId(null);
      setRoomName(`غرفة ${data.rooms.length + 1}`);
      setRoomType('شباك');
      setWidthCm(250);
      setHeightCm(270);
      setSides(2);
      setInstallType('تراك سقف');
      setCeilingType('بيت نور / جبس بورد');
      setRoomNotes('');
    }
    setShowRoomModal(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoomId && isReadOnly) return;

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

    let updatedRooms: Room[];
    if (editingRoomId) {
      updatedRooms = data.rooms.map(rm => rm.id === editingRoomId ? newRoom : rm);
    } else {
      updatedRooms = [...data.rooms, newRoom];
    }

    const updatedData: InspectionData = {
      ...data,
      status: data.status === 'مكتمل' ? 'مكتمل' : 'تم رفع المقاسات',
      rooms: updatedRooms,
    };

    setData(updatedData);
    saveOrUpdateInspection(updatedData);
    setShowRoomModal(false);
  };

  const handleDeleteRoom = (roomId: string) => {
    if (isReadOnly) return;
    if (!confirm('هل تريد حذف هذه الغرفة من المقاسات؟')) return;
    const updatedData: InspectionData = {
      ...data,
      rooms: data.rooms.filter(rm => rm.id !== roomId)
    };
    setData(updatedData);
    saveOrUpdateInspection(updatedData);
  };

  const handleSendToPricing = () => {
    if (data.rooms.length === 0) {
      alert('يرجى رفع مقاسات غرفة واحدة على الأقل');
      return;
    }
    const updatedData: InspectionData = { ...data, status: 'قيد التسعير' };
    setData(updatedData);
    saveOrUpdateInspection(updatedData);
    syncInspectionToPricing(updatedData);
    alert('تم إرسال المقاسات بنجاح إلى مرحلة (التسعير والعقد) لدى المبيعات.');
    router.push('/pipeline/pricing');
  };

  return (
    <PageShell title={`معاينة ${data.id} — ${data.customerName}`}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* 🖨️ Official Print Header (Only visible on paper) */}
        <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 border border-slate-800 rounded-xl p-1 flex items-center justify-center">
                <Logo size="md" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-900">أحمد كشك للأقمشة والستائر الفاخرة</h1>
                <p className="text-xs text-slate-600">الفرع: {data.branch} • هاتف المحل: 01063821000</p>
              </div>
            </div>
            <div className="text-left font-mono">
              <div className="text-sm font-black bg-slate-100 px-3 py-1 rounded border border-slate-300 inline-block">
                كشف مقاسات: {data.id}
              </div>
              <div className="text-xs text-slate-500 mt-1">تاريخ الكشف: {new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs">
            <div><strong>اسم العميل:</strong> {data.customerName}</div>
            <div><strong>رقم الهاتف:</strong> <span dir="ltr">{data.phone}</span></div>
            <div><strong>العنوان:</strong> {data.address || '—'}</div>
            <div><strong>الفني المسؤول:</strong> {data.technician}</div>
            <div><strong>موعد الزيارة:</strong> {data.scheduledAt}</div>
            <div><strong>حالة الطلب:</strong> {data.status}</div>
          </div>
        </div>

        {/* Top Action Bar on Screen */}
        <div className="no-print flex items-center justify-between gap-3">
          <Link
            href="/pipeline/inspections"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            العودة لقائمة المعاينات
          </Link>

          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            طباعة كشف المقاسات
          </button>
        </div>

        {/* Customer Info Card on Screen */}
        <div className="no-print bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-soft">
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
                {isReadOnly && (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    مقفول للتعديل (في الورشة/السجل)
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 mt-2">{data.customerName}</h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${data.phone}`}
                className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span dir="ltr">{data.phone}</span>
              </a>
              <a
                href={`https://wa.me/2${data.phone}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                واتساب
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">العنوان:</span>
              <strong className="text-slate-800">{data.address || 'غير مسجل'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الفرع:</span>
              <strong className="text-slate-800">{data.branch}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الفني:</span>
              <strong className="text-slate-800">{data.technician}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الموعد:</span>
              <strong className="text-slate-800 font-mono">{data.scheduledAt}</strong>
            </div>
          </div>
        </div>

        {/* Lock Alert if read-only */}
        {isReadOnly && (
          <div className="no-print bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[22px] text-rose-600 shrink-0">lock</span>
            <div>
              <strong>وضع القراءة فقط:</strong> هذا الطلب تم اعتماده وتحويله للورشة أو مسجل بالسجلات، ولا يمكن تعديل المقاسات لتفادي تلف الأقمشة.
            </div>
          </div>
        )}

        {/* Rooms Header on Screen */}
        <div className="no-print flex items-center justify-between gap-3">
          <h2 className="font-display font-black text-lg sm:text-xl text-slate-900">
            مقاسات الغرف المسجلة ({data.rooms.length} غرف)
          </h2>

          <button
            onClick={() => openRoomModal()}
            className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-gold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ إضافة ستارة / مقاس جديد</span>
          </button>
        </div>

        {/* 🖨️ Clean Print Table (A4 Format) */}
        <div className="print-only">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 font-bold border-b-2 border-slate-900">
              <tr>
                <th className="p-2 text-center">#</th>
                <th className="p-2">اسم الغرفة</th>
                <th className="p-2">المكان</th>
                <th className="p-2 text-center font-mono">العرض (سم)</th>
                <th className="p-2 text-center font-mono">الارتفاع (سم)</th>
                <th className="p-2 text-center">الجوانب</th>
                <th className="p-2">طريقة التركيب</th>
                <th className="p-2">نوع ومكان السقف</th>
                <th className="p-2">ملاحظات فنية</th>
              </tr>
            </thead>
            <tbody>
              {data.rooms.map((room, idx) => (
                <tr key={room.id} className="border-b border-slate-300">
                  <td className="p-2 text-center font-bold">{idx + 1}</td>
                  <td className="p-2 font-bold">{room.name}</td>
                  <td className="p-2">{room.type}</td>
                  <td className="p-2 text-center font-mono font-bold text-sm">{room.widthCm}</td>
                  <td className="p-2 text-center font-mono font-bold text-sm">{room.heightCm}</td>
                  <td className="p-2 text-center">{room.sides === 2 ? 'جنبين (2)' : 'جنب واحد'}</td>
                  <td className="p-2">{room.installationType}</td>
                  <td className="p-2">{room.ceilingType}</td>
                  <td className="p-2 text-[11px]">{room.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {/* Screen Display Cards for Rooms */}
        <div className="no-print">
          {data.rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <span className="material-symbols-outlined text-[44px] text-slate-300 block mb-2">square_foot</span>
              <h3 className="font-bold text-slate-800 text-base">لم يتم رفع مقاسات أي غرفة بعد</h3>
              {!isReadOnly && (
                <button
                  onClick={() => openRoomModal()}
                  className="mt-3 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow"
                >
                  + إضافة الغرفة الأولى
                </button>
              )}
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

                      {!isReadOnly && (
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

                    {/* Big Bold Numbers for Technician */}
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
        </div>

        {/* Submit to Sales Button on Screen */}
        {!isReadOnly && data.rooms.length > 0 && (
          <div className="no-print bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
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

      {/* Modal: Room Form (Radio Pills for Installation & Ceiling) */}
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

            <form onSubmit={handleSaveRoom} className="flex flex-col gap-4">
              {/* Room name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم الغرفة / المكان *</label>
                  <input value={roomName} onChange={e => setRoomName(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="الصالة، نوم رئيسية..." required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">نوع المكان</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['شباك', 'بلكونة'].map((t) => (
                      <label
                        key={t}
                        onClick={() => setRoomType(t as any)}
                        className={`p-2 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                          roomType === t ? 'bg-brand-gold text-slate-950 border-brand-gold shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {t}
                      </label>
                    ))}
                  </div>
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
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setSides(2)}
                      className={`py-2 text-[11px] font-bold rounded-lg border ${sides === 2 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                    >
                      جنبين
                    </button>
                    <button
                      type="button"
                      onClick={() => setSides(1)}
                      className={`py-2 text-[11px] font-bold rounded-lg border ${sides === 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                    >
                      جنب
                    </button>
                  </div>
                </div>
              </div>

              {/* 🎯 طريقة التركيب (اختيارات واضحة وظاهرة يعلم عليها صح) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-800">طريقة التركيب:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {installOptions.map((opt) => (
                    <label
                      key={opt}
                      onClick={() => setInstallType(opt)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between sm:flex-col sm:text-center sm:gap-1.5 cursor-pointer text-xs font-bold transition-all ${
                        installType === opt
                          ? 'bg-amber-50 border-brand-gold text-slate-950 shadow-xs ring-1 ring-brand-gold/40'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="leading-tight">{opt}</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        installType === opt ? 'bg-brand-gold border-brand-gold text-slate-950 font-black' : 'border-slate-300'
                      }`}>
                        {installType === opt ? '✓' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 🎯 مكان ونوع السقف (اختيارات واضحة وظاهرة يعلم عليها صح) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-800">مكان ونوع السقف:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ceilingOptions.map((opt) => (
                    <label
                      key={opt}
                      onClick={() => setCeilingType(opt)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between sm:flex-col sm:text-center sm:gap-1.5 cursor-pointer text-xs font-bold transition-all ${
                        ceilingType === opt
                          ? 'bg-amber-50 border-brand-gold text-slate-950 shadow-xs ring-1 ring-brand-gold/40'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="leading-tight">{opt}</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        ceilingType === opt ? 'bg-brand-gold border-brand-gold text-slate-950 font-black' : 'border-slate-300'
                      }`}>
                        {ceilingType === opt ? '✓' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات الفني على الموقع</label>
                <textarea value={roomNotes} onChange={e => setRoomNotes(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs h-14 resize-none" placeholder="بروز تكييف، زوايا، ارتفاعات خاصة..." />
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
