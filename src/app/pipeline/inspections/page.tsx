'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
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
    address: 'المعادي، دجلة',
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
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Tab 1: Open / In Progress (مُجدول / تم رفع المقاسات ولم ترسل بعد)
  // Tab 2: Sent to Pricing / In Workshop / Completed (مرسلة للتسعير / في الورشة / مكتملة)
  const isSent = (status: InspectionSummary['status']) => status === 'قيد التسعير' || status === 'في الورشة' || status === 'مكتمل';

  const tabFiltered = inspections.filter(item => {
    if (activeTab === 'OPEN') {
      return !isSent(item.status);
    } else {
      return isSent(item.status);
    }
  });

  const filtered = tabFiltered.filter(item => {
    return (
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.technician.includes(searchQuery)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCount = inspections.filter(i => !isSent(i.status)).length;
  const sentCount = inspections.filter(i => isSent(i.status)).length;

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
    router.push(`/pipeline/inspections/${newId}`);
  };

  return (
    <PageShell title="المرحلة 1: رفع المقاسات">
      <div className="flex flex-col gap-5">
        {/* Concise Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
                المرحلة 1
              </span>
              <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">رفع المقاسات</h1>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">شاشة الفني الميداني (بدون أسعار)</p>
          </div>

          <button
            onClick={() => {
              setName(''); setPhone(''); setAddress(''); setSchedule('');
              setShowNewModal(true);
            }}
            className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-gold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            + طلب جديد
          </button>
        </div>

        {/* 2-Tabs Navigation (المعاينات المفتوحة / سجل المعاينات المرسلة) */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => { setActiveTab('OPEN'); setCurrentPage(1); }}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'OPEN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            <span>المعاينات المفتوحة</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('SENT'); setCurrentPage(1); }}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'SENT'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            <span>سجل المعاينات المرسلة</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {sentCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="بحث سريع بالاسم، الهاتف، كود المعاينة..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {/* Data View */}
        {paginatedItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد معاينات مفتوحة حالياً' : 'سجل المعاينات المرسلة فارغ'}
            </h3>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">الكود</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">العنوان</th>
                    <th className="p-3.5">الفني</th>
                    <th className="p-3.5">الموعد</th>
                    <th className="p-3.5 text-center">الغرف</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/pipeline/inspections/${item.id}`)}
                      className="border-t border-slate-100 hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-brand-gold-dark">{item.id}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-slate-900">{item.customerName}</div>
                        <div className="text-slate-400 font-mono" dir="ltr">{item.phone}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 truncate max-w-[160px]">{item.address || '—'}</td>
                      <td className="p-3.5 font-bold text-slate-800">{item.technician}</td>
                      <td className="p-3.5 font-mono text-slate-600">{item.scheduledAt}</td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          {item.roomsCount}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                          item.status === 'تم رفع المقاسات' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                          : item.status === 'في الورشة' ? 'bg-purple-100 text-purple-900 border-purple-200'
                          : item.status === 'قيد التسعير' ? 'bg-blue-100 text-blue-900 border-blue-200'
                          : 'bg-amber-100 text-amber-900 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-brand-gold-dark hover:underline">
                        فتح ←
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
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-brand-gold-dark">{item.id}</span>
                      <h3 className="font-bold text-sm text-slate-900">{item.customerName}</h3>
                      <p className="text-xs text-slate-400 font-mono" dir="ltr">{item.phone}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      item.status === 'تم رفع المقاسات' ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      : item.status === 'في الورشة' ? 'bg-purple-100 text-purple-900 border-purple-200'
                      : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">الفني: <strong>{item.technician}</strong></span>
                    <span className="font-bold text-brand-gold-dark bg-amber-50 px-2 py-0.5 rounded">
                      {item.roomsCount} غرف ←
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">صفحة {currentPage} من {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 font-bold"
                  >
                    السابق
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 font-bold"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Modal */}
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
                  <select value={branch} onChange={e => setBranch(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs">
                    <option>الفرع الرئيسي</option>
                    <option>فرع عرابي</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفني</label>
                  <select value={tech} onChange={e => setTech(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-xs">
                    <option>أحمد حسن</option>
                    <option>محمد علي</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl font-bold text-sm shadow-gold">
                  حفظ وفتح المقاسات ←
                </button>
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">
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
