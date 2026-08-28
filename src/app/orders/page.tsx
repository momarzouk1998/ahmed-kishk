'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import {
  getStoredPipelineOrders,
  saveStoredPipelineOrders,
  updatePipelineOrderStatus,
  normalizeMasterStage,
  GlobalMasterStage,
  PipelineMasterOrder
} from '@/lib/pipelineStore';
import {
  getStoredQuotations,
  getStoredInspections,
  deleteQuotationOrder,
  QuotationOrder,
} from '@/lib/inspectionsStore';

const GLOBAL_STAGES: { key: GlobalMasterStage | 'الكل'; label: string; badgeColor: string }[] = [
  { key: 'الكل', label: 'جميع العقود والأوامر', badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' },
  { key: 'المعاينات', label: '1. المعاينات', badgeColor: 'bg-amber-100 text-amber-950 border-amber-300' },
  { key: 'انتظار تسعير', label: '2. انتظار تسعير', badgeColor: 'bg-blue-100 text-blue-950 border-blue-300' },
  { key: 'في المقص', label: '3. في المقص', badgeColor: 'bg-orange-100 text-orange-950 border-orange-300' },
  { key: 'في الورشة', label: '4. في الورشة', badgeColor: 'bg-purple-100 text-purple-950 border-purple-300' },
  { key: 'تجهيز الاكسسوارات', label: '5. تجهيز الاكسسوارات', badgeColor: 'bg-indigo-100 text-indigo-950 border-indigo-300' },
  { key: 'جاهز للاستلام', label: '6. جاهز للاستلام', badgeColor: 'bg-sky-100 text-sky-950 border-sky-300' },
  { key: 'جاهز للتركيب', label: '7. جاهز للتركيب', badgeColor: 'bg-teal-100 text-teal-950 border-teal-300' },
  { key: 'مكتمل', label: '8. مكتمل', badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300' },
];

export default function CentralOrdersLedgerPage() {
  const [orders, setOrders] = useState<PipelineMasterOrder[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<GlobalMasterStage | 'الكل'>('الكل');
  const [selectedBranch, setSelectedBranch] = useState('الكل');

  const loadData = () => {
    const pipelineOrders = getStoredPipelineOrders();
    const quotations = getStoredQuotations();
    const inspections = getStoredInspections();

    // Map quotations into master list if missing
    const quotationMasterItems: PipelineMasterOrder[] = quotations
      .filter(q => !pipelineOrders.some(p => p.orderId === q.id || p.id === q.id))
      .map(q => ({
        id: q.id,
        orderId: q.id,
        customerName: q.customerName,
        phone: q.phone,
        address: q.address,
        branch: q.branch || 'الفرع الرئيسي',
        deliveryDate: q.deliveryDate || '',
        status: normalizeMasterStage(q.status),
        createdAt: q.date || new Date().toISOString().split('T')[0],
        totalAmount: q.totalAmount || 0,
        depositPaid: q.depositPaid || 0,
        remainingAmount: q.remainingAmount || 0,
        rooms: q.rooms || [],
      }));

    // Map un-quoted inspections
    const inspectionMasterItems: PipelineMasterOrder[] = inspections
      .filter(insp => !pipelineOrders.some(p => p.id === insp.id || p.orderId === insp.id) && !quotations.some(q => q.inspectionId === insp.id))
      .map(insp => ({
        id: insp.id,
        orderId: insp.id,
        customerName: insp.customerName,
        phone: insp.phone,
        address: insp.address,
        branch: insp.branch || 'الفرع الرئيسي',
        deliveryDate: insp.scheduledAt || '',
        status: 'المعاينات',
        createdAt: insp.createdAt || new Date().toISOString().split('T')[0],
        totalAmount: 0,
        depositPaid: 0,
        remainingAmount: 0,
        rooms: insp.rooms || [],
      }));

    const combined = [...pipelineOrders, ...quotationMasterItems, ...inspectionMasterItems];
    setOrders(combined);
    saveStoredPipelineOrders(combined);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMasterStageChange = (orderId: string, newStage: GlobalMasterStage) => {
    updatePipelineOrderStatus(orderId, newStage);
    setOrders(prev => prev.map(o => o.id === orderId || o.orderId === orderId ? { ...o, status: newStage } : o));
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف عقد العميل "${name}" (${id}) نهائياً من النظام؟`)) {
      deleteQuotationOrder(id);
      const updated = orders.filter(o => o.id !== id && o.orderId !== id);
      setOrders(updated);
      saveStoredPipelineOrders(updated);
      alert('تم حذف الأوردر بنجاح ✓');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.orderId && o.orderId.toLowerCase().includes(search.toLowerCase())) ||
      (o.branch && o.branch.toLowerCase().includes(search.toLowerCase()));

    const masterStage = normalizeMasterStage(o.status);
    const matchStage = selectedStage === 'الكل' || masterStage === selectedStage;
    const matchBranch = selectedBranch === 'الكل' || o.branch === selectedBranch;

    return matchSearch && matchStage && matchBranch;
  });

  const totalOrdersCount = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + (o.depositPaid || 0), 0);
  const totalRemaining = filteredOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);

  return (
    <PageShell title="سجل أوامر الستائر والعقود المركزية">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="font-black text-xl text-slate-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-2xl">receipt_long</span>
              سجل وربط أوامر الستائر ومراحل وجودها
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              عرض كافة العقود والطلبات، التتبع الشامل للمراحل العامة، والمتابعة الإدارية الفورية والتحديث المباشر.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pipeline/inspections"
              className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-gold cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              طلب معاينة جديد
            </Link>
          </div>
        </div>

        {/* Financial Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
            <span className="text-slate-500 font-bold block">إجمالي العقود والطلبات</span>
            <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{totalOrdersCount} طلب</strong>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
            <span className="text-slate-500 font-bold block">إجمالي القيمة المالية</span>
            <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{totalRevenue.toLocaleString()} ج</strong>
          </div>
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
            <span className="text-emerald-800 font-bold block">المدفوع والعرابين</span>
            <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">{totalPaid.toLocaleString()} ج</strong>
          </div>
          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
            <span className="text-rose-800 font-bold block">المتبقي للتحصيل</span>
            <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalRemaining.toLocaleString()} ج</strong>
          </div>
        </div>

        {/* Search & Master Stage Tabs Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="relative sm:col-span-8">
              <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
              <input
                type="text"
                placeholder="ابحث باسم العميل، رقم الهاتف، الفرع، أو كود الطلب..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="الكل">جميع الفروع</option>
                <option value="الفرع الرئيسي">الفرع الرئيسي</option>
                <option value="فرع عرابي">فرع عرابي</option>
              </select>
            </div>
          </div>

          {/* Official 8 Master Stages Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-bold pl-2">تصفية بالمرحلة العامة:</span>
            {GLOBAL_STAGES.map(stg => {
              const count = stg.key === 'الكل'
                ? orders.length
                : orders.filter(o => normalizeMasterStage(o.status) === stg.key).length;

              return (
                <button
                  key={stg.key}
                  type="button"
                  onClick={() => setSelectedStage(stg.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    selectedStage === stg.key
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-gold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{stg.label}</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-slate-900/10">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders Table & Cards View */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-slate-300 block mb-2">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">لا توجد أوامر ستائر تطابق الفلتر المحدد حالياً</h3>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[850px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">الكود والعميل</th>
                    <th className="p-3.5">الهاتف والعنوان والفرع</th>
                    <th className="p-3.5">التاريخ / موعد الاستلام</th>
                    <th className="p-3.5 font-mono">الإجمالي والمتبقي</th>
                    <th className="p-3.5 text-center">المرحلة العامة للحالة</th>
                    <th className="p-3.5 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const currentStage = normalizeMasterStage(order.status);
                    const stageObj = GLOBAL_STAGES.find(s => s.key === currentStage) || GLOBAL_STAGES[1];

                    return (
                      <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] text-amber-800 font-bold">{order.id}</span>
                            <span className="text-sm text-slate-900">{order.customerName}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700">
                          <div>
                            <div className="font-mono text-slate-800 font-bold" dir="ltr">{order.phone}</div>
                            <div className="text-slate-500 text-[11px]">{order.address} ({order.branch})</div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-800 font-bold">
                          {order.deliveryDate || order.createdAt}
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-slate-900">{(order.totalAmount || 0).toLocaleString()} ج</div>
                          <div className="text-rose-700 text-[11px] font-bold">متبقي: {(order.remainingAmount || 0).toLocaleString()} ج</div>
                        </td>
                        <td className="p-3.5 text-center">
                          {/* Live Stage Modifier Dropdown */}
                          <select
                            value={currentStage}
                            onChange={(e) => handleMasterStageChange(order.id, e.target.value as GlobalMasterStage)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-black border focus:outline-none cursor-pointer shadow-2xs ${stageObj.badgeColor}`}
                          >
                            <option value="المعاينات">1. المعاينات</option>
                            <option value="انتظار تسعير">2. انتظار تسعير</option>
                            <option value="في المقص">3. في المقص</option>
                            <option value="في الورشة">4. في الورشة</option>
                            <option value="تجهيز الاكسسوارات">5. تجهيز الاكسسوارات</option>
                            <option value="جاهز للاستلام">6. جاهز للاستلام</option>
                            <option value="جاهز للتركيب">7. جاهز للتركيب</option>
                            <option value="مكتمل">8. مكتمل</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/pipeline/pricing/${encodeURIComponent(order.id)}`}
                              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              عرض العقد 📋
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDelete(order.id, order.customerName)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                              title="حذف الأوردر"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
