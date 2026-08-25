'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

type InspectionStatus = 'مُجدول' | 'قيد الانتظار' | 'مكتمل' | 'ملغي';
type InspectionStage = 'معاينة' | 'اختيار قماش' | 'ورشة' | 'تركيب';

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
  meters: number;
  avgPrice: number;
}

interface InspectionRequest {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  scheduledAt: string;
  technician: string;
  status: InspectionStatus;
  stage: InspectionStage;
  rooms: Room[];
  notes: string;
}

const initialRequests: InspectionRequest[] = [
  {
    id: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    scheduledAt: '2026-08-26T16:00',
    technician: 'أحمد حسن',
    status: 'مُجدول',
    stage: 'معاينة',
    notes: 'شقة 3 غرف + صالة',
    rooms: [
      {
        id: 'r1',
        name: 'الصالة الرئيسية',
        type: 'بلكونة',
        widthCm: 350,
        heightCm: 280,
        sides: 2,
        installationType: 'مجرى سقف',
        ceilingType: 'جيبسون بورد',
        fabrics: [
          { layer: 'خفيف (تول)', code: 'T-402', tape: true, eyelet: false },
          { layer: 'ثقيل', code: 'V-990', tape: false, eyelet: true }
        ],
        meters: 15.75,
        avgPrice: 450
      },
      {
        id: 'r2',
        name: 'غرفة النوم الرئيسية',
        type: 'شباك',
        widthCm: 200,
        heightCm: 260,
        sides: 2,
        installationType: 'مواسير',
        ceilingType: 'عادي',
        fabrics: [
          { layer: 'بلاك آوت', code: 'BL-220', tape: true, eyelet: false }
        ],
        meters: 9,
        avgPrice: 380
      }
    ]
  },
  {
    id: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    scheduledAt: '2026-08-27T12:00',
    technician: 'محمد علي',
    status: 'قيد الانتظار',
    stage: 'معاينة',
    notes: 'طلب معاينة لشقة عروسة',
    rooms: []
  },
  {
    id: 'INS-003',
    customerName: 'شركة المعمار',
    phone: '01155556666',
    address: 'المهندسين، شارع البطل أحمد عبد العزيز',
    scheduledAt: '2026-08-24T11:00',
    technician: 'محمد علي',
    status: 'مكتمل',
    stage: 'اختيار قماش',
    notes: 'مكتب تجاري — 6 غرف',
    rooms: []
  }
];

export default function InspectionsPage() {
  const [requests, setRequests] = useState<InspectionRequest[]>(initialRequests);
  const [selectedId, setSelectedId] = useState<string>('INS-001');
  const [activeTab, setActiveTab] = useState<'rooms' | 'info'>('rooms');
  const [filterStatus, setFilterStatus] = useState<string>('الكل');

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // New/Edit Request Form state
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [techName, setTechName] = useState('أحمد حسن');
  const [reqStatus, setReqStatus] = useState<InspectionStatus>('مُجدول');
  const [reqNotes, setReqNotes] = useState('');

  // Room Form state
  const [roomName, setRoomName] = useState('الصالة');
  const [roomType, setRoomType] = useState<'شباك' | 'بلكونة'>('شباك');
  const [widthCm, setWidthCm] = useState<number>(250);
  const [heightCm, setHeightCm] = useState<number>(270);
  const [sides, setSides] = useState<number>(2);
  const [installType, setInstallType] = useState('مجرى سقف');
  const [ceilingType, setCeilingType] = useState('جيبسون بورد');
  const [sheerSelected, setSheerSelected] = useState(true);
  const [sheerCode, setSheerCode] = useState('T-101');
  const [heavySelected, setHeavySelected] = useState(true);
  const [heavyCode, setHeavyCode] = useState('V-202');
  const [blackoutSelected, setBlackoutSelected] = useState(false);
  const [blackoutCode, setBlackoutCode] = useState('BL-01');
  const [tapeSelected, setTapeSelected] = useState(true);
  const [eyeletSelected, setEyeletSelected] = useState(false);
  const [avgPrice, setAvgPrice] = useState<number>(400);

  const selected = requests.find(r => r.id === selectedId) || requests[0];
  const filtered = filterStatus === 'الكل' ? requests : requests.filter(r => r.status === filterStatus);

  const statusColors: Record<InspectionStatus, string> = {
    'مُجدول': 'bg-secondary-container text-on-secondary-container',
    'قيد الانتظار': 'bg-surface-container text-on-surface-variant',
    'مكتمل': 'bg-primary text-on-primary',
    'ملغي': 'bg-error-container text-on-error-container',
  };

  const stageColors: Record<InspectionStage, string> = {
    'معاينة': 'text-on-surface-variant',
    'اختيار قماش': 'text-secondary',
    'ورشة': 'text-on-surface',
    'تركيب': 'text-primary',
  };

  // Open Create Request Modal
  const openCreateModal = () => {
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setScheduleTime('');
    setTechName('أحمد حسن');
    setReqStatus('مُجدول');
    setReqNotes('');
    setShowNewRequestModal(true);
  };

  // Open Edit Request Modal
  const openEditModal = () => {
    if (!selected) return;
    setCustName(selected.customerName);
    setCustPhone(selected.phone);
    setCustAddress(selected.address);
    setScheduleTime(selected.scheduledAt);
    setTechName(selected.technician);
    setReqStatus(selected.status);
    setReqNotes(selected.notes);
    setShowEditRequestModal(true);
  };

  // Save new request
  const handleSaveNewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;
    const newReq: InspectionRequest = {
      id: `INS-${String(requests.length + 1).padStart(3, '0')}`,
      customerName: custName,
      phone: custPhone,
      address: custAddress,
      scheduledAt: scheduleTime,
      technician: techName,
      status: reqStatus,
      stage: 'معاينة',
      notes: reqNotes,
      rooms: []
    };
    setRequests([newReq, ...requests]);
    setSelectedId(newReq.id);
    setShowNewRequestModal(false);
  };

  // Save edited request
  const handleSaveEditRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequests(prev => prev.map(r => r.id === selected.id ? {
      ...r,
      customerName: custName,
      phone: custPhone,
      address: custAddress,
      scheduledAt: scheduleTime,
      technician: techName,
      status: reqStatus,
      notes: reqNotes,
    } : r));
    setShowEditRequestModal(false);
  };

  // Open Room Modal (New or Edit)
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
      setSheerSelected(room.fabrics.some(f => f.layer.includes('خفيف')));
      setHeavySelected(room.fabrics.some(f => f.layer.includes('ثقيل')));
      setBlackoutSelected(room.fabrics.some(f => f.layer.includes('بلاك')));
      setTapeSelected(room.fabrics.some(f => f.tape));
      setEyeletSelected(room.fabrics.some(f => f.eyelet));
      setAvgPrice(room.avgPrice);
    } else {
      setEditingRoomId(null);
      setRoomName(`غرفة ${selected.rooms.length + 1}`);
      setRoomType('شباك');
      setWidthCm(250);
      setHeightCm(270);
      setSides(2);
      setInstallType('مجرى سقف');
      setCeilingType('جيبسون بورد');
      setSheerSelected(true);
      setHeavySelected(true);
      setBlackoutSelected(false);
      setTapeSelected(true);
      setEyeletSelected(false);
      setAvgPrice(400);
    }
    setShowRoomModal(true);
  };

  // Save Room (Add / Edit)
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate estimated meters = (width in meters * 2.5 fullness factor) * sides
    const meters = Number(((widthCm / 100) * 2.2 * (sides === 2 ? 1.2 : 1)).toFixed(2));
    
    const fabrics: FabricLayer[] = [];
    if (sheerSelected) fabrics.push({ layer: 'خفيف (تول)', code: sheerCode, tape: tapeSelected, eyelet: eyeletSelected });
    if (heavySelected) fabrics.push({ layer: 'ثقيل', code: heavyCode, tape: tapeSelected, eyelet: eyeletSelected });
    if (blackoutSelected) fabrics.push({ layer: 'بلاك آوت', code: blackoutCode, tape: tapeSelected, eyelet: eyeletSelected });

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
      meters,
      avgPrice,
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

  // Delete Room
  const handleDeleteRoom = (roomId: string) => {
    if (!confirm('هل تريد حذف هذه الغرفة من المقاسات؟')) return;
    setRequests(prev => prev.map(r => r.id === selected.id ? {
      ...r,
      rooms: r.rooms.filter(rm => rm.id !== roomId)
    } : r));
  };

  const handleStageChange = (stage: InspectionStage) => {
    setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, stage } : r));
  };

  const handleShareWhatsApp = () => {
    if (!selected) return;
    const roomsText = selected.rooms.length > 0 
      ? selected.rooms.map(r => `\n• *${r.name}* (${r.type}): ${r.widthCm}سم عرض × ${r.heightCm}سم ارتفاع (${r.installationType} - ${r.ceilingType}) — ${r.meters}متر`).join('')
      : '\nلم تسجل مقاسات بعد';
    
    const text = encodeURIComponent(
      `*طلب معاينة ومقاسات ستائر - أحمد كشك*\nالعميل: ${selected.customerName}\nالتليفون: ${selected.phone}\nالعنوان: ${selected.address}\nالفني: ${selected.technician || 'لم يحدد'}\n\n*المقاسات والتفاصيل:*${roomsText}\n\n*الإجمالي التقديري: ${selected.rooms.reduce((sum, r) => sum + Math.round(r.meters * r.avgPrice), 0).toLocaleString()} ج.م*`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <Header title="المعاينات ورفع المقاسات" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">المعاينات ورفع المقاسات</h1>
              <p className="text-on-surface-variant text-sm mt-1">تسجيل طلبات المعاينة الميدانية ومقاسات وتفاصيل كل غرفة.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-sm shadow"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              طلب معاينة جديد
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex gap-2 flex-wrap">
            {['الكل', 'مُجدول', 'قيد الانتظار', 'مكتمل', 'ملغي'].map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono border transition-colors ${filterStatus === f ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Requests List */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {filtered.map(req => (
                <div
                  key={req.id}
                  onClick={() => setSelectedId(req.id)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all relative overflow-hidden ${req.id === selected.id ? 'bg-surface-container-lowest shadow-md border-primary' : 'bg-surface-container-lowest border-surface-container-high hover:border-outline-variant'}`}
                >
                  {req.id === selected.id && <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-mono text-on-surface-variant">{req.id}</span>
                      <h3 className="font-bold text-base text-primary">{req.customerName}</h3>
                      <p className="text-xs text-on-surface-variant mt-0.5" dir="ltr">{req.phone}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded font-mono ${statusColors[req.status]}`}>{req.status}</span>
                  </div>
                  {req.address && (
                    <p className="text-xs text-on-surface-variant mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span className="truncate">{req.address}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-container-high text-xs">
                    <span className={`font-mono font-bold ${stageColors[req.stage]}`}>
                      📍 {req.stage}
                    </span>
                    <span className="font-mono text-on-surface-variant">
                      {req.rooms.length} غرف مسجلة
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Selected Request Detail & Room Builder */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-sm">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between p-6 border-b border-surface-container-low gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-on-surface-variant">{selected.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${statusColors[selected.status]}`}>{selected.status}</span>
                  </div>
                  <h2 className="font-bold text-xl text-primary mt-1">{selected.customerName}</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5" dir="ltr">{selected.phone} {selected.address && `| ${selected.address}`}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={openEditModal} className="border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg flex items-center gap-1 text-xs hover:border-primary hover:text-primary transition-colors font-bold">
                    <span className="material-symbols-outlined text-[16px]">edit</span> تعديل الطلب
                  </button>
                  <button onClick={handleShareWhatsApp} className="border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg flex items-center gap-1 text-xs hover:border-primary hover:text-primary transition-colors font-bold">
                    <span className="material-symbols-outlined text-[16px]">share</span> واتساب
                  </button>
                  <button onClick={() => window.print()} className="border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg flex items-center gap-1 text-xs hover:border-primary hover:text-primary transition-colors font-bold">
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> طباعة PDF
                  </button>
                </div>
              </div>

              {/* Stage Progression Tracker */}
              <div className="px-6 py-4 border-b border-surface-container-low">
                <div className="text-xs font-mono text-on-surface-variant mb-2">مرحلة دورة العمل:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['معاينة', 'اختيار قماش', 'ورشة', 'تركيب'] as InspectionStage[]).map((stage, i) => {
                    const stages: InspectionStage[] = ['معاينة', 'اختيار قماش', 'ورشة', 'تركيب'];
                    const currentIdx = stages.indexOf(selected.stage);
                    const isDone = i <= currentIdx;
                    const isCurrent = stage === selected.stage;
                    return (
                      <React.Fragment key={stage}>
                        <button
                          onClick={() => handleStageChange(stage)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors ${
                            isCurrent ? 'bg-primary text-on-primary border-primary font-bold shadow-sm'
                            : isDone ? 'bg-surface-container text-on-surface border-surface-container-high'
                            : 'border-outline-variant text-on-surface-variant hover:border-primary'
                          }`}
                        >
                          {isDone && <span className="material-symbols-outlined text-[14px]">check</span>}
                          {stage}
                        </button>
                        {i < 3 && <span className="text-outline-variant text-xs">←</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-surface-container-low px-6">
                <div className="flex">
                  {[
                    { id: 'rooms', label: `الغرف والمقاسات (${selected.rooms.length})` },
                    { id: 'info', label: 'بيانات الفني والموعد' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'rooms' && (
                  <button
                    onClick={() => openRoomModal()}
                    className="bg-primary text-on-primary px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-inverse-surface transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    إضافة مقاسات غرفة
                  </button>
                )}
              </div>

              {/* Tab 1: Rooms & Measurements */}
              {activeTab === 'rooms' ? (
                <div className="p-6 flex flex-col gap-6">
                  {selected.rooms.length === 0 ? (
                    <div className="text-center py-12 bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant block mb-2">square_foot</span>
                      <h3 className="font-bold text-primary text-base">لا توجد غرف مسجلة بعد</h3>
                      <p className="text-xs text-on-surface-variant mt-1">اضغط على زر &quot;إضافة مقاسات غرفة&quot; لتسجيل العرض والارتفاع والتفاصيل.</p>
                      <button
                        onClick={() => openRoomModal()}
                        className="mt-4 bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        إضافة غرفة الآن
                      </button>
                    </div>
                  ) : (
                    selected.rooms.map((room) => (
                      <div key={room.id} className="border border-surface-container-highest rounded-xl p-5 bg-surface-container-lowest relative group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg text-primary">{room.name}</h3>
                              <span className="text-xs bg-surface-container-high px-2 py-0.5 rounded font-mono">{room.type}</span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1">
                              طريقة التركيب: <span className="font-bold text-primary">{room.installationType}</span> • نوع السقف: <span className="font-bold text-primary">{room.ceilingType}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-left ml-3">
                              <div className="font-mono font-bold text-lg text-primary">{Math.round(room.meters * room.avgPrice).toLocaleString()} ج</div>
                              <div className="text-xs text-on-surface-variant font-mono">{room.meters} متر × {room.avgPrice} ج/م</div>
                            </div>
                            <button
                              onClick={() => openRoomModal(room)}
                              title="تعديل الغرفة"
                              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              title="حذف الغرفة"
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Dimensions Bar */}
                        <div className="grid grid-cols-4 gap-3 bg-surface-container-low p-3.5 rounded-lg mb-4 text-center">
                          <div>
                            <div className="font-mono font-bold text-sm text-primary">{room.widthCm} سم</div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">العرض</div>
                          </div>
                          <div>
                            <div className="font-mono font-bold text-sm text-primary">{room.heightCm} سم</div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">الارتفاع</div>
                          </div>
                          <div>
                            <div className="font-mono font-bold text-sm text-primary">{room.sides === 2 ? 'جنبين' : 'جنب واحد'}</div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">عدد الجوانب</div>
                          </div>
                          <div>
                            <div className="font-mono font-bold text-sm text-primary">{room.meters} م</div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">الكمية المقدرة</div>
                          </div>
                        </div>

                        {/* Fabrics table */}
                        <div className="border border-surface-container-high rounded-lg overflow-hidden">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-surface-container-low font-mono text-on-surface-variant">
                              <tr>
                                <th className="p-2.5">الطبقة</th>
                                <th className="p-2.5">الكود المختار</th>
                                <th className="p-2.5 text-center">شريط كشكشة</th>
                                <th className="p-2.5 text-center">حلقات كبس</th>
                              </tr>
                            </thead>
                            <tbody>
                              {room.fabrics.map((f, i) => (
                                <tr key={i} className="border-t border-surface-container-low">
                                  <td className="p-2.5 font-bold text-primary">{f.layer}</td>
                                  <td className="p-2.5 font-mono">{f.code || '—'}</td>
                                  <td className="p-2.5 text-center">{f.tape ? '✓' : '—'}</td>
                                  <td className="p-2.5 text-center">{f.eyelet ? '✓' : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Total summary */}
                  {selected.rooms.length > 0 && (
                    <div className="flex justify-between items-center bg-primary text-on-primary p-5 rounded-xl shadow-sm">
                      <div>
                        <div className="font-bold text-base">إجمالي التكلفة التقديرية للمقاسات</div>
                        <div className="text-xs opacity-80 mt-0.5">{selected.rooms.length} غرف مسجلة بالكامل</div>
                      </div>
                      <span className="font-display font-bold text-2xl">
                        {selected.rooms.reduce((sum, r) => sum + Math.round(r.meters * r.avgPrice), 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Info & Tech details */
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'الفني المسؤول', value: selected.technician || 'لم يحدد بعد', icon: 'engineering' },
                    { label: 'موعد المعاينة', value: selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleString('ar-EG') : 'لم يحدد', icon: 'event' },
                    { label: 'حالة الطلب', value: selected.status, icon: 'info' },
                    { label: 'المرحلة الحالية', value: selected.stage, icon: 'flag' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
                      <span className="material-symbols-outlined text-[22px] text-on-surface-variant">{item.icon}</span>
                      <div>
                        <div className="text-xs text-on-surface-variant font-mono">{item.label}</div>
                        <div className="font-bold text-primary text-sm mt-0.5">{item.value}</div>
                      </div>
                    </div>
                  ))}
                  {selected.notes && (
                    <div className="col-span-2 p-4 bg-surface-container-low rounded-xl">
                      <div className="text-xs text-on-surface-variant font-mono mb-1">ملاحظات العميل / الطلب:</div>
                      <div className="text-sm text-primary">{selected.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal 1: New Request */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="font-display font-bold text-xl text-primary mb-4">إنشاء طلب معاينة جديد</h2>
            <form onSubmit={handleSaveNewRequest} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">اسم العميل *</label>
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="الاسم بالكامل"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">رقم التليفون *</label>
                  <input
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">العنوان بالتفصيل</label>
                <input
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="المنطقة، الشارع، رقم العمارة والشقة"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">موعد المعاينة</label>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الفني المسؤول</label>
                  <select
                    value={techName}
                    onChange={e => setTechName(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                    <option>علي إبراهيم</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">ملاحظات المعاينة</label>
                <textarea
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                  placeholder="عدد الغرف المتوقعة، تفضيلات العميل..."
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">
                  حفظ الطلب
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Request */}
      {showEditRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="font-display font-bold text-xl text-primary mb-4">تعديل بيانات المعاينة — {selected.id}</h2>
            <form onSubmit={handleSaveEditRequest} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">اسم العميل *</label>
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">رقم التليفون *</label>
                  <input
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">العنوان</label>
                <input
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الموعد</label>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الفني</label>
                  <select
                    value={techName}
                    onChange={e => setTechName(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                    <option>علي إبراهيم</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">حالة الطلب</label>
                  <select
                    value={reqStatus}
                    onChange={e => setReqStatus(e.target.value as any)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="مُجدول">مُجدول</option>
                    <option value="قيد الانتظار">قيد الانتظار</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="ملغي">ملغي</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">ملاحظات</label>
                <textarea
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary h-20 resize-none"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditRequestModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add / Edit Room & Take Measurements */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-6 w-full max-w-xl my-8">
            <h2 className="font-display font-bold text-xl text-primary mb-4">
              {editingRoomId ? 'تعديل مقاسات الغرفة' : 'رفع مقاسات غرفة جديدة'}
            </h2>
            <form onSubmit={handleSaveRoom} className="flex flex-col gap-4">
              {/* Room name & type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">اسم الغرفة *</label>
                  <input
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="مثال: الصالة، غرفة النوم..."
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">نوع المكان</label>
                  <select
                    value={roomType}
                    onChange={e => setRoomType(e.target.value as any)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="شباك">شباك</option>
                    <option value="بلكونة">بلكونة</option>
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3 bg-surface-container-low p-3.5 rounded-xl">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">العرض (سم) *</label>
                  <input
                    type="number"
                    value={widthCm}
                    onChange={e => setWidthCm(Number(e.target.value))}
                    className="border border-outline-variant rounded p-2 text-sm font-mono font-bold focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الارتفاع (سم) *</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(Number(e.target.value))}
                    className="border border-outline-variant rounded p-2 text-sm font-mono font-bold focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">عدد الجوانب</label>
                  <select
                    value={sides}
                    onChange={e => setSides(Number(e.target.value))}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value={2}>جنبين (2)</option>
                    <option value={1}>جنب واحد (1)</option>
                  </select>
                </div>
              </div>

              {/* Installation & Ceiling */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">طريقة التركيب</label>
                  <select
                    value={installType}
                    onChange={e => setInstallType(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="مجرى سقف">مجرى سقف (تراك ألومنيوم)</option>
                    <option value="مجرى حائط">مجرى حائط</option>
                    <option value="مواسير">مواسير (استيل / خشب)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">نوع السقف</label>
                  <select
                    value={ceilingType}
                    onChange={e => setCeilingType(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="جيبسون بورد">جيبسون بورد / بيت نور</option>
                    <option value="عادي">سقف عادي (خرسانة)</option>
                    <option value="خشب">سقف معلق خشب</option>
                  </select>
                </div>
              </div>

              {/* Fabric layers selection */}
              <div className="space-y-2 border border-surface-container-high p-3.5 rounded-xl">
                <div className="text-xs font-bold text-primary">طبقات الأقمشة المطلوبة:</div>
                
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={sheerSelected} onChange={e => setSheerSelected(e.target.checked)} className="rounded" />
                    <span>قماش خفيف (تول)</span>
                  </label>
                  {sheerSelected && (
                    <input value={sheerCode} onChange={e => setSheerCode(e.target.value)} placeholder="كود القماش" className="border border-outline-variant rounded px-2 py-1 text-xs w-28 font-mono" />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={heavySelected} onChange={e => setHeavySelected(e.target.checked)} className="rounded" />
                    <span>قماش ثقيل (قطيفة / كتان)</span>
                  </label>
                  {heavySelected && (
                    <input value={heavyCode} onChange={e => setHeavyCode(e.target.value)} placeholder="كود القماش" className="border border-outline-variant rounded px-2 py-1 text-xs w-28 font-mono" />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={blackoutSelected} onChange={e => setBlackoutSelected(e.target.checked)} className="rounded" />
                    <span>بلاك آوت عازل</span>
                  </label>
                  {blackoutSelected && (
                    <input value={blackoutCode} onChange={e => setBlackoutCode(e.target.value)} placeholder="كود القماش" className="border border-outline-variant rounded px-2 py-1 text-xs w-28 font-mono" />
                  )}
                </div>
              </div>

              {/* Accessories & Tapes */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 bg-surface-container-low p-2.5 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={tapeSelected} onChange={e => setTapeSelected(e.target.checked)} className="rounded" />
                  <span>شريط كشكشة (3 فتلة)</span>
                </label>
                <label className="flex items-center gap-2 bg-surface-container-low p-2.5 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={eyeletSelected} onChange={e => setEyeletSelected(e.target.checked)} className="rounded" />
                  <span>حلقات كبس</span>
                </label>
              </div>

              {/* Price estimate */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">متوسط سعر المتر التقديري (ج.م)</label>
                <input
                  type="number"
                  value={avgPrice}
                  onChange={e => setAvgPrice(Number(e.target.value))}
                  className="border border-outline-variant rounded p-2 text-sm font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">
                  {editingRoomId ? 'حفظ تعديلات الغرفة' : 'إضافة الغرفة للمقاسات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
