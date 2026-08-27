'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { getStoredInspections, saveOrUpdateInspection, InspectionData } from '@/lib/inspectionsStore';

export type InspectionSummary = InspectionData;

function format12hTime(timeStr: string) {
  if (!timeStr || timeStr === 'غير محدد') return 'غير محدد';
  try {
    const parts = timeStr.trim().split(' ');
    if (parts.length === 2 && parts[0].includes('-') && parts[1].includes(':')) {
      const [year, month, day] = parts[0].split('-');
      const [h, m] = parts[1].split(':');
      let hourNum = parseInt(h, 10);
      const ampm = hourNum >= 12 ? 'م' : 'ص';
      hourNum = hourNum % 12 || 12;
      const formattedHour = String(hourNum).padStart(2, '0');
      
      const monthsArabic: Record<string, string> = {
        '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
        '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
        '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
      };
      const monthName = monthsArabic[month] || month;
      return `${parseInt(day, 10)} ${monthName} • ${formattedHour}:${m} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

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

export default function PipelineInspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionData[]>(() => getStoredInspections());
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [showNewModal, setShowNewModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    setInspections(getStoredInspections());
  }, []);

  // New Request Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [branch, setBranch] = useState('الفرع الرئيسي');
  const [tech, setTech] = useState('أحمد حسن');
  const [schedule, setSchedule] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const isSent = (status: InspectionData['status']) => status === 'قيد التسعير' || status === 'في الورشة' || status === 'مكتمل';

  const tabFiltered = inspections.filter(item => {
    if (activeTab === 'OPEN') {
      return !isSent(item.status);
    } else {
      return isSent(item.status);
    }
  });

  const filtered = tabFiltered.filter(item => {
    const matchesSearch =
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.technician.includes(searchQuery);

    const matchesTech = selectedTech === 'ALL' || item.technician === selectedTech;
    const matchesBranch = selectedBranch === 'ALL' || item.branch === selectedBranch;
    const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

    return matchesSearch && matchesTech && matchesBranch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCount = inspections.filter(i => !isSent(i.status)).length;
  const sentCount = inspections.filter(i => isSent(i.status)).length;

  const handleCreate = (e: React.FormEvent, openDirectly: boolean = false) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('يرجى كتابة اسم العميل ورقم الهاتف');
      return;
    }
    const currentList = getStoredInspections();
    const newId = `INS-${String(currentList.length + 1).padStart(3, '0')}`;
    const newItem: InspectionData = {
      id: newId,
      customerName: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      branch,
      scheduledAt: schedule || 'غير محدد',
      technician: tech,
      status: 'مُجدول',
      isLocked: false,
      notes: '',
      rooms: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    saveOrUpdateInspection(newItem);
    setInspections([newItem, ...currentList]);
    setShowNewModal(false);

    if (openDirectly) {
      router.push(`/pipeline/inspections/${newId}`);
    } else {
      setSuccessToast(`تم تسجيل طلب المعاينة بنجاح للعميل (${newItem.customerName}) ✓`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  return (
    <PageShell title="رفع المقاسات" badge="01">
      <div className="flex flex-col gap-4">
        {/* Tabs Bar with Action Button Beside It */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-1 gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('OPEN'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'OPEN'
                  ? 'border-brand-gold text-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              <span>قيد التنفيذ</span>
              <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
              }`}>
                {openCount}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('SENT'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'SENT'
                  ? 'border-brand-gold text-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              <span>مكتملة</span>
              <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
              }`}>
                {sentCount}
              </span>
            </button>
          </div>

          {/* Action Button Beside Tabs */}
          <button
            onClick={() => {
              setName(''); setPhone(''); setAddress(''); setSchedule('');
              setShowNewModal(true);
            }}
            className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-gold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 mb-1 sm:mb-0"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>طلب معاينة جديد</span>
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{successToast}</span>
          </div>
        )}

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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="بحث بالاسم، رقم الهاتف، العنوان أو الفني..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-gold shadow-2xs"
            />
          </div>

          {/* Filter 1: Technician */}
          <div className="sm:col-span-2">
            <select
              value={selectedTech}
              onChange={(e) => { setSelectedTech(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs"
            >
              <option value="ALL">جميع الفنيين</option>
              <option value="أحمد حسن">أحمد حسن</option>
              <option value="محمد علي">محمد علي</option>
            </select>
          </div>

          {/* Filter 2: Branch */}
          <div className="sm:col-span-2">
            <select
              value={selectedBranch}
              onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs"
            >
              <option value="ALL">جميع الفروع</option>
              <option value="الفرع الرئيسي">الفرع الرئيسي</option>
              <option value="فرع عرابي">فرع عرابي</option>
            </select>
          </div>

          {/* Filter 3: Status */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="مُجدول">مُجدول</option>
              <option value="تم رفع المقاسات">تم رفع المقاسات</option>
              <option value="قيد التسعير">قيد التسعير</option>
              <option value="في الورشة">في الورشة</option>
              <option value="مكتمل">مكتمل</option>
            </select>
          </div>
        </div>

        {/* Data View */}
        {paginatedItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد معاينات قيد التنفيذ حالياً' : 'سجل المعاينات المكتملة فارغ'}
            </h3>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">اسم العميل</th>
                    <th className="p-3.5">العنوان</th>
                    <th className="p-3.5">الفرع</th>
                    <th className="p-3.5">الفني المسؤول</th>
                    <th className="p-3.5">موعد المعاينة</th>
                    <th className="p-3.5 text-center">الغرف</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-center">تواصل سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/pipeline/inspections/${item.id}`)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      {/* Customer Name with distinct indigo color */}
                      <td className="p-3.5 align-middle">
                        <div className="font-black text-indigo-950 hover:text-amber-900 transition-colors text-sm">{item.customerName}</div>
                      </td>

                      {/* Separate Address Column */}
                      <td className="p-3.5 text-slate-800 font-medium align-middle truncate max-w-[180px]">
                        {item.address || '—'}
                      </td>

                      {/* Branch Badge with distinct colors */}
                      <td className="p-3.5 align-middle">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border inline-block ${getBranchBadgeStyle(item.branch)}`}>
                          {item.branch}
                        </span>
                      </td>

                      {/* Technician Column */}
                      <td className="p-3.5 font-bold text-slate-800 align-middle">{item.technician}</td>

                      {/* 12-Hour Formatted Time Column */}
                      <td className="p-3.5 font-mono text-slate-700 font-bold align-middle">
                        {format12hTime(item.scheduledAt)}
                      </td>

                      {/* Rooms Column: Number Only */}
                      <td className="p-3.5 text-center align-middle">
                        <span className="font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-md text-slate-800 text-xs inline-block">
                          {item.rooms?.length || 0}
                        </span>
                      </td>

                      {/* Status Badge Column */}
                      <td className="p-3.5 text-center align-middle">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border inline-block ${
                          item.status === 'تم رفع المقاسات' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.status === 'في الورشة' ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : item.status === 'قيد التسعير' ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Communication Icon-Only Column */}
                      <td className="p-3.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`tel:${item.phone}`}
                            className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors shadow-2xs"
                            title={`اتصال (${item.phone})`}
                          >
                            <span className="material-symbols-outlined text-[17px]">call</span>
                          </a>

                          <a
                            href={`https://wa.me/20${item.phone.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-2xs"
                            title={`واتساب (${item.phone})`}
                          >
                            <span className="material-symbols-outlined text-[17px]">chat</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-2.5">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/pipeline/inspections/${item.id}`)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs active:scale-[0.99] cursor-pointer space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-indigo-950 text-sm">{item.customerName}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      item.status === 'تم رفع المقاسات' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : item.status === 'في الورشة' ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-mono flex items-center gap-2 flex-wrap">
                    <span>{format12hTime(item.scheduledAt)}</span>
                    <span>•</span>
                    <span>{item.technician}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.2 rounded font-bold border text-[10px] ${getBranchBadgeStyle(item.branch)}`}>
                      {item.branch}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-700">الغرف: {item.rooms?.length || 0}</span>
                    
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${item.phone}`}
                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"
                        title="اتصال"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                      </a>
                      <a
                        href={`https://wa.me/20${item.phone.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"
                        title="واتساب"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-bold">صفحة {currentPage} من {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 font-bold bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    السابق
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 font-bold bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg">
            <h2 className="font-display font-black text-lg text-slate-900 mb-3">تسجيل طلب معاينة جديد</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم العميل *</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="الاسم" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">رقم الهاتف *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="01xxxxxxxxx" dir="ltr" required />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">العنوان</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="المنطقة والشارع" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفرع</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs font-bold">
                    <option>الفرع الرئيسي</option>
                    <option>فرع عرابي</option>
                    <option>فرع زايد</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفني المسؤول</label>
                  <select value={tech} onChange={e => setTech(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs font-bold">
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 inline-block">
                  📅 تاريخ ووقت المعاينة الميدانية المخطط *
                </label>
                <input
                  type="datetime-local"
                  value={schedule}
                  onChange={e => setSchedule(e.target.value)}
                  className="border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 bg-white"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(e) => handleCreate(e, false)}
                  className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-gold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">save</span>
                  حفظ في القائمة ✓
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreate(e, true)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">straighten</span>
                  حفظ وفتح المقاسات ←
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
