'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface TailoringTask {
  id: string;
  orderId: string;
  customerName: string;
  roomName: string;
  fabricName: string;
  tapeStyle: string;
  ringStyle: string;
  tailorName: string;
  status: 'بانتظار التفصيل' | 'قيد خياطة الشريط' | 'تركيب الحلقات والكي' | 'تم التفصيل وجاهز';
  notes: string;
}

const initialTasks: TailoringTask[] = [
  {
    id: 'TLR-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    roomName: 'الصالة (بلكونة) - تول',
    fabricName: 'تول خفيف (8.75متر)',
    tapeStyle: 'شريط كشكشة 3 فتلة',
    ringStyle: 'بدون حلقات',
    tailorName: 'عم مصطفى',
    status: 'قيد خياطة الشريط',
    notes: 'ثني الذيل 12 سم وثني الأجناب 3 سم',
  },
  {
    id: 'TLR-102',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    roomName: 'غرفة النوم - بلاك آوت',
    fabricName: 'بلاك آوت عازل (2.60متر)',
    tapeStyle: 'بدون شريط',
    ringStyle: 'حلقات كبس مذهبة',
    tailorName: 'أحمد شحاتة',
    status: 'تم التفصيل وجاهز',
    notes: 'استخدام فازلين تقوية تحت الحلقات',
  }
];

export default function PipelineTailoringPage() {
  const [tasks, setTasks] = useState<TailoringTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  const isSent = (status: TailoringTask['status']) => status === 'تم التفصيل وجاهز';

  const tabFiltered = tasks.filter(t => activeTab === 'OPEN' ? !isSent(t.status) : isSent(t.status));
  const filtered = tabFiltered.filter(t =>
    t.customerName.includes(searchQuery) || t.fabricName.includes(searchQuery) || t.id.includes(searchQuery)
  );

  const updateTask = (id: string, status: TailoringTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const openCount = tasks.filter(t => !isSent(t.status)).length;
  const sentCount = tasks.filter(t => isSent(t.status)).length;

  return (
    <PageShell title="المرحلة 4: الخياطة والتفصيل">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              المرحلة 4
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">الخياطة والتفصيل</h1>
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
            <span>القطع قيد التفصيل</span>
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
            <span>سجل الستائر الجاهزة</span>
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
              {activeTab === 'OPEN' ? 'لا توجد قطع قيد التفصيل' : 'السجل فارغ'}
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(task => (
              <div key={task.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-soft">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-brand-gold-dark">{task.id} • {task.orderId}</span>
                    <h3 className="font-bold text-base text-slate-900">{task.customerName}</h3>
                    <p className="text-xs text-slate-600 font-bold">{task.roomName}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    task.status === 'تم التفصيل وجاهز' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border-amber-200'
                  }`}>
                    {task.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl my-2.5 text-xs space-y-1 font-medium">
                  <div><strong>الخامة:</strong> {task.fabricName}</div>
                  <div><strong>الشريط:</strong> {task.tapeStyle}</div>
                  <div><strong>الحلقات:</strong> {task.ringStyle}</div>
                  {task.notes && <div className="text-amber-950 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1"><strong>تعليمات:</strong> {task.notes}</div>}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
                  <button onClick={() => updateTask(task.id, 'قيد خياطة الشريط')} className={`p-2 rounded-xl border ${task.status === 'قيد خياطة الشريط' ? 'bg-amber-100 border-amber-300 text-amber-950 font-black' : 'bg-slate-50 border-slate-200'}`}>
                    خياطة الشريط
                  </button>
                  <button onClick={() => updateTask(task.id, 'تركيب الحلقات والكي')} className={`p-2 rounded-xl border ${task.status === 'تركيب الحلقات والكي' ? 'bg-blue-100 border-blue-300 text-blue-950 font-black' : 'bg-slate-50 border-slate-200'}`}>
                    الحلقات والكي
                  </button>
                  <button onClick={() => updateTask(task.id, 'تم التفصيل وجاهز')} className={`p-2 rounded-xl border ${task.status === 'تم التفصيل وجاهز' ? 'bg-emerald-500 text-white font-black' : 'bg-brand-gold hover:bg-brand-gold-hover text-slate-950 shadow-gold'}`}>
                    جاهز للتسليم ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
