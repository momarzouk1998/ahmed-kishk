'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import {
  getStoredQuotations,
  fetchQuotations,
  QuotationOrder,
} from '@/lib/inspectionsStore';
function getBranchBadgeStyle(branchName: string) {
  switch (branchName) {
    case 'الفرع الرئيسي':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'فرع عرابي':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'فرع زايد':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default function PipelinePricingPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationOrder[]>(() => getStoredQuotations());
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      const list = await fetchQuotations();
      setQuotations(list);
    }
    load();
  }, []);

  const isSent = (status: any) => status !== 'انتظار تسعير' && status !== 'بانتظار التسعير';

  const tabFiltered = quotations.filter(q => activeTab === 'OPEN' ? !isSent(q.status) : isSent(q.status));
  const filtered = tabFiltered.filter(q => {
    const matchesSearch =
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.phone.includes(searchQuery) ||
      q.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch = selectedBranch === 'ALL' || (q as any).branch === selectedBranch;
    const matchesStatus = selectedStatus === 'ALL' || q.status === selectedStatus;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  const openCount = quotations.filter(q => !isSent(q.status)).length;
  const sentCount = quotations.filter(q => isSent(q.status)).length;

  return (
    <PageShell title="2. التسعير والعقد" badge="2">
      <div className="flex flex-col gap-4">
        {/* 2 Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'OPEN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">request_quote</span>
            <span>التسعير</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
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

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="relative sm:col-span-6">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العميل، رقم الهاتف أو العنوان..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-gold shadow-2xs"
            />
          </div>

          {/* Filter 1: Branch */}
          <div className="sm:col-span-3">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs"
            >
              <option value="ALL">جميع الفروع</option>
              <option value="الفرع الرئيسي">الفرع الرئيسي</option>
              <option value="فرع عرابي">فرع عرابي</option>
            </select>
          </div>

          {/* Filter 2: Status */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs cursor-pointer"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="انتظار تسعير">انتظار تسعير</option>
              <option value="في المقص">في المقص</option>
              <option value="في الورشة">في الورشة</option>
              <option value="مكتمل">مكتمل</option>
            </select>
          </div>
        </div>

        {/* Master Clean Data Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-1">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد عقود قيد التسعير حالياً' : 'سجل العقود المحولة للورشة فارغ'}
            </h3>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[850px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">اسم العميل</th>
                    <th className="p-3.5">العنوان</th>
                    <th className="p-3.5">الفرع</th>
                    <th className="p-3.5 text-left font-mono">الإجمالي بالكامل</th>
                    <th className="p-3.5 text-left font-mono">العربون المسدد</th>
                    <th className="p-3.5 text-left font-mono">المتبقي للتحصيل</th>
                    <th className="p-3.5 text-center">حالة العقد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(q => (
                    <tr
                      key={q.id}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/pipeline/pricing/${encodeURIComponent(q.id)}`)}
                    >
                      {/* Customer Name */}
                      <td className="p-3.5 align-middle">
                        <div className="font-black text-indigo-950 hover:text-amber-900 transition-colors text-sm">{q.customerName}</div>
                      </td>

                      {/* Address */}
                      <td className="p-3.5 text-slate-800 font-medium align-middle truncate max-w-[180px]">
                        {q.address || '—'}
                      </td>

                      {/* Branch Badge */}
                      <td className="p-3.5 align-middle">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border inline-block ${getBranchBadgeStyle((q as any).branch || 'الفرع الرئيسي')}`}>
                          {(q as any).branch || 'الفرع الرئيسي'}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="p-3.5 text-left font-mono font-black text-slate-900 text-sm align-middle">
                        {(Number(q.totalAmount) || 0) > 0 ? `${(Number(q.totalAmount) || 0).toLocaleString()} ج` : <span className="text-amber-600 font-sans font-bold text-xs">قيد التسعير</span>}
                      </td>

                      {/* Deposit */}
                      <td className="p-3.5 text-left font-mono font-bold text-emerald-800 text-xs align-middle">
                        {(Number(q.depositPaid) || 0).toLocaleString()} ج
                      </td>

                      {/* Remaining */}
                      <td className="p-3.5 text-left font-mono font-bold text-rose-800 text-xs align-middle">
                        {(Number(q.remainingAmount) || 0).toLocaleString()} ج
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center align-middle">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border inline-block ${
                          q.status === 'معتمد ومسدد العربون' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : q.status === 'تم إرسال المقايسة' ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : q.status === 'تم التحويل للورشة' ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {q.status}
                        </span>
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
