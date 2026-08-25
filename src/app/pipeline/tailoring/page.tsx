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
    roomName: 'الصالة الرئيسية (بلكونة) - تول',
    fabricName: 'تول خفيف مطرز (8.75متر)',
    tapeStyle: 'شريط كشكشة 3 فتلة إيطالي',
    ringStyle: 'بدون حلقات (مجرى)',
    tailorName: 'عم مصطفى',
    status: 'قيد خياطة الشريط',
    notes: 'ثني الذيل 12 سم وثني الأجناب 3 سم',
  },
  {
    id: 'TLR-102',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    roomName: 'غرفة النوم الرئيسية - بلاك آوت',
    fabricName: 'بلاك آوت عازل ضوء (2.60متر)',
    tapeStyle: 'بدون شريط كشكشة',
    ringStyle: 'حلقات كبس مذهبة كل 12 سم',
    tailorName: 'أحمد شحاتة',
    status: 'تركيب الحلقات والكي',
    notes: 'استخدام فازلين تقوية تحت الحلقات',
  }
];

export default function PipelineTailoringPage() {
  const [tasks, setTasks] = useState<TailoringTask[]>(initialTasks);

  const updateTask = (id: string, status: TailoringTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  return (
    <PageShell title="المرحلة 4: الورشة - الخياطة والتفصيل">
      <div className="flex flex-col gap-6">
        <div>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
            المرحلة الرابعة • قسم الخياطة والتفصيل
          </span>
          <h1 className="font-display font-black text-2xl text-slate-900">خياطة الأشرطة والحلقات والتشطيب النهائي</h1>
          <p className="text-slate-500 text-sm mt-0.5">تفصيل الستائر، خياطة أشرطة الكشكشة، كبس الحلقات، والكي والتغليف قبل التسليم للتركيب.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400">{task.id} • {task.orderId}</span>
                  <h3 className="font-bold text-base text-slate-900">{task.customerName}</h3>
                  <p className="text-xs text-brand-gold-dark font-bold">{task.roomName}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                  task.status === 'تم التفصيل وجاهز' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  : 'bg-amber-100 text-amber-900 border-amber-200'
                }`}>
                  {task.status}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl my-3 text-xs space-y-1.5 font-medium">
                <div><strong>الخامة:</strong> {task.fabricName}</div>
                <div><strong>الشريط:</strong> {task.tapeStyle}</div>
                <div><strong>الحلقات:</strong> {task.ringStyle}</div>
                <div><strong>الترزي المسؤول:</strong> {task.tailorName}</div>
                {task.notes && <div className="text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 mt-2"><strong>تعليمات:</strong> {task.notes}</div>}
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
      </div>
    </PageShell>
  );
}
