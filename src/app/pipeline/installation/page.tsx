'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { getStoredPipelineOrders, fetchPipelineOrders, updatePipelineOrderStatus, saveStoredPipelineOrders, isTodayOrOverdue, normalizeMasterStage } from '@/lib/pipelineStore';
import { formatDate, formatDateOnly } from '@/lib/dateUtils';
import OrderRowActions from '@/components/OrderRowActions';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import Pagination from '@/components/Pagination';

interface InstallJob {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  scheduledDate: string;
  technicianName: string;
  remainingAmount: number;
  branch?: string;
  status: 'مُجدول للتركيب' | 'تم التركيب بنجاح ومغلق' | string;
}

const formatInstallDate = (str?: string) => {
  if (!str || str === 'غير محدد' || str.trim() === '') return 'غير محدد';
  if (str.includes('T') || str.includes(':')) {
    const formatted = formatDate(str);
    return formatted || str;
  }
  const formattedOnly = formatDateOnly(str);
  return formattedOnly || str;
};

const initialJobs: InstallJob[] = [];

export default function PipelineInstallationPage() {
  const [jobs, setJobs] = useState<InstallJob[]>([]);
  const [activeTab, setActiveTab] = useState<'TODAY' | 'SCHEDULED' | 'SENT'>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Quick Reschedule / Assign Technician Modal State
  const [technicians, setTechnicians] = useState<string[]>(['أحمد كشك', 'يوسف ياسر', 'أحمد عبدالله', 'محمد نصار', 'أمين']);
  const [editingScheduleJob, setEditingScheduleJob] = useState<InstallJob | null>(null);
  const [scheduleDateInput, setScheduleDateInput] = useState<string>('');
  const [technicianInput, setTechnicianInput] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setSelectedBranch(currentUser.branch);
  }, [isAdmin, currentUser]);

  useEffect(() => {
    async function loadTechs() {
      try {
        const res = await fetch('/api/curtain-technicians');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.technicians) && json.technicians.length > 0) {
            setTechnicians(json.technicians);
          }
        }
      } catch {}
    }
    loadTechs();
  }, []);

  useEffect(() => {
    async function load() {
      const stored = await fetchPipelineOrders();
      if (!stored) {
        setJobs([]);
        return;
      }
      // #FIX: كان localStatus وحده كافياً لإظهار الأوردر هنا حتى لو status الحقيقى
      // رجع لمرحلة سابقة. المرجع الآن هو المرحلة المُطبَّعة فقط.
      const relevant = stored
        .filter(o => {
          const stage = normalizeMasterStage(o.status || '');
          return stage === 'جاهز للتركيب' || stage === 'مكتمل';
        })
        .map((o: any) => {
          const rawDate =
            o.installationDate ||
            o.scheduledDate ||
            o.scheduledAt ||
            o.installDate ||
            '';
          const tech =
            o.technicianName ||
            o.technician ||
            o.installTechnician ||
            o.estimatorName ||
            '';
          const total = Number(o.totalAmount) || 0;
          const dep = Number(o.depositPaid) || 0;
          const rem = o.remainingAmount !== undefined ? Number(o.remainingAmount) : Math.max(0, total - dep);

          return {
            ...o,
            scheduledDate: rawDate,
            deliveryDate: o.deliveryDate || rawDate,
            technicianName: tech,
            remainingAmount: rem,
          };
        });
      setJobs(relevant as any);
    }
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const isSent = (status: InstallJob['status']) => status === 'تم التركيب بنجاح ومغلق';
  const isTodayJob = (j: any) => isTodayOrOverdue(j.scheduledDate || j.deliveryDate || j.createdAt);

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
    const name = j.customerName || '';
    const id = j.id || '';
    const phone = j.phone || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch =
      selectedBranch === 'ALL' ||
      ((j as any).branch && (j as any).branch.includes(selectedBranch)) ||
      (!(j as any).branch && selectedBranch === 'الفرع الرئيسي');

    return matchesSearch && matchesBranch;
  });

  // Pagination (20 لكل صفحة)
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedBranch]);

  const paginatedJobs = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const completeInstallation = async (id: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== id) return j;
      return { ...j, status: 'تم التركيب بنجاح ومغلق' };
    }));
    await updatePipelineOrderStatus(id, 'مكتمل', 'تم التركيب بنجاح ومغلق');
  };

  const handleOpenScheduleModal = (job: InstallJob) => {
    setEditingScheduleJob(job);
    setScheduleDateInput(job.scheduledDate || '');
    setTechnicianInput(job.technicianName || technicians[0] || 'أحمد كشك');
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheduleJob) return;
    setIsSavingSchedule(true);

    try {
      const allOrders = await fetchPipelineOrders();
      const cleanId = (editingScheduleJob.orderId || editingScheduleJob.id || '').trim();
      const rawId = cleanId.replace(/^ORD-/, '');

      const updated = allOrders.map(o => {
        const isMatch =
          o.id === cleanId ||
          o.orderId === cleanId ||
          o.orderId === rawId ||
          o.id === `ORD-${rawId}` ||
          o.id.replace(/^ORD-/, '') === rawId;

        if (isMatch) {
          return {
            ...o,
            installationDate: scheduleDateInput.trim(),
            scheduledDate: scheduleDateInput.trim(),
            technicianName: technicianInput.trim(),
          };
        }
        return o;
      });

      await saveStoredPipelineOrders(updated);

      setJobs(prev => prev.map(j => {
        if (j.id === editingScheduleJob.id) {
          return {
            ...j,
            scheduledDate: scheduleDateInput.trim(),
            technicianName: technicianInput.trim(),
          };
        }
        return j;
      }));

      setEditingScheduleJob(null);
    } catch (err) {
      console.error('Failed to update installation schedule:', err);
      alert('حدث خطأ أثناء حفظ موعد التركيب');
    } finally {
      setIsSavingSchedule(false);
    }
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
            <BranchSelect
              value={selectedBranch}
              onChange={setSelectedBranch}
              isAdmin={isAdmin}
              allValue="ALL"
              allLabel="عوامل تصفية: جميع الفروع"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs cursor-pointer"
            />
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
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map(job => (
                    <tr key={job.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{job.customerName} ({job.phone})</td>
                      <td className="p-3.5 text-slate-700">{job.address}</td>
                      <td className="p-3.5 text-slate-800 font-bold">{job.technicianName || '—'}</td>
                      <td className="p-3.5 font-mono text-slate-700">{formatInstallDate(job.scheduledDate)}</td>
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
                      <td className="p-3.5 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenScheduleModal(job)}
                            className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-amber-200"
                            title="تعديل موعد التركيب والفني"
                          >
                            ✏️ الموعد
                          </button>
                          <OrderRowActions
                            pageId="p_installation"
                            orderId={job.orderId || job.id}
                            customerName={job.customerName}
                            editHref={`/orders/${encodeURIComponent(job.orderId || job.id)}`}
                            onDeleted={() => setJobs(prev => prev.filter(j => j.id !== job.id))}
                            compact
                          />
                        </div>
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
            {paginatedJobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{job.customerName}</h3>
                      <p className="text-xs text-slate-500 font-mono" dir="ltr">{job.phone}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleModal(job)}
                        className="text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-xl text-[11px] font-bold border border-amber-200 cursor-pointer flex items-center gap-1 transition-colors"
                        title="تعديل موعد التركيب أو الفني المسؤول"
                      >
                        <span>✏️</span>
                        <span>تعديل الموعد</span>
                      </button>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        job.status === 'تم التركيب بنجاح ومغلق' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl my-2 text-xs space-y-1.5 font-medium">
                    <div><strong>العنوان:</strong> {job.address || 'غير محدد'}</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>الفني المسؤول:</strong>{' '}
                        <span className="text-slate-900 font-bold">{job.technicianName || 'غير محدد'}</span>
                      </div>
                      {!job.technicianName && (
                        <button
                          type="button"
                          onClick={() => handleOpenScheduleModal(job)}
                          className="text-[10px] font-bold text-amber-700 bg-amber-100/70 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer"
                        >
                          + تعيين فني
                        </button>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>موعد التركيب:</strong>{' '}
                        <span className="font-mono font-bold text-amber-900">{formatInstallDate(job.scheduledDate)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleModal(job)}
                        className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        تغيير
                      </button>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-200">
                      <span className="text-slate-500">المتبقي للتحصيل عند التركيب:</span>
                      <strong className="font-mono font-black text-rose-700">{(Number(job.remainingAmount) || 0).toLocaleString()} ج.م</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/2${job.phone}?text=${encodeURIComponent(`مرحباً ${job.customerName}، فريق التركيبات بمؤسسة أحمد كشك يود إعلامك بأن موعد تركيب الستائر المخطط هو (${formatInstallDate(job.scheduledDate)}). الفني المسؤول: ${job.technicianName || 'فني التركيبات'}. نلتقي على خير!`)}`}
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
                      تم التركيب وتحصيل ({(Number(job.remainingAmount) || 0).toLocaleString()} ج)
                    </button>
                  ) : (
                    <div className="w-full text-center py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                      ✓ تم التركيب وإغلاق الطلب
                    </div>
                  )}
                  <div className="flex justify-center pt-1">
                    <OrderRowActions
                      pageId="p_installation"
                      orderId={job.orderId || job.id}
                      customerName={job.customerName}
                      editHref={`/orders/${encodeURIComponent(job.orderId || job.id)}`}
                      onDeleted={() => setJobs(prev => prev.filter(j => j.id !== job.id))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ✏️ Modal: Quick Reschedule / Assign Technician */}
        {editingScheduleJob && (
          <div className="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-xl">event_available</span>
                  <h3 className="font-bold text-slate-900 text-sm">
                    تحديد موعد التركيب والفني المسؤول
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingScheduleJob(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSchedule} className="space-y-3.5 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">{editingScheduleJob.customerName}</div>
                  <div className="text-slate-500 font-mono text-[11px]" dir="ltr">{editingScheduleJob.phone}</div>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">📅 تاريخ ووقت موعد التركيب:</label>
                  <input
                    type="date"
                    value={scheduleDateInput.split('T')[0] || scheduleDateInput}
                    onChange={e => setScheduleDateInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">🛠️ الفني المسؤول عن التركيب:</label>
                  <select
                    value={technicianInput}
                    onChange={e => setTechnicianInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">— اختر الفني المسؤول —</option>
                    {technicians.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSavingSchedule}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-gold cursor-pointer transition-colors"
                  >
                    {isSavingSchedule ? 'جاري الحفظ...' : 'حفظ موعد التركيب ✓'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingScheduleJob(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="طلب تركيب"
        />
      </div>
    </PageShell>
  );
}
