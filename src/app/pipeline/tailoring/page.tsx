'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { getStoredPipelineOrders, fetchPipelineOrders, updatePipelineOrderStatus, saveStoredPipelineOrders } from '@/lib/pipelineStore';
import { fetchQuotations } from '@/lib/inspectionsStore';
import { formatDateOnly } from '@/lib/dateUtils';
import TailoringPrintModal from '@/components/TailoringPrintModal';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';

interface RoomTailoringDetail {
  roomName: string;
  heavyFabric?: {
    name: string;
    code: string;
    meters: number;
    pieces?: string;
    tapeType?: string;
    netHeight?: string;
  };
  sheerFabric?: {
    name: string;
    code: string;
    meters: number;
    pieces?: string;
    tapeType?: string;
    netHeight?: string;
    hasLining?: boolean;             // #13 يجب أن يعرف الخياط لو فيه بطانة
    liningPricePerMeter?: number;
  };
  blackoutFabric?: {
    name: string;
    code: string;
    meters: number;
    pieces?: string;
    tapeType?: string;
    netHeight?: string;
  };
}

interface TailoringJobOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  deliveryDate: string;
  tailorName: string;
  rooms: RoomTailoringDetail[];
  status: string;
  localStatus?: string;
  notes: string;
  createdAt: string;
}

const initialTailoringOrders: TailoringJobOrder[] = [];

export default function PipelineTailoringPage() {
  const [orders, setOrders] = useState<TailoringJobOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'SEWING' | 'IRONING' | 'HISTORY'>('SEWING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Selected Order for Detail View & Editable Heights Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<TailoringJobOrder | null>(null);
  const [printTailoringOrder, setPrintTailoringOrder] = useState<TailoringJobOrder | null>(null);

  useEffect(() => {
    async function load() {
      const [storedPipeline, quotations] = await Promise.all([
        fetchPipelineOrders(),
        fetchQuotations(),
      ]);

      const pipelineList = storedPipeline || [];
      const mappedQuotations: TailoringJobOrder[] = (quotations || [])
        .filter(q => q.status === 'في الورشة' && !pipelineList.some(p => p.orderId === q.id || p.id === q.id || p.id === `ORD-${q.id}` || (p.customerName && q.customerName && p.customerName.trim() === q.customerName.trim())))
        .map((q: any) => ({
          id: `ORD-${q.id}`,
          orderId: q.id,
          customerName: q.customerName || 'عميل',
          phone: q.phone || '',
          address: q.address || '',
          branch: q.branch || 'الفرع الرئيسي',
          deliveryDate: q.deliveryDate || '',
          tailorName: '',
          rooms: (q.rooms || []).map((r: any, idx: number) => ({
            roomName: r.name || `غرفة ${idx + 1}`,
            heavyFabric: (r.heavyEnabled !== false && (Number(r.heavyMeters) > 0 || r.heavyFabricName)) ? {
              name: r.heavyFabricName || 'قماش ثقيل',
              code: r.heavyFabricCode || 'HV-101',
              meters: Number(r.heavyMeters) || 0,
              tapeType: r.heavyTapeType || '٣ فتلة',
              netHeight: String(r.heightCm || 280),
            } : undefined,
            sheerFabric: (r.sheerEnabled !== false && (Number(r.sheerMeters) > 0 || r.sheerFabricName)) ? {
              name: r.sheerFabricName || 'شيفون',
              code: r.sheerFabricCode || 'SH-101',
              meters: Number(r.sheerMeters) || 0,
              pieces: r.sheerPieces || 'قطعة واحدة',
              tapeType: r.sheerTapeType || 'ويفي',
              netHeight: String(r.heightCm || 280),
              hasLining: !!(r.sheerLiningEnabled),
              liningPricePerMeter: r.sheerLiningPricePerMeter || 0,
            } : undefined,
            blackoutFabric: (r.blackoutEnabled && (Number(r.blackoutMeters) > 0 || r.blackoutFabricName)) ? {
              name: r.blackoutFabricName || 'بلاك آوت',
              code: r.blackoutFabricCode || 'BK-301',
              meters: Number(r.blackoutMeters) || 0,
              tapeType: r.blackoutTapeType || 'جراب',
              netHeight: String(r.heightCm || 280),
            } : undefined,
          })),
          status: 'في الورشة',
          localStatus: 'جاري الخياطة',
          notes: '',
          createdAt: q.date || new Date().toISOString().split('T')[0],
        }));

      const combined = [...pipelineList, ...mappedQuotations];
      setOrders(combined as any);
    }
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const isSewing = (o: any) => {
    if (!o) return false;
    const s = (o.status || '').trim();
    const ls = (o.localStatus || '').trim();
    return (s === 'في الورشة' || s === 'تم القص وجاهز للخياطة') && (!ls || ls === 'جاري الخياطة' || ls === 'بانتظار القص' || ls === 'بانتظار الخياطة');
  };

  const isIroning = (o: any) => {
    if (!o) return false;
    const s = (o.status || '').trim();
    const ls = (o.localStatus || '').trim();
    return ls === 'جاري الكي' || ls === 'تمت الخياطة' || (s === 'في الورشة' && ls.includes('كي'));
  };

  const isHistory = (o: any) => {
    if (!o) return false;
    const s = (o.status || '').trim();
    const ls = (o.localStatus || '').trim();
    return (
      s === 'تجهيز الاكسسوارات' ||
      s === 'جاهز للاستلام' ||
      s === 'جاهز للتركيب' ||
      s === 'في التسليمات' ||
      s === 'في التركيبات' ||
      s === 'مكتمل' ||
      ls.includes('اكسسوار') ||
      ls.includes('تسليم') ||
      ls.includes('تركيب') ||
      ls.includes('مكتمل') ||
      ls === 'تم الكي وجاهز للاكسسوارات' ||
      ls === 'تم التجهيز'
    );
  };

  const tabFiltered = orders.filter(o => {
    if (activeTab === 'SEWING') return isSewing(o);
    if (activeTab === 'IRONING') return isIroning(o);
    return isHistory(o);
  });

  const filtered = tabFiltered.filter(o => {
    const name = o.customerName || '';
    const id = o.id || '';
    const orderId = (o as any).orderId || '';
    const phone = o.phone || '';
    const tailor = o.tailorName || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      tailor.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch =
      selectedBranch === 'ALL' ||
      (o.branch && o.branch.includes(selectedBranch)) ||
      (!o.branch && selectedBranch === 'الفرع الرئيسي');

    return matchesSearch && matchesBranch;
  });

  const updateOrderStatus = async (id: string, newStatus: string, localStatus?: string) => {
    const updated = orders.map(o => o.id === id ? { ...o, status: newStatus, localStatus } : o);
    setOrders(updated);
    await updatePipelineOrderStatus(id, newStatus, localStatus);
    if (selectedOrderDetails?.id === id) {
      setSelectedOrderDetails(null);
    }
  };

  const handleHeightChange = (orderId: string, roomIdx: number, layer: 'heavy' | 'sheer' | 'blackout', newHeight: string) => {
    const updated = orders.map(o => {
      if (o.id !== orderId) return o;
      const updatedRooms = [...o.rooms];
      const room = { ...updatedRooms[roomIdx] };

      if (layer === 'heavy' && room.heavyFabric) {
        room.heavyFabric = { ...room.heavyFabric, netHeight: newHeight };
      } else if (layer === 'sheer' && room.sheerFabric) {
        room.sheerFabric = { ...room.sheerFabric, netHeight: newHeight };
      } else if (layer === 'blackout' && room.blackoutFabric) {
        room.blackoutFabric = { ...room.blackoutFabric, netHeight: newHeight };
      }

      updatedRooms[roomIdx] = room;
      return { ...o, rooms: updatedRooms };
    });

    setOrders(updated);
    saveStoredPipelineOrders(updated as any);

    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      const target = updated.find(o => o.id === orderId);
      if (target) setSelectedOrderDetails(target);
    }
  };

  // Dynamic Total Meters Calculation
  const calculateTotalMeters = (rooms: RoomTailoringDetail[]) => {
    let heavy = 0;
    let sheer = 0;
    let blackout = 0;

    (rooms || []).forEach(r => {
      if (r.heavyFabric) heavy += Number(r.heavyFabric.meters || 0);
      if (r.sheerFabric) sheer += Number(r.sheerFabric.meters || 0);
      if (r.blackoutFabric) blackout += Number(r.blackoutFabric.meters || 0);
    });

    return {
      heavy: Math.round(heavy * 100) / 100,
      sheer: Math.round(sheer * 100) / 100,
      blackout: Math.round(blackout * 100) / 100,
      total: Math.round((heavy + sheer + blackout) * 100) / 100,
    };
  };

  const sewingCount = orders.filter(isSewing).length;
  const ironingCount = orders.filter(isIroning).length;
  const historyCount = orders.filter(isHistory).length;

  return (
    <PageShell title="4. الورشة" badge="4">
      <div className="flex flex-col gap-5">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SEWING')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SEWING' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>🧵 جاري الخياطة</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{sewingCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IRONING')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'IRONING' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>🧺 جاري الكي</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{ironingCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'HISTORY' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>📜 السجل</span>
            <span className="bg-slate-100 text-slate-600 px-2 rounded-full text-[11px] font-mono font-bold">{historyCount}</span>
          </button>
        </div>

        {/* Search & Branch Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-8">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العميل، رقم الهاتف أو اسم الخياط..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-2xs"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs cursor-pointer"
            >
              <option value="ALL">عوامل تصفية: جميع الفروع</option>
              <option value="الفرع الرئيسي">الفرع الرئيسي</option>
              <option value="فرع عرابي">فرع عرابي</option>
            </select>
          </div>
        </div>

        {/* Simple 1-Line Table View for Orders */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'SEWING' ? 'لا توجد أوامر خياطة جارية' : activeTab === 'IRONING' ? 'لا توجد أوردرات بانتظار الكي' : 'السجل فارغ'}
            </h3>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[750px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">اسم العميل</th>
                    <th className="p-3.5">الهاتف والعنوان</th>
                    <th className="p-3.5">الفرع والخياط</th>
                    <th className="p-3.5">تاريخ الاستلام</th>
                    <th className="p-3.5 text-center font-mono">إجمالي الأمتار والقطع</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الإجراء السريع</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => {
                    const totals = calculateTotalMeters(order.rooms);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderDetails(order)}
                        className="border-t border-slate-100 hover:bg-amber-50/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="text-sm font-black text-indigo-950">{order.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">اضغط لفتح التفاصيل والارتفاعات 📋</div>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <div className="font-mono text-slate-800 font-bold" dir="ltr">{order.phone}</div>
                          <div className="text-slate-500 text-[11px] truncate max-w-[200px]">{order.address}</div>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          <div className="font-bold text-slate-900">{order.branch}</div>
                          <div className="text-slate-500 text-[11px]">الخياط: {order.tailorName || 'أبو فهد'}</div>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-rose-800">
                          {order.deliveryDate || 'غير محدد'}
                        </td>

                        <td className="p-3.5 text-center font-mono">
                          <span className="font-bold bg-amber-100/80 text-amber-950 px-2.5 py-1 rounded-lg text-xs inline-block">
                            {totals.total} متر ({order.rooms?.length || 0} غرف)
                          </span>
                        </td>

                        <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <a
                            href={`https://wa.me/2${order.phone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold border border-emerald-200 transition-colors inline-block"
                          >
                            💬 واتساب
                          </a>
                        </td>

                        <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                          {activeTab === 'SEWING' && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'في الورشة', 'جاري الكي')}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                            >
                              تمت الخياطة وتحويل للكي ←
                            </button>
                          )}

                          {activeTab === 'IRONING' && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'تجهيز الاكسسوارات', 'جاري تجهيز الإكسسوارات')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                            >
                              تم الكي والتحويل للإكسسوارات / التسليم ✓
                            </button>
                          )}

                          {activeTab === 'HISTORY' && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              {order.status}
                            </span>
                          )}
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

      {/* 🔍 Full Order Details & Editable Heights & Printable Worksheet Modal */}
      {selectedOrderDetails && (
        <div className="modal-overlay fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <style>{`
            @media print {
              @page {
                size: A5 portrait;
                margin: 4mm 5mm;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-tailoring-worksheet,
              #printable-tailoring-worksheet * {
                visibility: visible !important;
              }
              #printable-tailoring-worksheet {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                background: #ffffff !important;
                color: #000000 !important;
                box-shadow: none !important;
                border: none !important;
                font-size: 11pt !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div id="printable-tailoring-worksheet" className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            {/* Control Header (Hidden on Print) */}
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">تفاصيل تفصيل الورشة وتعديل الارتفاعات</h3>
              <div className="flex items-center gap-2">
                <WhatsAppShareButton
                  title="أمر تفصيل ورشة الستائر"
                  customerName={selectedOrderDetails.customerName}
                  phone={selectedOrderDetails.phone}
                  detailsText={`أمر تفصيل الورشة: ${selectedOrderDetails.orderId || selectedOrderDetails.id}\nالعميل: ${selectedOrderDetails.customerName}\nتاريخ الاستلام: ${selectedOrderDetails.deliveryDate || 'غير محدد'}\nعدد الغرف: ${selectedOrderDetails.rooms?.length || 0}`}
                  targetElementId="printable-tailoring-worksheet"
                />
                <button
                  type="button"
                  onClick={() => setPrintTailoringOrder(selectedOrderDetails)}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  طباعة (A5)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-900">
              <div>
                <h2 className="font-display font-black text-xl text-slate-950">مؤسسة أحمد كشك للأقمشة والستائر</h2>
                <p className="text-xs font-bold text-amber-800">أمر ورقة الورشة والتفصيل (للخياط والورشة)</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>التاريخ:</strong> {selectedOrderDetails.createdAt ? formatDateOnly(selectedOrderDetails.createdAt) : 'غير محدد'}</div>
                <div><strong>موعد الاستلام:</strong> {selectedOrderDetails.deliveryDate ? formatDateOnly(selectedOrderDetails.deliveryDate) : 'غير محدد'}</div>
              </div>
            </div>

            {/* Customer Information Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div><strong>اسم العميل:</strong> {selectedOrderDetails.customerName}</div>
              <div><strong>رقم الهاتف:</strong> {selectedOrderDetails.phone}</div>
              <div className="text-rose-900 font-bold"><strong>📅 موعد الاستلام:</strong> {selectedOrderDetails.deliveryDate}</div>
              <div><strong>العنوان:</strong> {selectedOrderDetails.address}</div>
              <div><strong>الفرع:</strong> {selectedOrderDetails.branch}</div>
              <div><strong>مسؤول الخياطة:</strong> {selectedOrderDetails.tailorName || 'أبو فهد الخياط'}</div>
            </div>

            {/* Room-by-Room Specs with Editable Heights */}
            <div className="space-y-4">
              <h3 className="font-black text-sm text-slate-950 border-b border-slate-300 pb-1">
                🧵 تفاصيل الخياطة وتعديل الارتفاعات الصافية (تُحفظ فوراً ✏️):
              </h3>

              {(selectedOrderDetails.rooms || []).map((room, rIdx) => (
                <div key={rIdx} className="border-2 border-slate-300 rounded-2xl p-4 space-y-3 bg-slate-50/40">
                  <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex justify-between items-center">
                    <span>{room.roomName}</span>
                    <span className="text-[11px] text-amber-400">تعليمات القص والتفصيل</span>
                  </div>

                  <table className="w-full text-right text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border border-slate-300">الصنف / الطبقة</th>
                        <th className="p-2 border border-slate-300">الكمية والقطع</th>
                        <th className="p-2 border border-slate-300">نوع الشريط والتشطيب</th>
                        <th className="p-2 border border-slate-300 text-center w-36">الارتفاع الصافي (قابل للتعديل ✏️)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Heavy Layer */}
                      {room.heavyFabric && (
                        <tr className="border-b border-slate-200 bg-amber-50/40">
                          <td className="p-2 border border-slate-300 font-bold">
                            قطيفة / ثقيل ({room.heavyFabric.name})
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-amber-900">
                            {room.heavyFabric.meters} متر ({room.heavyFabric.pieces || 'جنبين'})
                          </td>
                          <td className="p-2 border border-slate-300 font-bold text-slate-800">
                            {room.heavyFabric.tapeType || 'شريط 3 فتلة (معامل ×2)'}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            <div className="no-print inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={room.heavyFabric.netHeight || '280 سم'}
                                onChange={(e) => handleHeightChange(selectedOrderDetails.id, rIdx, 'heavy', e.target.value)}
                                className="w-24 bg-white border border-amber-300 rounded-lg px-2 py-1 text-center font-mono font-black text-xs text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              />
                            </div>
                            <span className="print-only font-black text-sm text-slate-950">
                              {room.heavyFabric.netHeight || '280 سم'}
                            </span>
                          </td>
                        </tr>
                      )}

                      {/* Sheer Layer */}
                      {room.sheerFabric && (
                        <tr className="border-b border-slate-200 bg-blue-50/40">
                          <td className="p-2 border border-slate-300 font-bold">
                            خلفية شيفون / تول ({room.sheerFabric.name})
                            {room.sheerFabric.hasLining && (
                              <div className="mt-1 inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 border-2 border-blue-400 rounded-lg px-2 py-1 text-xs font-black">
                                🧵 مطلوب بطانة شيفون ({room.sheerFabric.meters} متر × {room.sheerFabric.liningPricePerMeter || 100} ج/م)
                              </div>
                            )}
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-blue-900">
                            {room.sheerFabric.meters} متر ({room.sheerFabric.pieces || 'قطعة واحدة'})
                            {room.sheerFabric.hasLining && (
                              <div className="text-[10px] font-bold text-blue-700 mt-0.5">+ بطانة {room.sheerFabric.meters}م</div>
                            )}
                          </td>
                          <td className="p-2 border border-slate-300 font-bold text-slate-800">
                            {room.sheerFabric.tapeType || 'شريط ويفي (معامل ×2.5)'}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            <div className="no-print inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={room.sheerFabric.netHeight || '278 سم'}
                                onChange={(e) => handleHeightChange(selectedOrderDetails.id, rIdx, 'sheer', e.target.value)}
                                className="w-24 bg-white border border-blue-300 rounded-lg px-2 py-1 text-center font-mono font-black text-xs text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                              />
                            </div>
                            <span className="print-only font-black text-sm text-slate-950">
                              {room.sheerFabric.netHeight || '278 سم'}
                            </span>
                          </td>
                        </tr>
                      )}

                      {/* Blackout Layer */}
                      {room.blackoutFabric && (
                        <tr className="border-b border-slate-200 bg-slate-100">
                          <td className="p-2 border border-slate-300 font-bold">
                            بلاك آوت عازل ({room.blackoutFabric.name})
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold">
                            {room.blackoutFabric.meters} متر ({room.blackoutFabric.pieces || 'قطعة واحدة'})
                          </td>
                          <td className="p-2 border border-slate-300 font-bold text-slate-800">
                            {room.blackoutFabric.tapeType || 'شريط كشكشة عريض'}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono">
                            <div className="no-print inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={room.blackoutFabric.netHeight || '275 سم'}
                                onChange={(e) => handleHeightChange(selectedOrderDetails.id, rIdx, 'blackout', e.target.value)}
                                className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-black text-xs text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-2xs"
                              />
                            </div>
                            <span className="print-only font-black text-sm text-slate-950">
                              {room.blackoutFabric.netHeight || '275 سم'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Dynamic Total Meters Summary Card */}
            {(() => {
              const totals = calculateTotalMeters(selectedOrderDetails.rooms);
              return (
                <div className="bg-amber-50/80 border border-amber-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-700">straighten</span>
                    إجمالي الأمتار المجمعة للطلب:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 font-mono font-bold">
                    <span className="bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-300">
                      ثقيل: {totals.heavy} متر
                    </span>
                    <span className="bg-blue-200/80 text-blue-950 px-2.5 py-1 rounded-lg border border-blue-300">
                      شيفون/تول: {totals.sheer} متر
                    </span>
                    {totals.blackout > 0 && (
                      <span className="bg-slate-200 text-slate-950 px-2.5 py-1 rounded-lg border border-slate-300">
                        بلاك آوت: {totals.blackout} متر
                      </span>
                    )}
                    <span className="bg-slate-900 text-amber-400 px-3 py-1 rounded-lg font-black text-sm shadow-2xs">
                      المجموع الكلي: {totals.total} متر
                    </span>
                  </div>
                </div>
              );
            })()}

            {selectedOrderDetails.notes && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs">
                <strong>📝 ملاحظات فنية للخياط:</strong> {selectedOrderDetails.notes}
              </div>
            )}

            {/* Action Footer in Modal */}
            <div className="no-print pt-3 border-t border-slate-200 flex justify-between items-center gap-2">
              {activeTab === 'SEWING' && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(selectedOrderDetails.id, 'في الورشة', 'جاري الكي')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                >
                  تمت الخياطة وتحويل للكي ←
                </button>
              )}

              {activeTab === 'IRONING' && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(selectedOrderDetails.id, 'تجهيز الاكسسوارات', 'جاري تجهيز الإكسسوارات')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                >
                  تم الكي والتحويل للإكسسوارات / التسليم ✓
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🖨️ Tailoring Worksheet Print Modal */}
      <TailoringPrintModal
        isOpen={!!printTailoringOrder}
        onClose={() => setPrintTailoringOrder(null)}
        data={printTailoringOrder}
      />
    </PageShell>
  );
}
