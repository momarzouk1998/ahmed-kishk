'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface WorkshopTask {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  roomName: string;
  dimensions: string;
  fabrics: string[];
  trackType: string;
  tapeType: string;
  status: 'في انتظار القص' | 'قيد التفصيل والخياطة' | 'تجهيز الإكسسوارات' | 'جاهز للتركيب';
  dueDate: string;
  tailorName: string;
  notes: string;
}

const initialTasks: WorkshopTask[] = [
  {
    id: 'WSH-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'الصالة الرئيسية (بلكونة)',
    dimensions: 'عرض 350سم × ارتفاع 280سم (جنبين)',
    fabrics: ['تول خفيف (T-402) - 8.5متر', 'قطيفة تركي (V-990) - 7.0متر'],
    trackType: 'مجرى سقف (تراك ألومنيوم 3.5متر)',
    tapeType: 'شريط كشكشة 3 فتلة + حلقات كبس',
    status: 'قيد التفصيل والخياطة',
    dueDate: '2026-09-02',
    tailorName: 'عم مصطفى',
    notes: 'العميل طالب كشكشة 2.5x عريضة مع ثني الذيل 10سم',
  },
  {
    id: 'WSH-102',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'غرفة النوم الرئيسية',
    dimensions: 'عرض 200سم × ارتفاع 260سم (جنبين)',
    fabrics: ['بلاك آوت عازل ضوء (BL-220) - 4.5متر'],
    trackType: 'مواسير استيل مذهبة 2متر',
    tapeType: 'حلقات كبس مذهبة',
    status: 'في انتظار القص',
    dueDate: '2026-09-03',
    tailorName: 'عم مصطفى',
    notes: 'تثبيت حلقات الكبس كل 12 سم',
  },
  {
    id: 'WSH-103',
    orderId: 'ORD-002',
    customerName: 'شركة المعمار للمقاولات',
    phone: '01155556666',
    roomName: 'قاعة اجتماعات مكاتب',
    dimensions: 'عرض 500سم × ارتفاع 300سم (3 شبابيك)',
    fabrics: ['بلاك آوت رمادي عازل - 16.0متر'],
    trackType: 'تراك سقف كهربي / يدوي',
    tapeType: 'شريط كشكشة مستقيمة',
    status: 'تجهيز الإكسسوارات',
    dueDate: '2026-09-08',
    tailorName: 'أحمد شحاتة',
    notes: 'قص 3 شبابيك متساوية كل شباك 165سم',
  },
  {
    id: 'WSH-104',
    orderId: 'ORD-003',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    roomName: 'صالون الاستقبال',
    dimensions: 'عرض 280سم × ارتفاع 270سم',
    fabrics: ['حرير طبيعي + شيفون مطرز - 11.5متر'],
    trackType: 'مواسير نحاسي مزدوجة',
    tapeType: 'شريط كشكشة فرنسي 3 فتلة',
    status: 'جاهز للتركيب',
    dueDate: '2026-08-27',
    tailorName: 'عم مصطفى',
    notes: 'تم التفصيل والكي والتغليف في أكياس المحل',
  },
];

const statusStyles: Record<string, string> = {
  'في انتظار القص': 'bg-slate-100 text-slate-800 border-slate-300',
  'قيد التفصيل والخياطة': 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
  'تجهيز الإكسسوارات': 'bg-blue-100 text-blue-900 border-blue-300',
  'جاهز للتركيب': 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
};

export default function WorkshopPage() {
  const [tasks, setTasks] = useState<WorkshopTask[]>(initialTasks);
  const [filter, setFilter] = useState('الكل');
  const [selectedTask, setSelectedTask] = useState<WorkshopTask | null>(initialTasks[0]);

  const stagesList = ['الكل', 'في انتظار القص', 'قيد التفصيل والخياطة', 'تجهيز الإكسسوارات', 'جاهز للتركيب'];

  const filtered = filter === 'الكل' ? tasks : tasks.filter(t => t.status === filter);

  const updateStatus = (id: string, newStatus: WorkshopTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <Header title="الورشة المركزية وأوامر التفصيل" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
                الورشة المركزية للتفصيل والتجهيز
              </span>
              <h1 className="font-display font-black text-2xl text-slate-900">أوامر التصنيع وتفصيل الستائر</h1>
              <p className="text-slate-500 text-sm mt-0.5">متابعة قص وخياطة كل ستارة، تركيب الأشرطة، وتجهيز الإكسسوارات للفنيين.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl hover:border-slate-400 font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                طباعة أوامر التشغيل
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي قطع التشغيل', value: tasks.length, icon: 'inventory_2', color: 'text-slate-900' },
              { label: 'قيد القص والخياطة', value: tasks.filter(t => t.status.includes('التفصيل') || t.status.includes('القص')).length, icon: 'content_cut', color: 'text-amber-600' },
              { label: 'تجهيز الإكسسوارات', value: tasks.filter(t => t.status === 'تجهيز الإكسسوارات').length, icon: 'handyman', color: 'text-blue-600' },
              { label: 'جاهز للتركيب والتسليم', value: tasks.filter(t => t.status === 'جاهز للتركيب').length, icon: 'check_circle', color: 'text-emerald-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">{s.label}</span>
                  <span className={`material-symbols-outlined text-[22px] ${s.color}`}>{s.icon}</span>
                </div>
                <div className={`font-display font-black text-2xl ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {stagesList.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  filter === f ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Master Detail Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Task List */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {filtered.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-5 rounded-2xl border bg-white cursor-pointer transition-all ${
                    selectedTask?.id === task.id ? 'border-brand-gold ring-2 ring-brand-gold/30 shadow-md' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">{task.id}</span>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600">{task.orderId}</span>
                      </div>
                      <h3 className="font-bold text-base text-slate-900 mt-1">{task.customerName} — {task.roomName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{task.dimensions}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border font-bold ${statusStyles[task.status]}`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 mb-3">
                    <div className="text-slate-700"><strong>الأقمشة:</strong> {task.fabrics.join(' • ')}</div>
                    <div className="text-slate-700"><strong>المجرى/المواسير:</strong> {task.trackType}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
                    <span>المسؤول: <strong className="text-slate-800">{task.tailorName}</strong></span>
                    <span>تاريخ التسليم: <strong className="font-mono text-slate-800">{task.dueDate}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Task Operations */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-soft sticky top-20">
              {selectedTask ? (
                <div className="flex flex-col gap-5">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-brand-gold-dark">{selectedTask.id} • {selectedTask.orderId}</span>
                      <span className={`text-xs px-3 py-1 rounded-full border font-bold ${statusStyles[selectedTask.status]}`}>
                        {selectedTask.status}
                      </span>
                    </div>
                    <h2 className="font-bold text-xl text-slate-900 mt-2">{selectedTask.customerName}</h2>
                    <p className="text-xs text-slate-500 font-mono" dir="ltr">{selectedTask.phone}</p>
                  </div>

                  {/* Curtain Specs */}
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 font-bold block mb-1">الغرفة والمقاسات:</span>
                      <div className="font-bold text-slate-900 text-sm">{selectedTask.roomName}</div>
                      <div className="text-slate-600 font-mono mt-0.5">{selectedTask.dimensions}</div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 font-bold block mb-1">الأقمشة وقصات الورشة:</span>
                      <ul className="space-y-1 list-disc list-inside font-bold text-slate-900">
                        {selectedTask.fabrics.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 font-bold block mb-1">نوع المجرى:</span>
                        <span className="font-bold text-slate-900">{selectedTask.trackType}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 font-bold block mb-1">نوع الشريط:</span>
                        <span className="font-bold text-slate-900">{selectedTask.tapeType}</span>
                      </div>
                    </div>

                    {selectedTask.notes && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
                        <span className="font-bold block mb-0.5">تعليمات وملاحظات التفصيل:</span>
                        <p>{selectedTask.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Status update controller */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block mb-2">تحديث حالة القطعة في الورشة:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['في انتظار القص', 'قيد التفصيل والخياطة', 'تجهيز الإكسسوارات', 'جاهز للتركيب'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => updateStatus(selectedTask.id, st)}
                          className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                            selectedTask.status === st
                              ? 'bg-brand-gold text-slate-950 border-brand-gold shadow-gold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">اختر قطعة لعرض بطاقة التشغيل الخاصة بها.</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
