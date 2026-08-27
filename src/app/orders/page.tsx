'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import {
  getStoredQuotations,
  deleteQuotationOrder,
  QuotationOrder,
  updateQuotationStageAndStatus
} from '@/lib/inspectionsStore';

const STAGE_OPTIONS = [
  'الكل',
  'المعاينات',
  'تم ارسال المعاينات',
  'بانتظار التسعير',
  'معتمد و مسدد العربون',
  'تم التحويل الى الورشه',
  'جاهز للستليم',
  'تم التسليم',
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<QuotationOrder[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('الكل');
  const [selectedBranch, setSelectedBranch] = useState('الكل');

  const loadData = () => {
    const list = getStoredQuotations();
    setOrders(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف أوردر العميل "${name}" (${id}) نهائياً من النظام؟`)) {
      deleteQuotationOrder(id);
      loadData();
      alert('تم حذف الأوردر بنجاح ✓');
    }
  };

  const handleStageChange = (id: string, newStage: any) => {
    updateQuotationStageAndStatus(id, newStage);
    loadData();
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.inspectionId.toLowerCase().includes(search.toLowerCase()) ||
      (o.branch && o.branch.toLowerCase().includes(search.toLowerCase()));

    const matchStage = selectedStage === 'الكل' || o.status === selectedStage;
    const matchBranch = selectedBranch === 'الكل' || o.branch === selectedBranch;

    return matchSearch && matchStage && matchBranch;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + o.depositPaid, 0);
  const totalRemaining = filteredOrders.reduce((sum, o) => sum + o.remainingAmount, 0);

  return (
    <PageShell title="سجل أوامر الستائر والعقود المركزية">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="font-black text-xl text-indigo-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-2xl">receipt_long</span>
              سجل وربط أوامر الستائر ومراحل وجودها
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              عرض كافة العقود والطلبات، متابعة أماكنها الحالية، والتحكم الشامل والإداري بالتعديل والحذف وتغيير المراحل.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pipeline/inspections"
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">add</span>
              طلب معاينة جديد
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
            <span className="text-slate-500 font-bold block">إجمالي الأوامر</span>
            <strong className="text-xl font-black text-slate-900 mt-1 block">{filteredOrders.length} طلب</strong>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
            <span className="text-slate-500 font-bold block">إجمالي القيمة المالية</span>
            <strong className="text-xl font-black text-slate-900 mt-1 block">{totalRevenue.toLocaleString()} ج</strong>
          </div>
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
            <span className="text-emerald-800 font-bold block">المحصل (العرابين)</span>
            <strong className="text-xl font-black text-emerald-950 mt-1 block">{totalPaid.toLocaleString()} ج</strong>
          </div>
          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
            <span className="text-rose-800 font-bold block">المتبقي للتحصيل</span>
            <strong className="text-xl font-black text-rose-950 mt-1 block">{totalRemaining.toLocaleString()} ج</strong>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
              <input
                type="text"
                placeholder="ابحث باسم العميل، الهاتف، الفرع، أو رقم العقد/المعاينة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none"
              >
                <option value="الكل">جميع الفروع</option>
                <option value="الفرع الرئيسي">الفرع الرئيسي</option>
                <option value="فرع القاهرة">فرع القاهرة</option>
                <option value="فرع الجيزة">فرع الجيزة</option>
              </select>
            </div>
          </div>

          {/* Stage Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-bold pl-2">تصفية بالمرحلة:</span>
            {STAGE_OPTIONS.map(stg => (
              <button
                key={stg}
                type="button"
                onClick={() => setSelectedStage(stg)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                  selectedStage === stg
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {stg}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200 border-t border-t-slate-100">
                <tr>
                  <th className="p-3.5 pr-4">العميل والفرع</th>
                  <th className="p-3.5">موقع الأوردر / المرحلة الحالية</th>
                  <th className="p-3.5">الغرف والستائر</th>
                  <th className="p-3.5">تاريخ الاستلام والتركيب</th>
                  <th className="p-3.5">الحسابات والعرابين</th>
                  <th className="p-3.5 text-center pl-4">التحكم والتعديل الإداري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      لا توجد أوامر مطابقة لخيارات البحث والتصفية الحالية.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Customer Info */}
                      <td className="p-3.5 pr-4 align-top">
                        <div className="flex flex-col gap-0.5">
                          <Link href={`/orders/${order.id}`} className="font-black text-sm text-indigo-950 hover:text-amber-600 transition-colors">
                            {order.customerName}
                          </Link>
                          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                            <span dir="ltr">{order.phone}</span>
                            <a
                              href={`https://wa.me/2${order.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded"
                              title="مراسلة واتساب"
                            >
                              💬 واتساب
                            </a>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {order.branch || 'الفرع الرئيسي'} • {order.address}
                          </span>
                        </div>
                      </td>

                      {/* Current Stage & Manager Quick Override */}
                      <td className="p-3.5 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border text-center whitespace-nowrap ${
                            order.status === 'معتمد ومسدد العربون' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.status === 'تم إرسال المقايسة' ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : order.status === 'تم التحويل للورشة' ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : order.status === 'مكتمل ومسلم' ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {order.status}
                          </span>

                          {/* Quick Stage Selector */}
                          <select
                            value={order.status}
                            onChange={e => handleStageChange(order.id, e.target.value)}
                            className="text-[10px] border border-slate-300 rounded-lg p-1 bg-white font-bold text-slate-700 cursor-pointer focus:border-amber-500"
                            title="تغيير مرحلة الأوردر استثنائياً"
                          >
                            <option value="المعاينات">مرحلة 1: المعاينات</option>
                            <option value="تم ارسال المعاينات">مرحلة 2: تم ارسال المعاينات</option>
                            <option value="بانتظار التسعير">مرحلة 3: بانتظار التسعير</option>
                            <option value="معتمد و مسدد العربون">مرحلة 4: معتمد و مسدد العربون</option>
                            <option value="تم التحويل الى الورشه">مرحلة 5: تم التحويل الى الورشه</option>
                            <option value="جاهز للستليم">مرحلة 6: جاهز للستليم</option>
                            <option value="تم التسليم">مرحلة 7: تم التسليم</option>
                          </select>
                        </div>
                      </td>

                      {/* Rooms Count & Specs */}
                      <td className="p-3.5 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900">{order.rooms.length} غرفة مسجلة</span>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {order.rooms.map((rm, idx) => (
                              <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                {rm.name} ({rm.widthCm}×{rm.heightCm})
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Delivery Date */}
                      <td className="p-3.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          {order.deliveryDate ? (
                            <strong className="text-amber-900 font-mono text-xs block">
                              📅 {order.deliveryDate}
                            </strong>
                          ) : (
                            <span className="text-slate-400 text-[11px]">لم يحدد تاريخ استلام</span>
                          )}
                          <span className="text-[10px] text-slate-400 block font-mono">تاريخ العقد: {order.date}</span>
                        </div>
                      </td>

                      {/* Financials Breakdown */}
                      <td className="p-3.5 align-top font-mono">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between gap-2 text-xs">
                            <span className="text-slate-500">الإجمالي:</span>
                            <strong className="text-slate-900">{order.totalAmount.toLocaleString()} ج</strong>
                          </div>
                          <div className="flex justify-between gap-2 text-[11px] text-emerald-800">
                            <span>العربون:</span>
                            <strong>{order.depositPaid.toLocaleString()} ج</strong>
                          </div>
                          <div className="flex justify-between gap-2 text-[11px] text-rose-800 pt-0.5 border-t border-slate-100">
                            <span>المتبقي:</span>
                            <strong className="font-black">{order.remainingAmount.toLocaleString()} ج</strong>
                          </div>
                        </div>
                      </td>

                      {/* Manager Controls */}
                      <td className="p-3.5 pl-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/orders/${order.id}`}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                            title="فتح الصفحة وتعديل كافة تفاصيل الأوردر"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            تعديل وتحكم
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(order.id, order.customerName)}
                            className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="حذف الأوردر نهائياً من النظام"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
