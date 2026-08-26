'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface InstallJob {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  scheduledDate: string;
  technicianName: string;
  remainingAmount: number;
  status: 'مُجدول للتركيب' | 'تم التركيب بنجاح ومغلق';
}

const initialJobs: InstallJob[] = [
  {
    id: 'INS-JOB-01',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    scheduledDate: '2026-09-05 14:00',
    technicianName: 'أحمد حسن',
    remainingAmount: 5600,
    status: 'مُجدول للتركيب',
  },
  {
    id: 'INS-JOB-02',
    orderId: 'ORD-003',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    address: 'مصر الجديدة',
    scheduledDate: '2026-08-27 16:00',
    technicianName: 'علي إبراهيم',
    remainingAmount: 0,
    status: 'تم التركيب بنجاح ومغلق',
  }
];

export default function PipelineInstallationPage() {
  const [jobs, setJobs] = useState<InstallJob[]>(initialJobs);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  const isSent = (status: InstallJob['status']) => status === 'تم التركيب بنجاح ومغلق';

  const tabFiltered = jobs.filter(j => activeTab === 'OPEN' ? !isSent(j.status) : isSent(j.status));
  const filtered = tabFiltered.filter(j =>
    j.customerName.includes(searchQuery) || j.phone.includes(searchQuery) || j.id.includes(searchQuery)
  );

  const completeInstallation = (id: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== id) return j;
      return {
        ...j,
        status: 'تم التركيب بنجاح ومغلق',
      };
    }));
    alert('تم تسجيل إتمام التركيب وتحصيل المبلغ المتبقي وإغلاق الطلب بنجاح.');
  };

  const openCount = jobs.filter(j => !isSent(j.status)).length;
  const sentCount = jobs.filter(j => isSent(j.status)).length;

  return (
    <PageShell title="المرحلة 6: التركيب والتسليم">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              المرحلة 6
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">التركيب والتسليم</h1>
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
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            <span>الزيارات المجدولة</span>
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
            <span>سجل الطلبات المغلقة</span>
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
            placeholder="بحث بالاسم، الهاتف، الفني..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد زيارات مجدولة حالياً' : 'السجل فارغ'}
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-brand-gold-dark">{job.id} • {job.orderId}</span>
                      <h3 className="font-bold text-base text-slate-900">{job.customerName}</h3>
                      <p className="text-xs text-slate-500 font-mono" dir="ltr">{job.phone}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      job.status === 'تم التركيب بنجاح ومغلق' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl my-2.5 text-xs space-y-1 font-medium">
                    <div><strong>العنوان:</strong> {job.address}</div>
                    <div><strong>الفني:</strong> {job.technicianName}</div>
                    <div><strong>الموعد:</strong> {job.scheduledDate}</div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-200">
                      <span className="text-slate-500">المتبقي للتحصيل:</span>
                      <strong className="font-mono font-black text-rose-700">{job.remainingAmount.toLocaleString()} ج.م</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  {job.status !== 'تم التركيب بنجاح ومغلق' ? (
                    <button
                      onClick={() => completeInstallation(job.id)}
                      className="w-full bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl text-xs font-bold shadow-gold flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      تم التركيب وتحصيل ({job.remainingAmount.toLocaleString()} ج)
                    </button>
                  ) : (
                    <div className="w-full text-center py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                      ✓ الطلب مكتمل ومغلق
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
