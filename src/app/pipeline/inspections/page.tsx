'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface InspectionSummary {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  scheduledAt: string;
  technician: string;
  status: 'مُجدول' | 'تم رفع المقاسات' | 'قيد التسعير' | 'في الورشة' | 'مكتمل';
  roomsCount: number;
  isLocked: boolean;
  createdAt: string;
}

const mockInspections: InspectionSummary[] = [
  {
    id: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    branch: 'الفرع الرئيسي',
    scheduledAt: '2026-08-26 16:00',
    technician: 'أحمد حسن',
    status: 'تم رفع المقاسات',
    roomsCount: 2,
    isLocked: false,
    createdAt: '2026-08-25',
  },
  {
    id: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    branch: 'فرع عرابي',
    scheduledAt: '2026-08-27 12:00',
    technician: 'محمد علي',
    status: 'مُجدول',
    roomsCount: 0,
    isLocked: false,
    createdAt: '2026-08-25',
  },
  {
    id: 'INS-003',
    customerName: 'شركة المعمار للمقاولات',
    phone: '01155556666',
    address: 'المهندسين، شارع البطل',
    branch: 'الفرع الرئيسي',
    scheduledAt: '2026-08-24 11:00',
    technician: 'محمد علي',
    status: 'في الورشة',
    roomsCount: 4,
    isLocked: true,
    createdAt: '2026-08-24',
  },
  {
    id: 'INS-004',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    address: 'مصر الجديدة، ميدان الحجاز',
    branch: 'فرع عرابي',
    scheduledAt: '2026-08-23 18:00',
    technician: 'أحمد حسن',
    status: 'مكتمل',
    roomsCount: 3,
    isLocked: true,
    createdAt: '2026-08-23',
  },
  {
    id: 'INS-005',
    customerName: 'د. طارق خيري',
    phone: '01077665544',
    address: 'المعادي، دجلة شارع 200',
    branch: 'الفرع الرئيسي',
    scheduledAt: '2026-08-28 15:00',
    technician: 'أحمد حسن',
    status: 'مُجدول',
    roomsCount: 0,
    isLocked: false,
    createdAt: '2026-08-25',
  },
];

export default function PipelineInspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionSummary[]>(mockInspections);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [branchFilter, setBranchFilter] = useState('الكل');
  const [showNewModal, setShowNewModal] = useState(false);

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

  // Filtering
  const filtered = inspections.filter(item => {
    const matchesSearch =
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.technician.includes(searchQuery);

    const matchesStatus = statusFilter === 'الكل' || item.status === statusFilter;
    const matchesBranch = branchFilter === 'الكل' || item.branch === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    const newId = `INS-${String(inspections.length + 1).padStart(3, '0')}`;
    const newItem: InspectionSummary = {
      id: newId,
      customerName: name,
      phone,
      address,
      branch,
      scheduledAt: schedule || 'غير محدد',
      technician: tech,
      status: 'مُجدول',
      roomsCount: 0,
      isLocked: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setInspections([newItem, ...inspections]);
    setShowNewModal(false);
    // Navigate directly to the detail page of the new inspection
    router.push(`/pipeline/inspections/${newId}`);
  };

  return (
    <PageShell title="المرحلة 1: المعاينات ورفع المقاسات">
      <div className="flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                المرحلة 1 • فني المعاينات
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">(شاشة الفني الميداني — بدون أسعار)</span>
            </div>
            <h1 className="font-display font-black text-2xl text-slate-900">سجل طلبات المعاينات والمقاسات</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              إجمالي {filtered.length} طلب معاينة مسجل • اضغط على أي طلب لفتح وتعديل أبعاد الغرف.
            </p>
          </div>

          <button
            onClick={() => {
              setName(''); setPhone(''); setAddress(''); setSchedule('');
              setShowNewModal(true);
            }}
            className="w-full sm:w-auto bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-5 py-3 rounded-xl font-black text-xs sm:text-sm shadow-gold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            + تسجيل طلب معاينة جديد
          </button>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="بحث بالاسم، رقم الهاتف، كود المعاينة، أو الفني..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold focus:bg-white transition-all"
            />
          </div>

          {/* Status and Branch Selectors */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-gold"
            >
              <option value="الكل">جميع الحالات</option>
              <option value="مُجدول">مُجدول</option>
              <option value="تم رفع المقاسات">تم رفع المقاسات</option>
              <option value="قيد التسعير">قيد التسعير</option>
              <option value="في الورشة">في الورشة</option>
              <option value="مكتمل">مكتمل</option>
            </select>

            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-gold"
            >
              <option value="الكل">جميع الفروع</option>
              <option value="الفرع الرئيسي">الفرع الرئيسي</option>
              <option value="فرع عرابي">فرع عرابي</option>
            </select>
          </div>
        </div>

        {/* Data View: Desktop Table + Mobile Cards */}
        {paginatedItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-slate-300 block mb-2">search_off</span>
            <h3 className="font-bold text-slate-800">لا توجد طلبات معاينة تطابق البحث</h3>
            <p className="text-xs text-slate-500 mt-1">جرب تغيير كلمات البحث أو الفلتر أعلاه.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (md and up) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-4">كود الطلب</th>
                    <th className="p-4">العميل</th>
                    <th className="p-4">العنوان والفرع</th>
                    <th className="p-4">الفني المسؤول</th>
                    <th className="p-4">موعد الزيارة</th>
                    <th className="p-4 text-center">الغرف</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/pipeline/inspections/${item.id}`)}
                      className="border-t border-slate-100 hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-brand-gold-dark">{item.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-sm text-slate-900">{item.customerName}</div>
                        <div className="text-slate-400 font-mono" dir="ltr">{item.phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-700 font-medium truncate max-w-[180px]">{item.address || '—'}</div>
                        <span className="text-[10px] text-slate-400 font-bold">{item.branch}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{item.technician}</td>
                      <td className="p-4 font-mono text-slate-600">{item.scheduledAt}</td>
                      <td className="p-4 text-center">
                        <span className="font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-800">
                          {item.roomsCount} غرف
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                            item.status === 'تم رفع المقاسات' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                            : item.status === 'في الورشة' ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : item.status === 'قيد التسعير' ? 'bg-blue-100 text-blue-900 border-blue-200'
                            : item.status === 'مكتمل' ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-amber-100 text-amber-900 border-amber-200'
                          }`}>
                            {item.status}
                          </span>
                          {item.isLocked && (
                            <span className="text-[9px] text-rose-700 font-bold flex items-center gap-0.5 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              🔒 مقفول
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-gold-dark hover:underline">
                          فتح المقاسات ←
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< md) - Clean, touch-friendly */}
            <div className="md:hidden flex flex-col gap-3">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/pipeline/inspections/${item.id}`)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft active:scale-[0.99] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-brand-gold-dark">{item.id}</span>
                      <h3 className="font-bold text-base text-slate-900">{item.customerName}</h3>
                      <p className="text-xs text-slate-500 font-mono" dir="ltr">{item.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                        item.status === 'تم رفع المقاسات' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        : item.status === 'في الورشة' ? 'bg-purple-100 text-purple-900 border-purple-200'
                        : item.status === 'قيد التسعير' ? 'bg-blue-100 text-blue-900 border-blue-200'
                        : 'bg-amber-100 text-amber-900 border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                      {item.isLocked && (
                        <span className="text-[9px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          🔒 مقفول
                        </span>
                      )}
                    </div>
                  </div>

                  {item.address && (
                    <p className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                      {item.address}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">الفني: <strong className="text-slate-800">{item.technician}</strong></span>
                    <span className="font-bold text-brand-gold-dark bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {item.roomsCount} غرف مسجلة ←
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-soft text-xs">
                <span className="text-slate-500 font-medium">
                  صفحة <strong>{currentPage}</strong> من <strong>{totalPages}</strong> (إجمالي {filtered.length} طلب)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 font-bold hover:bg-slate-50"
                  >
                    السابق
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 font-bold hover:bg-slate-50"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: New Inspection Request */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="font-display font-black text-xl text-slate-900 mb-4">تسجيل طلب معاينة جديد</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم العميل *</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="الاسم الكامل" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">رقم الهاتف *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="01xxxxxxxxx" dir="ltr" required />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">العنوان بالتفصيل</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="المنطقة، الشارع، العمارة" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفرع التابع له</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-xs">
                    <option>الفرع الرئيسي</option>
                    <option>فرع عرابي</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفني المسؤول</label>
                  <select value={tech} onChange={e => setTech(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-xs">
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                    <option>علي إبراهيم</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">موعد الزيارة المتوقع</label>
                <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm" />
              </div>

              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-3 rounded-xl font-bold text-sm shadow-gold">
                  حفظ وفتح شاشة المقاسات ←
                </button>
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm">
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
