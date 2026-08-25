'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

type InspectionStatus = 'مُجدول' | 'قيد الانتظار' | 'مكتمل' | 'ملغي';
type InspectionStage = 'معاينة' | 'اختيار قماش' | 'ورشة' | 'تركيب';

interface Room {
  id: string;
  name: string;
  type: 'شباك' | 'بلكونة';
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  ceilingType: string;
  fabrics: { layer: string; code: string; tape: boolean; eyelet: boolean }[];
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

const demoRequests: InspectionRequest[] = [
  {
    id: '1',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    scheduledAt: '2026-08-26T16:00',
    technician: 'أحمد حسن',
    status: 'مُجدول',
    stage: 'معاينة',
    notes: 'شقة 3 غرف + صالة',
    rooms: [
      { id: 'r1', name: 'الصالة الرئيسية', type: 'بلكونة', widthCm: 350, heightCm: 280, sides: 2, installationType: 'مجرى سقف', ceilingType: 'جيبسون بورد', fabrics: [{ layer: 'خفيف (تول)', code: 'T-402', tape: true, eyelet: false }, { layer: 'ثقيل', code: 'V-990', tape: false, eyelet: true }], meters: 15.75, avgPrice: 450 },
      { id: 'r2', name: 'غرفة النوم الرئيسية', type: 'شباك', widthCm: 200, heightCm: 260, sides: 2, installationType: 'مواسير', ceilingType: 'عادي', fabrics: [{ layer: 'بلاك آوت', code: 'BL-220', tape: true, eyelet: false }], meters: 9, avgPrice: 380 }
    ]
  },
  {
    id: '2',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    scheduledAt: '',
    technician: '',
    status: 'قيد الانتظار',
    stage: 'معاينة',
    notes: '',
    rooms: []
  },
  {
    id: '3',
    customerName: 'شركة المعمار',
    phone: '01155556666',
    address: 'المهندسين، شارع البطل أحمد عبد العزيز',
    scheduledAt: '2026-08-24T11:00',
    technician: 'محمد علي',
    status: 'مكتمل',
    stage: 'اختيار قماش',
    notes: 'مكتب تجاري — 6 غرف',
    rooms: []
  },
  {
    id: '4',
    customerName: 'أسرة الدكتور سامي',
    phone: '01022334455',
    address: 'مدينة نصر، ميدان الحجاز',
    scheduledAt: '2026-08-28T14:00',
    technician: 'أحمد حسن',
    status: 'مُجدول',
    stage: 'معاينة',
    notes: 'شقة كبيرة 4 غرف',
    rooms: []
  }
];

export default function InspectionsPage() {
  const [requests, setRequests] = useState<InspectionRequest[]>(demoRequests);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [activeTab, setActiveTab] = useState<'rooms' | 'info'>('rooms');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('الكل');

  // New request form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newNotes, setNewNotes] = useState('');

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

  const handleAddRequest = () => {
    if (!newName || !newPhone) return;
    const newReq: InspectionRequest = {
      id: Date.now().toString(),
      customerName: newName,
      phone: newPhone,
      address: newAddress,
      scheduledAt: newSchedule,
      technician: newTech,
      status: 'قيد الانتظار',
      stage: 'معاينة',
      notes: newNotes,
      rooms: []
    };
    setRequests(prev => [newReq, ...prev]);
    setSelectedId(newReq.id);
    setShowNewRequest(false);
    setNewName(''); setNewPhone(''); setNewAddress(''); setNewSchedule(''); setNewTech(''); setNewNotes('');
  };

  const handleStageChange = (stage: InspectionStage) => {
    setRequests(prev => prev.map(r => r.id === selectedId ? { ...r, stage } : r));
  };

  const handleShareWhatsApp = () => {
    const roomsText = selected.rooms.map(r =>
      `\n• ${r.name} (${r.type}): ${r.widthCm}cm × ${r.heightCm}cm — ${r.meters} متر — ${Math.round(r.meters * r.avgPrice)} ج`
    ).join('');
    const text = encodeURIComponent(
      `*طلب معاينة - أحمد كشك*\nالعميل: ${selected.customerName}\nالتليفون: ${selected.phone}\nالعنوان: ${selected.address}\nالفني: ${selected.technician || 'لم يحدد'}\n\nالغرف والمقاسات:${roomsText}\n\n*الإجمالي التقديري: ${selected.rooms.reduce((sum, r) => sum + Math.round(r.meters * r.avgPrice), 0).toLocaleString()} ج.م*`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <Header title="المعاينات والمقاسات" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">المعاينات والمقاسات</h1>
              <p className="text-on-surface-variant text-sm mt-1">تسجيل طلبات المعاينة الميدانية ومقاسات الستائر لكل عميل.</p>
            </div>
            <button
              onClick={() => setShowNewRequest(true)}
              className="bg-primary text-on-primary px-5 py-2.5 rounded hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-sm shadow"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              طلب معاينة جديد
            </button>
          </div>

          {/* New Request Modal */}
          {showNewRequest && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-8 w-full max-w-lg">
                <h2 className="font-display font-bold text-xl text-primary mb-6">طلب معاينة جديد</h2>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono text-on-surface-variant">اسم العميل *</label>
                      <input value={newName} onChange={e => setNewName(e.target.value)} className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary" placeholder="الاسم الكامل" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono text-on-surface-variant">رقم التليفون *</label>
                      <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary" placeholder="01xxxxxxxxx" dir="ltr" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-on-surface-variant">العنوان</label>
                    <input value={newAddress} onChange={e => setNewAddress(e.target.value)} className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary" placeholder="الحي، الشارع، رقم الشقة" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono text-on-surface-variant">موعد المعاينة</label>
                      <input type="datetime-local" value={newSchedule} onChange={e => setNewSchedule(e.target.value)} className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono text-on-surface-variant">الفني المسؤول</label>
                      <select value={newTech} onChange={e => setNewTech(e.target.value)} className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary">
                        <option value="">اختر الفني</option>
                        <option>أحمد حسن</option>
                        <option>محمد علي</option>
                        <option>علي إبراهيم</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-on-surface-variant">ملاحظات</label>
                    <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary h-20 resize-none" placeholder="عدد الغرف، ملاحظات خاصة..." />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleAddRequest} className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm hover:bg-inverse-surface transition-colors">إضافة الطلب</button>
                  <button onClick={() => setShowNewRequest(false)} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm hover:bg-surface-container transition-colors">إلغاء</button>
                </div>
              </div>
            </div>
          )}

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
            {/* List */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {filtered.map(req => (
                <div
                  key={req.id}
                  onClick={() => setSelectedId(req.id)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all relative overflow-hidden ${req.id === selectedId ? 'bg-surface shadow-md border-primary' : 'bg-surface-container-lowest border-surface-container-high hover:border-outline-variant'}`}
                >
                  {req.id === selectedId && <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-base text-primary">{req.customerName}</h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">{req.phone}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${statusColors[req.status]}`}>{req.status}</span>
                  </div>
                  {req.address && (
                    <p className="text-xs text-on-surface-variant mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span className="truncate">{req.address}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${stageColors[req.stage]}`}>
                      📍 {req.stage}
                    </span>
                    {req.scheduledAt && (
                      <span className="text-xs text-on-surface-variant">
                        {new Date(req.scheduledAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-sm">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between p-6 border-b border-surface-container-low gap-4">
                <div>
                  <h2 className="font-bold text-xl text-primary">{selected.customerName}</h2>
                  <p className="text-sm text-on-surface-variant">{selected.phone} {selected.address && `| ${selected.address}`}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleShareWhatsApp} className="border border-outline-variant text-on-surface-variant px-3 py-2 rounded flex items-center gap-1 text-xs hover:border-primary hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[16px]">share</span> واتساب
                  </button>
                  <button className="border border-outline-variant text-on-surface-variant px-3 py-2 rounded flex items-center gap-1 text-xs hover:border-primary hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> PDF
                  </button>
                  <button className="bg-primary text-on-primary px-4 py-2 rounded text-xs font-bold flex items-center gap-1 hover:bg-inverse-surface transition-colors">
                    <span className="material-symbols-outlined text-[16px]">save</span> حفظ
                  </button>
                </div>
              </div>

              {/* Stage Tracker */}
              <div className="px-6 py-4 border-b border-surface-container-low">
                <div className="flex items-center gap-2">
                  {(['معاينة', 'اختيار قماش', 'ورشة', 'تركيب'] as InspectionStage[]).map((stage, i) => {
                    const stages: InspectionStage[] = ['معاينة', 'اختيار قماش', 'ورشة', 'تركيب'];
                    const currentIdx = stages.indexOf(selected.stage);
                    const isDone = i <= currentIdx;
                    const isCurrent = stage === selected.stage;
                    return (
                      <React.Fragment key={stage}>
                        <button
                          onClick={() => handleStageChange(stage)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors ${
                            isCurrent ? 'bg-primary text-on-primary border-primary'
                            : isDone ? 'bg-surface-container text-on-surface border-surface-container-high'
                            : 'border-outline-variant text-on-surface-variant hover:border-primary'
                          }`}
                        >
                          {isDone && !isCurrent && <span className="material-symbols-outlined text-[12px]">check</span>}
                          {stage}
                        </button>
                        {i < 3 && <span className="text-outline-variant text-xs">→</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-surface-container-low">
                {[{ id: 'rooms', label: 'الغرف والمقاسات' }, { id: 'info', label: 'بيانات المعاينة' }].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'rooms' ? (
                <div className="p-6 flex flex-col gap-6">
                  {selected.rooms.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[48px] block mb-3">home_search</span>
                      <p>لا توجد غرف مسجلة بعد</p>
                      <p className="text-sm mt-1">أضف غرفة جديدة لتسجيل المقاسات</p>
                    </div>
                  ) : (
                    selected.rooms.map((room) => (
                      <div key={room.id} className="border border-surface-container-highest rounded-xl p-5">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-bold text-base text-primary">{room.name}</h3>
                            <p className="text-xs text-on-surface-variant">{room.type} • {room.installationType} • {room.ceilingType}</p>
                          </div>
                          <div className="text-left">
                            <div className="font-mono font-bold text-lg text-primary">{Math.round(room.meters * room.avgPrice).toLocaleString()} ج</div>
                            <div className="text-xs text-on-surface-variant">{room.meters} متر × {room.avgPrice} ج</div>
                          </div>
                        </div>

                        {/* Dimensions */}
                        <div className="grid grid-cols-4 gap-3 bg-surface-container-low p-4 rounded-lg mb-4">
                          {[
                            { label: 'العرض', value: `${room.widthCm} cm` },
                            { label: 'الارتفاع', value: `${room.heightCm} cm` },
                            { label: 'الجوانب', value: room.sides === 2 ? 'جنبين' : 'جنب واحد' },
                            { label: 'التركيب', value: room.installationType },
                          ].map((d, i) => (
                            <div key={i} className="text-center">
                              <div className="font-mono font-bold text-sm text-primary">{d.value}</div>
                              <div className="text-xs text-on-surface-variant mt-0.5">{d.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Fabrics */}
                        <table className="w-full text-right text-sm">
                          <thead>
                            <tr className="text-xs font-mono text-on-surface-variant bg-surface-container-low">
                              <th className="p-2 rounded-r">الطبقة</th>
                              <th className="p-2">الكود</th>
                              <th className="p-2 text-center">شريط كشكشة</th>
                              <th className="p-2 text-center rounded-l">حلقات كبس</th>
                            </tr>
                          </thead>
                          <tbody>
                            {room.fabrics.map((f, i) => (
                              <tr key={i} className="border-b border-surface-container-low">
                                <td className="p-2 font-bold text-primary">{f.layer}</td>
                                <td className="p-2 font-mono text-sm">{f.code || '—'}</td>
                                <td className="p-2 text-center">{f.tape ? '✓' : '—'}</td>
                                <td className="p-2 text-center">{f.eyelet ? '✓' : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}

                  {/* Total */}
                  {selected.rooms.length > 0 && (
                    <div className="flex justify-between items-center bg-primary text-on-primary p-5 rounded-xl">
                      <span className="font-bold">إجمالي التكلفة التقديرية</span>
                      <span className="font-display font-bold text-2xl">
                        {selected.rooms.reduce((sum, r) => sum + Math.round(r.meters * r.avgPrice), 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'الفني المسؤول', value: selected.technician || 'لم يحدد', icon: 'engineering' },
                    { label: 'موعد المعاينة', value: selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleString('ar-EG') : 'لم يحدد', icon: 'event' },
                    { label: 'المرحلة الحالية', value: selected.stage, icon: 'flag' },
                    { label: 'الحالة', value: selected.status, icon: 'info' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
                      <span className="material-symbols-outlined text-[22px] text-on-surface-variant">{item.icon}</span>
                      <div>
                        <div className="text-xs text-on-surface-variant font-mono">{item.label}</div>
                        <div className="font-bold text-primary mt-0.5">{item.value}</div>
                      </div>
                    </div>
                  ))}
                  {selected.notes && (
                    <div className="col-span-2 p-4 bg-surface-container-low rounded-xl">
                      <div className="text-xs text-on-surface-variant font-mono mb-1">ملاحظات</div>
                      <div className="text-sm text-primary">{selected.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
