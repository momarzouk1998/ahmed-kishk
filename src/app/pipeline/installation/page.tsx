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
  status: 'مُجدول للتركيب' | 'الفني في الطريق' | 'تم التركيب بنجاح ومغلق';
  collectedAmount: number;
  customerSignatureNotes: string;
}

const initialJobs: InstallJob[] = [
  {
    id: 'INS-JOB-01',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    scheduledDate: '2026-09-05T14:00',
    technicianName: 'أحمد حسن',
    remainingAmount: 5600,
    status: 'مُجدول للتركيب',
    collectedAmount: 0,
    customerSignatureNotes: '',
  },
  {
    id: 'INS-JOB-02',
    orderId: 'ORD-003',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    address: 'مصر الجديدة، ميدان الحجاز',
    scheduledDate: '2026-08-27T16:00',
    technicianName: 'علي إبراهيم',
    remainingAmount: 0,
    status: 'تم التركيب بنجاح ومغلق',
    collectedAmount: 7800,
    customerSignatureNotes: 'تم التسليم واختبار انزلاق الستارة والعميل راضٍ تماماً.',
  }
];

export default function PipelineInstallationPage() {
  const [jobs, setJobs] = useState<InstallJob[]>(initialJobs);

  const completeInstallation = (id: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== id) return j;
      return {
        ...j,
        status: 'تم التركيب بنجاح ومغلق',
        collectedAmount: j.remainingAmount,
        customerSignatureNotes: 'تم استلام المبلغ المتبقي وتسليم الستائر بحالة ممتازة.',
      };
    }));
    alert('تم تسجيل إتمام التركيب وتحصيل المبلغ المتبقي وإغلاق الطلب بنجاح.');
  };

  return (
    <PageShell title="المرحلة 6: التركيب والتسليم والتحصيل">
      <div className="flex flex-col gap-6">
        <div>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
            المرحلة السادسة • قسم التركيبات والتسليم
          </span>
          <h1 className="font-display font-black text-2xl text-slate-900">التركيب الميداني وتسليم العميل وتحصيل المتبقي</h1>
          <p className="text-slate-500 text-sm mt-0.5">متابعة زيارات فنيي التركيبات، تسليم الستائر، فحص الجودة، وتحصيل باقي الحساب وإغلاق الطلب.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map(job => (
            <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{job.id} • {job.orderId}</span>
                    <h3 className="font-bold text-lg text-slate-900">{job.customerName}</h3>
                    <p className="text-xs text-slate-500" dir="ltr">{job.phone}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                    job.status === 'تم التركيب بنجاح ومغلق' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                  }`}>
                    {job.status}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl my-3 text-xs space-y-1.5 font-medium">
                  <div><strong>العنوان:</strong> {job.address}</div>
                  <div><strong>الفني المسؤول:</strong> {job.technicianName}</div>
                  <div><strong>الموعد:</strong> <span className="font-mono">{new Date(job.scheduledDate).toLocaleString('ar-EG')}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500">المبلغ المتبقي للتحصيل:</span>
                    <span className="font-mono font-black text-rose-700 text-sm">{job.remainingAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {job.customerSignatureNotes && (
                  <p className="text-xs text-emerald-950 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 mb-3">
                    <strong>تقرير التسليم:</strong> {job.customerSignatureNotes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {job.status !== 'تم التركيب بنجاح ومغلق' ? (
                  <button
                    onClick={() => completeInstallation(job.id)}
                    className="w-full bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl text-xs font-bold shadow-gold flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    تم التركيب وتحصيل المبلغ المتبقي ({job.remainingAmount.toLocaleString()} ج)
                  </button>
                ) : (
                  <div className="w-full text-center py-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                    ✓ الطلب مكتمل ومغلق بالكامل
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
