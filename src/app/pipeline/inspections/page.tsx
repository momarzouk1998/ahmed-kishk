'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { getStoredInspections, saveOrUpdateInspection, fetchInspections, InspectionData } from '@/lib/inspectionsStore';
import { isTodayOrOverdue } from '@/lib/pipelineStore';
import { formatDate } from '@/lib/dateUtils';
import InspectionPrintModal from '@/components/InspectionPrintModal';

export type InspectionSummary = InspectionData;

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
  const [activeTab, setActiveTab] = useState<'TODAY' | 'SCHEDULED' | 'SENT'>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [showNewModal, setShowNewModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<InspectionData | null>(null);

  useEffect(() => {
    async function load() {
      const data = await fetchInspections();
      setInspections(data);
    }
    load();
  }, []);

  // New Request Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [branch, setBranch] = useState('الفرع الرئيسي');
  const [tech, setTech] = useState('أحمد حسن');
  const [schedule, setSchedule] = useState('');

  // Customer Autocomplete State
  const [custSearchQuery, setCustSearchQuery] = useState('');
  const [custDropdownOpen, setCustDropdownOpen] = useState(false);
  const [registeredCustomers, setRegisteredCustomers] = useState<any[]>([]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch('/api/customers', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.customers)) {
            setRegisteredCustomers(json.customers);
            return;
          }
        }
        const raw = localStorage.getItem('ahmed_kishk_customers_v3');
        if (raw) setRegisteredCustomers(JSON.parse(raw));
      } catch {}
    }
    loadCustomers();
  }, [showNewModal]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const isSent = (status: InspectionData['status']) => status === 'قيد التسعير' || status === 'في الورشة' || status === 'مكتمل';
  const isTodayItem = (item: InspectionData) => isTodayOrOverdue(item.scheduledAt || item.createdAt);

  const tabFiltered = inspections.filter(item => {
    if (activeTab === 'TODAY') {
      return !isSent(item.status) && isTodayItem(item);
    } else if (activeTab === 'SCHEDULED') {
      return !isSent(item.status) && !isTodayItem(item);
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

  const todayCount = inspections.filter(i => !isSent(i.status) && isTodayItem(i)).length;
  const scheduledCount = inspections.filter(i => !isSent(i.status) && !isTodayItem(i)).length;
  const historyCount = inspections.filter(i => isSent(i.status)).length;

  const syncCustomerToDirectory = (custName: string, custPhone: string, custAddress: string) => {
    if (typeof window === 'undefined' || !custName.trim()) return;
    try {
      const raw = localStorage.getItem('ahmed_kishk_customers_v3');
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((c: any) => 
        c.phone === custPhone.trim() || c.name.toLowerCase() === custName.trim().toLowerCase()
      );

      if (idx >= 0) {
        list[idx].inspectionsCount = (list[idx].inspectionsCount || 0) + 1;
        if (custAddress.trim()) list[idx].address = custAddress.trim();
      } else {
        const newCust = {
          id: `CUST-${String(list.length + 1).padStart(3, '0')}`,
          name: custName.trim(),
          phone: custPhone.trim() || '—',
          address: custAddress.trim() || '—',
          city: 'القاهرة',
          inspectionsCount: 1,
          ordersCount: 0,
          totalSpent: 0,
          openingBalance: 0,
          balance: 0,
          notes: 'تمت إضافته تلقائياً عند تسجيل طلب معاينة',
          createdAt: new Date().toISOString().split('T')[0],
        };
        list = [newCust, ...list];
      }
      localStorage.setItem('ahmed_kishk_customers_v3', JSON.stringify(list));
    } catch (err) {
      console.error('Failed to sync customer to directory:', err);
    }
  };

  const handleCreate = (e: React.FormEvent, openDirectly: boolean = false) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    syncCustomerToDirectory(name, phone, address);

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
    setName('');
    setPhone('');
    setAddress('');

    if (openDirectly) {
      router.push(`/pipeline/inspections/${newId}`);
    } else {
      setSuccessToast(`تم تسجيل طلب المعاينة بنجاح للعميل (${newItem.customerName}) ✓`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  return (
    <PageShell title="1. رفع المقاسات (المعاينات الميدانية)" badge="1">
      <div className="flex flex-col gap-4">
        {/* Tabs Bar with Action Button Beside It */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-1 gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('TODAY'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
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
              onClick={() => { setActiveTab('SCHEDULED'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
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
              onClick={() => { setActiveTab('SENT'); setCurrentPage(1); }}
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
                {historyCount}
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
              {activeTab !== 'SENT' ? 'لا توجد معاينات قيد التنفيذ حالياً' : 'سجل المعاينات المكتملة فارغ'}
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
                        {formatDate(item.scheduledAt)}
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

                      {/* Communication & Print Column */}
                      <td className="p-3.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintItem(item)}
                            className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            title="طباعة كشف المقاسات (PDF)"
                          >
                            <span className="material-symbols-outlined text-[17px]">print</span>
                          </button>

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

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>{item.address || 'العنوان غير مسجل'} • {item.branch}</div>
                    <div className="font-mono text-slate-700 font-bold">{formatDate(item.scheduledAt)} • فني: {item.technician}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-700">الغرف: {item.rooms?.length || 0}</span>
                    
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setPrintItem(item)}
                        className="w-7 h-7 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center cursor-pointer"
                        title="طباعة كشف المقاسات"
                      >
                        <span className="material-symbols-outlined text-[15px]">print</span>
                      </button>
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
              {/* Live Customer Search & Autocomplete Box */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5 relative">
                <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-amber-600 text-sm">search</span>
                    <span>البحث الفوري عن عميل سابق (بالاسم أو رقم الهاتف):</span>
                  </span>
                  {registeredCustomers.length > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono">({registeredCustomers.length} عميل مسجل)</span>
                  )}
                </label>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 اكتب اسم العميل أو رقم الهاتف للبحث من القائمة..."
                    value={custSearchQuery}
                    onFocus={() => setCustDropdownOpen(true)}
                    onChange={e => {
                      setCustSearchQuery(e.target.value);
                      setCustDropdownOpen(true);
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500 bg-white shadow-2xs"
                  />

                  {custDropdownOpen && custSearchQuery.trim() !== '' && (
                    <div className="absolute right-0 left-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {registeredCustomers.filter(c => 
                        c.name.toLowerCase().includes(custSearchQuery.toLowerCase()) || 
                        c.phone.includes(custSearchQuery)
                      ).length === 0 ? (
                        <div className="p-3 text-slate-400 text-center font-bold">لا يوجد عميل ينطبق عليه هذا البحث (يمكنك إدخال بياناته أدناه كعميل جديد)</div>
                      ) : (
                        registeredCustomers.filter(c => 
                          c.name.toLowerCase().includes(custSearchQuery.toLowerCase()) || 
                          c.phone.includes(custSearchQuery)
                        ).map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setName(c.name);
                              setPhone(c.phone);
                              if (c.address) setAddress(c.address);
                              setCustSearchQuery('');
                              setCustDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-amber-50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{c.name}</div>
                              <div className="text-[11px] text-slate-500">{c.address || 'لا يوجد عنوان مسجل'}</div>
                            </div>
                            <div className="font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-lg text-[11px]" dir="ltr">
                              {c.phone}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

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
                  📅 تاريخ ووقت المعاينة *
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
      {/* 📐 Inspection Measurement Sheet Print Modal */}
      <InspectionPrintModal
        isOpen={!!printItem}
        onClose={() => setPrintItem(null)}
        data={printItem}
      />
    </PageShell>
  );
}
