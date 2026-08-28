'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

interface DeliveryJob {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  branch: string;
  notes: string;
  remainingAmount: number;
  status: 'جاهز للتسليم بالمعرض' | 'تم التسليم للعميل بنجاح' | 'في التركيبات';
}

const initialDeliveryJobs: DeliveryJob[] = [
  {
    id: 'DEL-JOB-01',
    orderId: 'ORD-004',
    customerName: 'م/ طارق عبد المحسن',
    phone: '01233445566',
    branch: 'الفرع الرئيسي',
    notes: 'تسليم استلام شخصي من الفرع بدون تركيب ميداني',
    remainingAmount: 3200,
    status: 'جاهز للتسليم بالمعرض',
  },
  {
    id: 'DEL-JOB-02',
    orderId: 'ORD-005',
    customerName: 'أحمد فتحي',
    phone: '01122334455',
    branch: 'فرع الشيخ زايد',
    notes: 'شحن عن طريق شركة النقل إلى الإسكندرية',
    remainingAmount: 0,
    status: 'تم التسليم للعميل بنجاح',
  }
];

export default function PipelineDeliveryPage() {
  const [jobs, setJobs] = useState<DeliveryJob[]>(initialDeliveryJobs);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  const isSent = (status: DeliveryJob['status']) => status === 'تم التسليم للعميل بنجاح' || status === 'في التركيبات';

  const tabFiltered = jobs.filter(j => {
    if (activeTab === 'OPEN') {
      return !isSent(j.status);
    } else {
      return isSent(j.status);
    }
  });

  const filtered = tabFiltered.filter(j => {
    const matchesSearch = j.customerName.includes(searchQuery) || j.id.includes(searchQuery) || j.orderId.includes(searchQuery);
    const matchesBranch = selectedBranch === 'ALL' || j.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const completeDelivery = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'تم التسليم للعميل بنجاح' } : j));
    alert('تم تسجيل تسليم الأوردر للعميل بنجاح وإغلاق الطلب.');
  };

  const openCount = jobs.filter(j => !isSent(j.status)).length;
  const sentCount = jobs.filter(j => isSent(j.status)).length;

  return (
    <PageShell title="التسليمات">
      <div className="flex flex-col gap-5">
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
            <span>التسليمات</span>
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
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>السجل</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {sentCount}
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
              placeholder="بحث باسم العميل، رقم الهاتف أو الفرع..."
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
              {activeTab === 'OPEN' ? 'لا توجد طلبات تسليم بالمعرض حالياً' : 'السجل فارغ'}
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
                    <th className="p-3.5">الفرع والنقطة</th>
                    <th className="p-3.5">ملاحظات التسليم</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(job => (
                    <tr key={job.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{job.customerName} ({job.phone})</td>
                      <td className="p-3.5 text-slate-700">{job.branch}</td>
                      <td className="p-3.5 text-slate-800">{job.notes}</td>
                      <td className="p-3.5 text-center">
                        <a
                          href={`https://wa.me/2${job.phone}?text=${encodeURIComponent(`مرحباً ${job.customerName}، تم تسجيل تسليم طلب الستائر الخاص بك بنجاح من (${job.branch}) لدى مؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200"
                        >
                          💬 واتساب
                        </a>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                          job.status === 'في التركيبات'
                            ? 'bg-amber-100 text-amber-950 border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        }`}>
                          {job.status === 'في التركيبات' ? 'تم النقل للتركيبات ←' : 'تم التسليم للعميل بنجاح'}
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
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      job.status === 'تم التسليم للعميل بنجاح' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl my-2 text-xs space-y-1 font-medium">
                    <div><strong>الفرع / النقطة:</strong> {job.branch}</div>
                    <div><strong>ملاحظات التسليم:</strong> {job.notes}</div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-200">
                      <span className="text-slate-500">المتبقي للتحصيل عند التسليم:</span>
                      <strong className="font-mono font-black text-rose-700">{job.remainingAmount.toLocaleString()} ج.م</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/2${job.phone}?text=${encodeURIComponent(`مرحباً ${job.customerName}، نود إعلامك بأن طلب الستائر الخاص بك جاهز للتسليم الآن بمقر مؤسسة أحمد كشك (${job.branch}). يسعدنا زيارتكم واستلام الأوردر!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    💬 إرسال إشعار الجاهزية للعميل (واتساب)
                  </a>

                  {job.status !== 'تم التسليم للعميل بنجاح' && job.status !== 'في التركيبات' ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => completeDelivery(job.id)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        تأكيد تسليم الأوردر للعميل وتحصيل ({job.remainingAmount.toLocaleString()} ج)
                      </button>
                      <button
                        onClick={() => {
                          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'في التركيبات' } : j));
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                      >
                        نقل إلى التركيبات ←
                      </button>
                    </div>
                  ) : (
                    <div className="w-full text-center py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                      ✓ تم تحويل الطلب للسجل ومغلق
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
