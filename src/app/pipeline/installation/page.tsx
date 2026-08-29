'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { getStoredPipelineOrders, fetchPipelineOrders, updatePipelineOrderStatus, isTodayOrOverdue } from '@/lib/pipelineStore';
import { formatDate } from '@/lib/dateUtils';

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
  const [jobs, setJobs] = useState<InstallJob[]>([]);
  const [activeTab, setActiveTab] = useState<'TODAY' | 'SCHEDULED' | 'SENT'>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      const stored = await fetchPipelineOrders();
      setJobs((stored || []) as any);
    }
    load();
  }, []);

  const isSent = (status: InstallJob['status']) => status === 'تم التركيب بنجاح ومغلق';
  const isTodayJob = (j: any) => isTodayOrOverdue(j.scheduledDate || j.deliveryDate);

  const tabFiltered = jobs.filter(j => {
    if (activeTab === 'TODAY') {
      return !isSent(j.status) && isTodayJob(j);
    } else if (activeTab === 'SCHEDULED') {
      return !isSent(j.status) && !isTodayJob(j);
    } else {
      return isSent(j.status);
    }
  });

  const filtered = tabFiltered.filter(j => {
    const matchesSearch = j.customerName.includes(searchQuery) || j.phone.includes(searchQuery) || j.id.includes(searchQuery);
    const matchesBranch = selectedBranch === 'ALL' || (j as any).branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const completeInstallation = (id: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== id) return j;
      return {
        ...j,
        status: 'تم التركيب بنجاح ومغلق',
      };
    }));
    updatePipelineOrderStatus(id, 'مكتمل', 'تم التركيب بنجاح ومغلق');
    alert('تم تسجيل إتمام التركيب وتحصيل المبلغ المتبقي وإغلاق الطلب بنجاح.');
  };

  const todayCount = jobs.filter(j => !isSent(j.status) && isTodayJob(j)).length;
  const scheduledCount = jobs.filter(j => !isSent(j.status) && !isTodayJob(j)).length;
  const historyCount = jobs.filter(j => isSent(j.status)).length;

  return (
    <PageShell title="7. التركيبات" badge="7">
      <div className="flex flex-col gap-5">
        {/* 3-Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('TODAY')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'TODAY'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">today</span>
            <span>اليوم</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'TODAY' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {todayCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SCHEDULED')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SCHEDULED'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">event</span>
            <span>مجدول</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SCHEDULED' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {scheduledCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SENT'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>السجل</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {historyCount}
            </span>
          </button>
        </div>

        {/* Search & Branch Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-8">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العميل، الهاتف، أو الفني..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-2xs"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs cursor-pointer"
            >
              <option value="ALL">عوامل تصفية: جميع الفروع</option>
              <option value="الفرع الرئيسي">الفرع الرئيسي</option>
              <option value="فرع عرابي">فرع عرابي</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab !== 'SENT' ? 'لا توجد طلبات تركيب جارية حالياً' : 'السجل فارغ'}
            </h3>
          </div>
        ) : activeTab === 'SENT' ? (
          /* TAB 2: Table Format (جدول السجل) */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">العميل والهاتف</th>
                    <th className="p-3.5">عنوان التركيب</th>
                    <th className="p-3.5">الفني المسؤول</th>
                    <th className="p-3.5">تاريخ وموعد التركيب</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(job => (
                    <tr key={job.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{job.customerName} ({job.phone})</td>
                      <td className="p-3.5 text-slate-700">{job.address}</td>
                      <td className="p-3.5 text-slate-800 font-bold">{job.technicianName}</td>
                      <td className="p-3.5 font-mono text-slate-700">{job.scheduledDate ? formatDate(job.scheduledDate) : 'غير محدد'}</td>
                      <td className="p-3.5 text-center">
                        <a
                          href={`https://wa.me/2${job.phone}?text=${encodeURIComponent(`مرحباً ${job.customerName}، تم إتمام تركيب الستائر في موقعكم بنجاح بواسطة فني مؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200"
                        >
                          💬 واتساب
                        </a>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          تم التركيب ومغلق
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1: Active Cards (الكرت) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{job.customerName}</h3>
                      <p className="text-xs text-slate-500 font-mono" dir="ltr">{job.phone}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      job.status === 'تم التركيب بنجاح ومغلق' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl my-2 text-xs space-y-1 font-medium">
                    <div><strong>العنوان:</strong> {job.address}</div>
                    <div><strong>الفني المسؤول:</strong> {job.technicianName}</div>
                    <div><strong>موعد التركيب:</strong> {job.scheduledDate ? formatDate(job.scheduledDate) : 'غير محدد'}</div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-200">
                      <span className="text-slate-500">المتبقي للتحصيل عند التركيب:</span>
                      <strong className="font-mono font-black text-rose-700">{job.remainingAmount.toLocaleString()} ج.م</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/2${job.phone}?text=${encodeURIComponent(`مرحباً ${job.customerName}، فريق التركيبات بمؤسسة أحمد كشك يود إعلامك بأن موعد تركيب الستائر المخطط هو (${job.scheduledDate ? formatDate(job.scheduledDate) : 'غير محدد'}). نلتقي على خير!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    💬 إرسال موعد التركيب للعميل (واتساب)
                  </a>

                  {job.status !== 'تم التركيب بنجاح ومغلق' ? (
                    <button
                      onClick={() => completeInstallation(job.id)}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-gold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      تم التركيب وتحصيل ({job.remainingAmount.toLocaleString()} ج)
                    </button>
                  ) : (
                    <div className="w-full text-center py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                      ✓ تم التركيب وإغلاق الطلب
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
