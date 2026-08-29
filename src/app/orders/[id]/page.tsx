'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  getStoredQuotations,
  deleteQuotationOrder,
  updateQuotationFullDetails,
  updateQuotationStageAndStatus,
  QuotationOrder,
  RoomPricing,
} from '@/lib/inspectionsStore';
import { canUserEditPrices } from '@/lib/permissions';

const STAGE_LIST: QuotationOrder['status'][] = [
  'بانتظار التسعير',
  'تم إرسال المقايسة',
  'معتمد ومسدد العربون',
  'تم التحويل للورشة',
  'مكتمل ومسلم',
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || 'QOT-101';
  const orderId = decodeURIComponent(rawId);

  const [order, setOrder] = useState<QuotationOrder | null>(null);

  // Form states for full manager edits
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [branch, setBranch] = useState('الفرع الرئيسي');
  const [status, setStatus] = useState<QuotationOrder['status']>('بانتظار التسعير');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [estimatorName, setEstimatorName] = useState('أحمد كشك');
  const [rooms, setRooms] = useState<RoomPricing[]>([]);

  // Room editing sub-state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const loadData = () => {
    const list = getStoredQuotations();
    const found = list.find(q => q.id.toUpperCase() === orderId.toUpperCase()) || list[0];
    if (found) {
      setOrder(found);
      setCustomerName(found.customerName);
      setPhone(found.phone);
      setAddress(found.address);
      setBranch(found.branch || 'الفرع الرئيسي');
      setStatus(found.status);
      setDeliveryDate(found.deliveryDate || '');
      setDepositPaid(found.depositPaid || 0);
      setEstimatorName(found.estimatorName || 'أحمد كشك');
      setRooms(found.rooms || []);
    }
  };

  useEffect(() => {
    loadData();
  }, [orderId]);

  if (!order) {
    return (
      <PageShell title="تحكم الأوردر العالي">
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-bold">لم يتم العثور على أوردر بهذا الرقم.</p>
          <Link href="/orders" className="mt-4 inline-block bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold">
            ← العودة لسجل الأوامر
          </Link>
        </div>
      </PageShell>
    );
  }

  const handleSaveGeneral = () => {
    const updated = updateQuotationFullDetails(order.id, {
      customerName,
      phone,
      address,
      branch,
      status,
      deliveryDate,
      depositPaid,
      estimatorName,
      rooms,
    });

    if (updated) {
      setOrder(updated);
      loadData();
    }
  };

  const handleStatusChange = (newStatus: QuotationOrder['status']) => {
    setStatus(newStatus);
    updateQuotationStageAndStatus(order.id, newStatus);
    loadData();
  };

  const handleDelete = () => {
    if (confirm('تحذير إداري: هل أنت متأكد تماماً من حذف أوردر العميل "' + customerName + '" (' + order.id + ') نهائياً من النظام؟')) {
      deleteQuotationOrder(order.id);
      router.push('/orders');
    }
  };

  const updateRoomInState = (updatedRm: RoomPricing) => {
    const updatedRooms = rooms.map(r => r.id === updatedRm.id ? updatedRm : r);
    setRooms(updatedRooms);
    setEditingRoomId(null);
  };

  return (
    <PageShell title={'صفحة التحكم الإداري الشامل - أوردر: ' + order.id}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Top Nav & Delete Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              title="العودة لسجل الأوامر"
            >
              ←
            </Link>
            <div>
              <h1 className="font-black text-xl text-indigo-950 flex items-center gap-2">
                أوردر العميل: {customerName}
                <span className="text-xs text-slate-400 font-mono">({order.id})</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              حذف الأوردر نهائياً
            </button>
          </div>
        </div>

        {/* Manager Stage Override Card */}
        <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <h2 className="font-black text-amber-950 text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-600">admin_panel_settings</span>
              تغيير مرحلة وموقع الأوردر استثنائياً (Manager Stage Override):
            </h2>
            <span className="text-xs bg-white text-amber-950 px-2.5 py-0.5 rounded-full font-bold border border-amber-300">
              المرحلة الحالية: {status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            <span className="text-amber-900 font-bold">اختر المرحلة الجديدة لنقل الأوردر إليها مباشرة:</span>
            <div className="flex flex-wrap gap-2">
              {STAGE_LIST.map(stg => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => handleStatusChange(stg)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                    status === stg
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white hover:bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                >
                  {stg}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer & General Order Info Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="font-black text-sm text-slate-900 border-r-4 border-slate-900 pr-2.5">
            بيانات العميل والتوريد ومسؤول المبيعات:
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-600 font-bold block mb-1">اسم العميل الكامل:</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:border-amber-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">رقم الهاتف / الواتساب:</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 font-mono focus:border-amber-500 focus:outline-none bg-slate-50/50"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">عنوان المعاينة والتركيب:</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:border-amber-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">الفرع المسؤول:</label>
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 bg-slate-50/50"
              >
                <option value="الفرع الرئيسي">الفرع الرئيسي</option>
                <option value="فرع القاهرة">فرع القاهرة</option>
                <option value="فرع الجيزة">فرع الجيزة</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">📅 تاريخ الاستلام والتركيب المخطط:</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 bg-amber-50/50 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">مسؤول المبيعات / التسعير:</label>
              <input
                type="text"
                value={estimatorName}
                onChange={e => setEstimatorName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 bg-slate-50/50"
              />
            </div>
          </div>
        </div>

        {/* Financial Adjustments Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="font-black text-sm text-slate-900 border-r-4 border-emerald-500 pr-2.5">
            الحسابات والماليات والعربون المسدد:
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 font-bold block">إجمالي الأوردر بالكامل</span>
              <strong className="text-xl font-mono font-black text-slate-900 mt-1 block">
                {rooms.reduce((s, r) => s + r.totalSellPrice, 0).toLocaleString()} جنيه
              </strong>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-center">
              <span className="text-emerald-800 font-bold block">العربون المسدد والمستلم</span>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <input
                  type="number"
                  value={depositPaid}
                  disabled={!canUserEditPrices('p_orders')}
                  onChange={e => setDepositPaid(Number(e.target.value))}
                  className="w-32 text-center font-mono font-black text-lg bg-white border border-emerald-300 rounded-xl px-2 py-1 text-emerald-950 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  title={!canUserEditPrices('p_orders') ? 'تعديل الأسعار والماليات مغلق للصلاحيات' : ''}
                />
                <span className="font-bold text-emerald-900">جنيه</span>
              </div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 text-center">
              <span className="text-rose-800 font-bold block">المتبقي للتحصيل عند التسليم</span>
              <strong className="text-xl font-mono font-black text-rose-900 mt-1 block">
                {Math.max(0, rooms.reduce((s, r) => s + r.totalSellPrice, 0) - depositPaid).toLocaleString()} جنيه
              </strong>
            </div>
          </div>
        </div>

        {/* Room Specifications & Fabrics Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="font-black text-base text-indigo-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">room_preferences</span>
              مُحرر غرف الستائر والأقمشة ({rooms.length} غرفة):
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {rooms.map(rm => (
              <div key={rm.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-3xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{rm.name}</h3>
                    <span className="text-xs text-slate-500 font-mono">
                      المقاس: {rm.widthCm}×{rm.heightCm} سم ({(rm.widthCm / 100).toFixed(2)}م) • {rm.sides === 2 ? 'جنبين' : 'جنب'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="font-mono font-black text-slate-900 text-sm">
                      {rm.totalSellPrice.toLocaleString()} ج
                    </strong>
                    <button
                      type="button"
                      onClick={() => setEditingRoomId(editingRoomId === rm.id ? null : rm.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white cursor-pointer hover:bg-slate-800"
                    >
                      {editingRoomId === rm.id ? 'إغلاق ✕' : 'تعديل غرف الستارة'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">١. قماش الجوانب</span>
                    <strong>{rm.heavyEnabled !== false ? (rm.heavyFabricName || 'لم يحدد') : '- ملغى -'}</strong>
                    {rm.heavyEnabled !== false && (
                      <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                        شريط {rm.heavyTapeType || '٣ فتلة'} • {rm.heavyMeters}م × {rm.heavyPrice}ج
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">٢. قماش الخلفية (الشيفون)</span>
                    <strong>{rm.sheerEnabled !== false ? (rm.sheerFabricName || 'لم يحدد') : '- ملغى -'}</strong>
                    {rm.sheerEnabled !== false && (
                      <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                        شريط {rm.sheerTapeType || 'ويفي'} • {rm.sheerMeters}م × {rm.sheerPrice}ج
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px]">٣. طبقة البلاك آوت</span>
                    <strong>{rm.blackoutEnabled && rm.blackoutMeters > 0 ? (rm.blackoutFabricName || 'بلاك آوت عازل') : '- غير مفعل -'}</strong>
                    {rm.blackoutEnabled && rm.blackoutMeters > 0 && (
                      <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                        شريط {rm.blackoutTapeType || 'جراب'} • {rm.blackoutMeters}م × {rm.blackoutPrice}ج
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Editor Panel for Room Specs */}
                {editingRoomId === rm.id && (
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-300 space-y-3 text-xs pt-3">
                    <h4 className="font-black text-amber-950 border-b border-amber-200 pb-1.5">
                      تعديل مقاسات وأسعار وقماش الستارة ({rm.name}):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">عرض الحائط (سم):</label>
                        <input
                          type="number"
                          value={rm.widthCm}
                          onChange={e => {
                            const w = Number(e.target.value);
                            updateRoomInState({
                              ...rm,
                              widthCm: w,
                              heavyMeters: Math.round((w / 100) * (rm.heavyMultiplier || 2.0) * 100) / 100,
                              sheerMeters: Math.round((w / 100) * (rm.sheerMultiplier || 2.5) * 100) / 100,
                            });
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">الارتفاع (سم):</label>
                        <input
                          type="number"
                          value={rm.heightCm}
                          onChange={e => updateRoomInState({ ...rm, heightCm: Number(e.target.value) })}
                          className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">طريقة التركيب:</label>
                        <select
                          value={rm.installationCategory || 'تراك'}
                          onChange={e => updateRoomInState({ ...rm, installationCategory: e.target.value as any })}
                          className="w-full border border-slate-300 rounded-lg p-2 font-bold bg-white"
                        >
                          <option value="تراك">تراك (مجرى ألومنيوم 100ج)</option>
                          <option value="مواسير فورجيه">مواسير فورجيه (65ج)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                      <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-amber-200 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={rm.installFeeEnabled !== false}
                          onChange={e => updateRoomInState({
                            ...rm,
                            installFeeEnabled: e.target.checked,
                            installFee: e.target.checked ? (rm.installFee || 125) : 0,
                          })}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>رسوم التركيب للغرفة ({rm.installFeeEnabled !== false ? rm.installFee : 0}ج)</span>
                      </label>

                      <label className="flex items-center gap-2 bg-white p-2 rounded-lg border border-amber-200 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={!!rm.transportFeeEnabled}
                          onChange={e => updateRoomInState({
                            ...rm,
                            transportFeeEnabled: e.target.checked,
                            transportFee: e.target.checked ? (rm.transportFee || 0) : 0,
                          })}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>رسوم نقل المحافظات ({rm.transportFeeEnabled ? (rm.transportFee || 0) : 0}ج)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Global Save Action Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex justify-end gap-3">
          <button
            type="button"
            onClick={handleSaveGeneral}
            className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-8 py-3 rounded-xl font-black text-sm shadow-gold cursor-pointer transition-all"
          >
            حفظ كافة التعديلات الإدارية وتحديث الأوردر ✓
          </button>
        </div>
      </div>
    </PageShell>
  );
}
