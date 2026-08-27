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
  status: 'تمت الخياطة' | 'جاهز للتسليم' | 'في التركيبات' | 'في التسليمات';
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
    status: 'تمت الخياطة',
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
    status: 'جاهز للتسليم',
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
    status: 'جاهز للتسليم',
    notes: 'تم الكي والتغليف في أكياس حماية',
  }
];

export default function PipelineTailoringPage() {
  const [tasks, setTasks] = useState<TailoringTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  const isSent = (status: TailoringTask['status']) => status === 'جاهز للتسليم' || status === 'في التركيبات' || status === 'في التسليمات';

  const tabFiltered = tasks.filter(t => activeTab === 'OPEN' ? !isSent(t.status) : isSent(t.status));
  const filtered = tabFiltered.filter(t =>
    t.customerName.includes(searchQuery) || t.fabricName.includes(searchQuery) || t.id.includes(searchQuery)
  );

  const updateTaskStatus = (id: string, status: TailoringTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const openCount = tasks.filter(t => !isSent(t.status)).length;
  const sentCount = tasks.filter(t => isSent(t.status)).length;

  return (
    <PageShell title="الورشة">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              الورشة والتفصيل
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">الورشة</h1>
          </div>
        </div>

        {/* 2-Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'OPEN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
            <span>القطع قيد التفصيل والخياطة</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'SENT'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>سجل الستائر الجاهزة للنقل</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {sentCount}
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
              {activeTab === 'OPEN' ? 'لا توجد قطع قيد الخياطة' : 'السجل فارغ'}
            </h3>
          </div>
        ) : (
          /* Cards View */
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
                      task.status === 'تمت الخياطة' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-emerald-100 text-emerald-900 border-emerald-200'
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

                  {/* 🎯 بندين فقط: تمت الخياطة | جاهز للتسليم */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <button
                      onClick={() => updateTaskStatus(task.id, 'تمت الخياطة')}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        task.status === 'تمت الخياطة' ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      تمت الخياطة
                    </button>
                    <button
                      onClick={() => updateTaskStatus(task.id, 'جاهز للتسليم')}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        task.status === 'جاهز للتسليم' ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      جاهز للتسليم ✓
                    </button>
                  </div>

                  {/* خيارات النقل */}
                  {task.status === 'جاهز للتسليم' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => updateTaskStatus(task.id, 'في التركيبات')}
                        className="bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                      >
                        نقل إلى التركيبات ←
                      </button>
                      <button
                        onClick={() => updateTaskStatus(task.id, 'في التسليمات')}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                      >
                        نقل إلى التسليمات ←
                      </button>
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
