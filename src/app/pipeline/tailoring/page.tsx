'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface TailoringTask {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  roomName: string;
  fabricName: string;
  tapeStyle: string;
  tailorName: string;
  status: 'جاري الخياطة' | 'تمت الخياطة' | 'جاهز للتسليم' | 'في التركيبات' | 'في التسليمات';
  notes: string;
}

const initialTasks: TailoringTask[] = [
  {
    id: 'TLR-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'الصالة (بلكونة) - تول',
    fabricName: 'تول خفيف مطرز (8.75متر)',
    tapeStyle: 'شريط كشكشة 3 فتلة',
    tailorName: 'عم مصطفى',
    status: 'جاري الخياطة',
    notes: 'ثني الذيل 12 سم وثني الأجناب 3 سم',
  },
  {
    id: 'TLR-102',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    roomName: 'غرفة النوم - بلاك آوت',
    fabricName: 'بلاك آوت عازل (2.60متر)',
    tapeStyle: 'حلقات كبس مذهبة',
    tailorName: 'أحمد شحاتة',
    status: 'تمت الخياطة',
    notes: 'استخدام فازلين تقوية تحت الحلقات',
  },
  {
    id: 'TLR-103',
    orderId: 'ORD-002',
    customerName: 'شركة المعمار',
    phone: '01155556666',
    roomName: 'قاعة الاجتماعات',
    fabricName: 'بلاك آوت عازل (16متر)',
    tapeStyle: 'شريط كشكشة 3 فتلة',
    tailorName: 'عم مصطفى',
    status: 'في التركيبات',
    notes: 'تم الكي والتغليف في أكياس حماية',
  },
  {
    id: 'TLR-104',
    orderId: 'ORD-004',
    customerName: 'د. سارة أحمد',
    phone: '01298765432',
    roomName: 'غرفة المعيشة',
    fabricName: 'كتان هازل بني (12متر)',
    tapeStyle: 'شريط ويفي حديث',
    tailorName: 'حسن إبراهيم',
    status: 'جاري الخياطة',
    notes: 'تأكيد ضبط كشكشة الشريط الويفي',
  }
];

export default function PipelineTailoringPage() {
  const [tasks, setTasks] = useState<TailoringTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'WORKSHOP' | 'SEWN' | 'HISTORY'>('WORKSHOP');
  const [searchQuery, setSearchQuery] = useState('');

  const tabFiltered = tasks.filter(t => {
    if (activeTab === 'WORKSHOP') {
      return t.status === 'جاري الخياطة';
    } else if (activeTab === 'SEWN') {
      return t.status === 'تمت الخياطة' || t.status === 'جاهز للتسليم';
    } else {
      return t.status === 'في التركيبات' || t.status === 'في التسليمات';
    }
  });

  const filtered = tabFiltered.filter(t =>
    t.customerName.includes(searchQuery) || t.fabricName.includes(searchQuery) || t.id.includes(searchQuery)
  );

  const updateTaskStatus = (id: string, status: TailoringTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const workshopCount = tasks.filter(t => t.status === 'جاري الخياطة').length;
  const sewnCount = tasks.filter(t => t.status === 'تمت الخياطة' || t.status === 'جاهز للتسليم').length;
  const historyCount = tasks.filter(t => t.status === 'في التركيبات' || t.status === 'في التسليمات').length;

  return (
    <PageShell title="الورشة">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              المرحلة 5
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">الورشة والتفصيل</h1>
          </div>
        </div>

        {/* 3-Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('WORKSHOP')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'WORKSHOP'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
            <span>الورشة</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'WORKSHOP' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {workshopCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SEWN')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SEWN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>تم الخياطة</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SEWN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {sewnCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>السجل</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'HISTORY' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {historyCount}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الكود، الترزي..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'WORKSHOP' ? 'لا توجد قطع قيد التفصيل بالورشة' : activeTab === 'SEWN' ? 'لا توجد قطع منتهية الخياطة وتنتظر التسليم' : 'السجل فارغ'}
            </h3>
          </div>
        ) : activeTab === 'HISTORY' ? (
          /* TAB 3: Table Format (جدول السجل - المحولات) */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">كود الورشة</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">الغرفة والمكان</th>
                    <th className="p-3.5">الخامة والتفصيل</th>
                    <th className="p-3.5">مسؤول الورشة</th>
                    <th className="p-3.5 text-center">وجهة النقل</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(task => (
                    <tr key={task.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-amber-800">{task.id} • {task.orderId}</td>
                      <td className="p-3.5 font-bold text-slate-900">{task.customerName}</td>
                      <td className="p-3.5 text-slate-700">{task.roomName}</td>
                      <td className="p-3.5 text-slate-800 font-medium">{task.fabricName} — {task.tapeStyle}</td>
                      <td className="p-3.5 text-slate-700">{task.tailorName}</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                          task.status === 'في التركيبات' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <a
                          href={`https://wa.me/2${task.phone}?text=${encodeURIComponent(`مرحباً ${task.customerName}، تم إتمام خياطة الستائر ونقلها إلى (${task.status}) بمؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200"
                        >
                          💬 واتساب
                        </a>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          مكتمل ومحول
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1 & TAB 2: Active Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(task => (
              <div key={task.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-amber-800">{task.id} • {task.orderId}</span>
                      <h3 className="font-bold text-base text-slate-900">{task.customerName}</h3>
                      <p className="text-xs text-slate-600 font-bold">{task.roomName}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      task.status === 'جاري الخياطة' ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : task.status === 'تمت الخياطة' ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl my-2 text-xs space-y-1 font-medium">
                    <div><strong>الخامة:</strong> {task.fabricName}</div>
                    <div><strong>نوع الشريط / التشطيب:</strong> {task.tapeStyle}</div>
                    <div><strong>مسؤول الورشة:</strong> {task.tailorName}</div>
                    {task.notes && <div className="text-amber-950 bg-amber-50 p-2 rounded border border-amber-200 mt-2"><strong>تعليمات الورشة:</strong> {task.notes}</div>}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/2${task.phone}?text=${encodeURIComponent(`مرحباً ${task.customerName}، نود إعلامك بأن أوردر الستائر الخاص بك في حالة (${task.status}) في الورشة لدى مؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    💬 إرسال تحديث للعميل (واتساب)
                  </a>

                  {/* TAB 1: زر تمت الخياطة فقط */}
                  {activeTab === 'WORKSHOP' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'تمت الخياطة')}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                    >
                      تمت الخياطة ←
                    </button>
                  )}

                  {/* TAB 2: زر جاهز للتسليم وأزرار النقل */}
                  {activeTab === 'SEWN' && (
                    <div className="space-y-2">
                      {task.status !== 'جاهز للتسليم' ? (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'جاهز للتسليم')}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                        >
                          جاهز للتسليم ✓
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => updateTaskStatus(task.id, 'في التسليمات')}
                            className="bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                          >
                            نقل إلى التسليمات ←
                          </button>
                          <button
                            onClick={() => updateTaskStatus(task.id, 'في التركيبات')}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                          >
                            نقل إلى التركيبات ←
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
