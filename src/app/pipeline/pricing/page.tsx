'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import {
  getStoredQuotations,
  QuotationOrder,
} from '@/lib/inspectionsStore';

export default function PipelinePricingPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const list = getStoredQuotations();
    setQuotations(list);
  }, []);

  const isSent = (status: QuotationOrder['status']) => status === 'تم التحويل للورشة';

  const tabFiltered = quotations.filter(q => activeTab === 'OPEN' ? !isSent(q.status) : isSent(q.status));
  const filtered = tabFiltered.filter(q =>
    q.customerName.includes(searchQuery) || q.phone.includes(searchQuery) || q.id.includes(searchQuery) || q.inspectionId.includes(searchQuery)
  );

  const openCount = quotations.filter(q => !isSent(q.status)).length;
  const sentCount = quotations.filter(q => isSent(q.status)).length;

  return (
    <PageShell title="المرحلة 2: اختيار القماش والتسعير والتعاقد">
      <div className="flex flex-col gap-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center border border-amber-200">
              02
            </span>
            <div>
              <h1 className="font-black text-xl text-slate-900">سجل مقايسات وعقود الستائر</h1>
              <p className="text-xs text-slate-500 mt-0.5">تسعير الأقمشة، الأشرطة، التجهيزات وحجز المخزن واعتماد العقود</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              إجمالي العقود: {quotations.length} عقد
            </span>
          </div>
        </div>

        {/* 2 Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'OPEN'
                ? 'border-amber-600 text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">texture</span>
            <span>بانتظار التسعير والعقد</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SENT'
                ? 'border-amber-600 text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">content_cut</span>
            <span>سجل العقود المحولة للورشة</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {sentCount}
            </span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، رقم الهاتف، كود العقد أو كود المعاينة..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
          />
        </div>

        {/* Master Clean Data Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-2">
            <span className="material-symbols-outlined text-[42px] text-slate-300 block">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد طلبات بانتظار اختيار القماش والتسعير' : 'سجل العقود المحولة فارغ'}
            </h3>
            <p className="text-xs text-slate-400">أي معاينة جديدة يتم إنهاؤها تحول تلقائياً لهذه الصفحة للتسعير.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">كود العقد والمعاينة</th>
                    <th className="p-4">اسم العميل والهاتف</th>
                    <th className="p-4">عنوان التركيب والمعاينة</th>
                    <th className="p-4 text-left font-mono">الإجمالي بالكامل</th>
                    <th className="p-4 text-left font-mono">العربون المسدد</th>
                    <th className="p-4 text-left font-mono">المتبقي للتحصيل</th>
                    <th className="p-4 text-center">حالة العقد</th>
                    <th className="p-4 text-center">التفاصيل والتسعير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(q => (
                    <tr
                      key={q.id}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/pipeline/pricing/${encodeURIComponent(q.id)}`)}
                    >
                      <td className="p-4 align-middle">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-[11px] inline-block">
                          {q.id}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block mt-1">معاينة: {q.inspectionId}</span>
                      </td>

                      <td className="p-4 align-middle">
                        <div className="font-black text-slate-900 text-sm">{q.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">{q.phone}</div>
                      </td>

                      <td className="p-4 text-slate-600 align-middle">
                        <div className="font-medium text-slate-800">{q.address}</div>
                        <span className="text-[10px] text-slate-400 font-bold">مسؤول المبيعات: {q.estimatorName || 'أحمد كشك'}</span>
                      </td>

                      <td className="p-4 text-left font-mono font-black text-slate-900 text-sm align-middle">
                        {q.totalAmount > 0 ? `${q.totalAmount.toLocaleString()} ج` : <span className="text-amber-600 font-sans font-bold text-xs">قيد التسعير</span>}
                      </td>

                      <td className="p-4 text-left font-mono font-bold text-emerald-800 text-xs align-middle">
                        {q.depositPaid.toLocaleString()} ج
                      </td>

                      <td className="p-4 text-left font-mono font-bold text-rose-800 text-xs align-middle">
                        {q.remainingAmount.toLocaleString()} ج
                      </td>

                      <td className="p-4 text-center align-middle">
                        <span className={`text-[11px] px-3 py-1 rounded-full font-bold border inline-block ${
                          q.status === 'معتمد ومسدد العربون' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : q.status === 'تم إرسال المقايسة' ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : q.status === 'تم التحويل للورشة' ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {q.status}
                        </span>
                      </td>

                      <td className="p-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => router.push(`/pipeline/pricing/${encodeURIComponent(q.id)}`)}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 mx-auto"
                        >
                          <span>فتح التفاصيل والتسعير</span>
                          <span>←</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
