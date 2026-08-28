'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { getStoredPipelineOrders, updatePipelineOrderStatus, saveStoredPipelineOrders } from '@/lib/pipelineStore';

interface RoomTailoringDetail {
  roomName: string;
  heavyFabric?: {
    name: string;
    code: string;
    meters: number;
    pieces: 'جنبين' | 'جنب واحد';
    tapeType: string;
    netHeight: string;
  };
  sheerFabric?: {
    name: string;
    code: string;
    meters: number;
    pieces: 'قطعة واحدة' | 'قطعتين';
    tapeType: string;
    netHeight: string;
  };
  blackoutFabric?: {
    name: string;
    code: string;
    meters: number;
    pieces: 'قطعة واحدة' | 'قطعتين' | 'جنبين';
    tapeType: string;
    netHeight: string;
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

const initialTailoringOrders: TailoringJobOrder[] = [
  {
    id: 'TLR-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    branch: 'الفرع الرئيسي',
    deliveryDate: '2026-09-05',
    tailorName: 'عم مصطفى الخياط',
    status: 'في الورشة',
    localStatus: 'جاري الخياطة',
    notes: 'تأكيد ثني الذيل 12 سم وثني الأجناب 3 سم واستخدام الفازلين الممتاز',
    createdAt: '2026-08-28',
    rooms: [
      {
        roomName: 'غرفة (1) - الصالة الرئيسية',
        heavyFabric: {
          name: 'قطيفة تركي ثقيل',
          code: 'V-990',
          meters: 6.00,
          pieces: 'جنبين',
          tapeType: 'شريط كشكشة 3 فتلة',
          netHeight: '280 سم',
        },
        sheerFabric: {
          name: 'خلفية شيفون مطرز',
          code: 'SH-40',
          meters: 6.00,
          pieces: 'قطعة واحدة',
          tapeType: 'شريط ويفي 8سم',
          netHeight: '278 سم',
        },
        blackoutFabric: {
          name: 'بلاك آوت عازل',
          code: 'BL-101',
          meters: 3.50,
          pieces: 'قطعة واحدة',
          tapeType: 'شريط كشكشة عريض',
          netHeight: '275 سم',
        },
      },
      {
        roomName: 'غرفة (2) - غرفة النوم الرئيسية',
        heavyFabric: {
          name: 'قطيفة تركي ثقيل',
          code: 'V-990',
          meters: 4.50,
          pieces: 'جنبين',
          tapeType: 'حلقات كبس مذهبة',
          netHeight: '265 سم',
        },
        sheerFabric: {
          name: 'تول خفيف مطرز',
          code: 'T-402',
          meters: 5.00,
          pieces: 'قطعة واحدة',
          tapeType: 'شريط ويفي 8سم',
          netHeight: '263 سم',
        },
      },
    ],
  },
  {
    id: 'TLR-102',
    orderId: 'ORD-002',
    customerName: 'د. سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، بيفرلي هيلز',
    branch: 'فرع عرابي',
    deliveryDate: '2026-09-08',
    tailorName: 'الأسطى إبراهيم',
    status: 'في الورشة',
    localStatus: 'جاري الخياطة',
    notes: 'ملاحظة: تجميع شريط الويفي معامل 2.5',
    createdAt: '2026-08-27',
    rooms: [
      {
        roomName: 'غرفة المعيشة',
        heavyFabric: {
          name: 'كتان هازل بني',
          code: 'LN-77',
          meters: 12.00,
          pieces: 'جنبين',
          tapeType: 'شريط ويفي 8سم',
          netHeight: '290 سم',
        },
        sheerFabric: {
          name: 'تول ويفي أبيض',
          code: 'TW-10',
          meters: 12.00,
          pieces: 'قطعتين',
          tapeType: 'شريط ويفي 8سم',
          netHeight: '288 سم',
        },
      },
    ],
  },
];

export default function PipelineTailoringPage() {
  const [orders, setOrders] = useState<TailoringJobOrder[]>(initialTailoringOrders);
  const [activeTab, setActiveTab] = useState<'SEWING' | 'IRONING' | 'HISTORY'>('SEWING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedOrderForWorksheet, setSelectedOrderForWorksheet] = useState<TailoringJobOrder | null>(null);

  useEffect(() => {
    const stored = getStoredPipelineOrders();
    if (stored && stored.length > 0) {
      setOrders(stored as any);
    }
  }, []);

  const isSewing = (o: any) => o.status === 'في الورشة' && (!o.localStatus || o.localStatus === 'جاري الخياطة' || o.localStatus === 'بانتظار القص');
  const isIroning = (o: any) => o.status === 'في الورشة' && (o.localStatus === 'جاري الكي' || o.localStatus === 'تمت الخياطة');
  const isHistory = (o: any) => o.status !== 'في الورشة' && o.status !== 'في المقص' && o.status !== 'المعاينات' && o.status !== 'انتظار تسعير';

  const tabFiltered = orders.filter(o => {
    if (activeTab === 'SEWING') return isSewing(o);
    if (activeTab === 'IRONING') return isIroning(o);
    return isHistory(o);
  });

  const filtered = tabFiltered.filter(o => {
    const matchesSearch = o.customerName.includes(searchQuery) || o.id.includes(searchQuery) || (o as any).orderId?.includes(searchQuery);
    const matchesBranch = selectedBranch === 'ALL' || o.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const updateOrderStatus = (id: string, newStatus: string, localStatus?: string) => {
    const updated = orders.map(o => o.id === id ? { ...o, status: newStatus, localStatus } : o);
    setOrders(updated);
    updatePipelineOrderStatus(id, newStatus, localStatus);
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
  };

  const sewingCount = orders.filter(isSewing).length;
  const ironingCount = orders.filter(isIroning).length;
  const historyCount = orders.filter(isHistory).length;

  return (
    <PageShell title="الورشة والتفصيل" badge="المرحلة 5">
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

        {/* Table View for All Tabs (SEWING, IRONING, HISTORY) */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'SEWING' ? 'لا توجد أوامر خياطة جارية' : activeTab === 'IRONING' ? 'لا توجد أوردرات بانتظار الكي' : 'السجل فارغ'}
            </h3>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[850px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">العميل والهاتف</th>
                    <th className="p-3.5">العنوان والفرع</th>
                    <th className="p-3.5">تاريخ الاستلام</th>
                    <th className="p-3.5 text-right">تفاصيل الستائر والارتفاع الصافي (قابل للتعديل ✏️)</th>
                    <th className="p-3.5 text-center">ورقة الورشة</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الإجراء والحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/60 align-top">
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="font-bold text-sm text-slate-900">{order.customerName}</div>
                        <div className="font-mono text-xs text-slate-600" dir="ltr">{order.phone}</div>
                        <div className="text-[10px] text-amber-800 font-mono font-bold mt-0.5">{order.id}</div>
                      </td>

                      <td className="p-3.5 text-slate-700">
                        <div className="font-bold text-slate-800">{order.address}</div>
                        <div className="text-slate-500 text-[11px]">{order.branch}</div>
                        <div className="text-[11px] text-slate-600 mt-1">الخياط: <strong>{order.tailorName || 'أبو فهد'}</strong></div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-rose-800">
                        {order.deliveryDate || 'غير محدد'}
                      </td>

                      {/* Editable Heights Column per Room Layer */}
                      <td className="p-3.5">
                        <div className="space-y-2 max-w-md">
                          {order.rooms.map((room, rIdx) => (
                            <div key={rIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                              <span className="font-black text-slate-900 block border-b border-slate-200 pb-1">
                                {room.roomName}
                              </span>

                              {/* Heavy Layer Height Edit */}
                              {room.heavyFabric && (
                                <div className="flex items-center justify-between gap-2 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/60">
                                  <span className="text-amber-950 font-bold">
                                    ثقيل: {room.heavyFabric.name} ({room.heavyFabric.meters}م)
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[11px] font-bold text-slate-600">الارتفاع:</span>
                                    <input
                                      type="text"
                                      value={room.heavyFabric.netHeight || ''}
                                      onChange={(e) => handleHeightChange(order.id, rIdx, 'heavy', e.target.value)}
                                      className="w-20 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      placeholder="مثلاً 280سم"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Sheer Layer Height Edit */}
                              {room.sheerFabric && (
                                <div className="flex items-center justify-between gap-2 bg-blue-50/70 p-1.5 rounded-lg border border-blue-200/60">
                                  <span className="text-blue-950 font-bold">
                                    خلفية: {room.sheerFabric.name} ({room.sheerFabric.meters}م)
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[11px] font-bold text-slate-600">الارتفاع:</span>
                                    <input
                                      type="text"
                                      value={room.sheerFabric.netHeight || ''}
                                      onChange={(e) => handleHeightChange(order.id, rIdx, 'sheer', e.target.value)}
                                      className="w-20 bg-white border border-blue-300 rounded px-1.5 py-0.5 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      placeholder="مثلاً 278سم"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Blackout Layer Height Edit */}
                              {room.blackoutFabric && (
                                <div className="flex items-center justify-between gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-300">
                                  <span className="text-slate-900 font-bold">
                                    بلاك آوت: {room.blackoutFabric.name} ({room.blackoutFabric.meters}م)
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[11px] font-bold text-slate-600">الارتفاع:</span>
                                    <input
                                      type="text"
                                      value={room.blackoutFabric.netHeight || ''}
                                      onChange={(e) => handleHeightChange(order.id, rIdx, 'blackout', e.target.value)}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                      placeholder="مثلاً 275سم"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Print Worksheet Button */}
                      <td className="p-3.5 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForWorksheet(order)}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <span>🖨️ ورقة الورشة</span>
                        </button>
                      </td>

                      {/* WhatsApp Button */}
                      <td className="p-3.5 text-center align-middle">
                        <a
                          href={`https://wa.me/2${order.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold border border-emerald-200 transition-colors inline-block"
                        >
                          💬 واتساب
                        </a>
                      </td>

                      {/* Action Button */}
                      <td className="p-3.5 text-center align-middle">
                        {activeTab === 'SEWING' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'في الورشة', 'جاري الكي')}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                          >
                            تمت الخياطة وتحويل للكي ←
                          </button>
                        )}

                        {activeTab === 'IRONING' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'تجهيز الاكسسوارات', 'تم التجهيز')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 🖨️ Printable Tailoring Worksheet Modal */}
      {selectedOrderForWorksheet && (
        <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <style>{`
            @media print {
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
                padding: 15px !important;
                background: #ffffff !important;
                color: #000000 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div id="printable-tailoring-worksheet" className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200 my-8">
            {/* Control Bar (Hidden on print) */}
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">معاينة وطباعة ورقة تفصيل الورشة</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  طباعة ورقة الورشة (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForWorksheet(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إغلاق ✕
                </button>
              </div>
            </div>

            {/* Header Branding */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-900">
              <div>
                <h2 className="font-display font-black text-xl text-slate-950">مؤسسة أحمد كشك للأقمشة والستائر</h2>
                <p className="text-xs font-bold text-amber-800">أمر ورقة الورشة والتفصيل (للخياط والورشة)</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>كود التفصيل:</strong> {selectedOrderForWorksheet.id}</div>
                <div><strong>كود الطلب:</strong> {selectedOrderForWorksheet.orderId}</div>
                <div><strong>التاريخ:</strong> {selectedOrderForWorksheet.createdAt}</div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div><strong>اسم العميل:</strong> {selectedOrderForWorksheet.customerName}</div>
              <div><strong>رقم الهاتف:</strong> {selectedOrderForWorksheet.phone}</div>
              <div className="text-rose-900 font-bold"><strong>📅 موعد الاستلام:</strong> {selectedOrderForWorksheet.deliveryDate}</div>
              <div><strong>العنوان:</strong> {selectedOrderForWorksheet.address}</div>
              <div><strong>الفرع:</strong> {selectedOrderForWorksheet.branch}</div>
              <div><strong>مسؤول الخياطة:</strong> {selectedOrderForWorksheet.tailorName || 'أبو فهد'}</div>
            </div>

            {/* Room-by-Room Worksheet Table */}
            <div className="space-y-4">
              <h3 className="font-black text-sm text-slate-950 border-b border-slate-300 pb-1">
                🧵 تفاصيل الخياطة والقطع والارتفاعات المطلوبة لكل غرفة:
              </h3>

              {selectedOrderForWorksheet.rooms.map((room, rIdx) => (
                <div key={rIdx} className="border-2 border-slate-300 rounded-xl p-3.5 space-y-3 bg-slate-50/40">
                  <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex justify-between items-center">
                    <span>{room.roomName}</span>
                    <span className="text-[11px] text-amber-400">تعليمات الخياطة والقص</span>
                  </div>

                  <table className="w-full text-right text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border border-slate-300">الصنف / الطبقة</th>
                        <th className="p-2 border border-slate-300">الكمية والقطع</th>
                        <th className="p-2 border border-slate-300">نوع الشريط والتشطيب</th>
                        <th className="p-2 border border-slate-300 text-center w-28">الارتفاع الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.heavyFabric && (
                        <tr className="border-b border-slate-200 bg-amber-50/40">
                          <td className="p-2 border border-slate-300 font-bold">
                            قطيفة / ثقيل ({room.heavyFabric.name})
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-amber-900">
                            {room.heavyFabric.meters} متر ({room.heavyFabric.pieces})
                          </td>
                          <td className="p-2 border border-slate-300">
                            {room.heavyFabric.tapeType}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-black text-sm text-slate-950">
                            {room.heavyFabric.netHeight || '_______ سم'}
                          </td>
                        </tr>
                      )}

                      {room.sheerFabric && (
                        <tr className="border-b border-slate-200 bg-blue-50/40">
                          <td className="p-2 border border-slate-300 font-bold">
                            خلفية شيفون / تول ({room.sheerFabric.name})
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-blue-900">
                            {room.sheerFabric.meters} متر ({room.sheerFabric.pieces})
                          </td>
                          <td className="p-2 border border-slate-300">
                            {room.sheerFabric.tapeType}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-black text-sm text-slate-950">
                            {room.sheerFabric.netHeight || '_______ سم'}
                          </td>
                        </tr>
                      )}

                      {room.blackoutFabric && (
                        <tr className="border-b border-slate-200 bg-slate-100">
                          <td className="p-2 border border-slate-300 font-bold">
                            بلاك آوت عازل ({room.blackoutFabric.name})
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold">
                            {room.blackoutFabric.meters} متر ({room.blackoutFabric.pieces})
                          </td>
                          <td className="p-2 border border-slate-300">
                            {room.blackoutFabric.tapeType}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-black text-sm text-slate-950">
                            {room.blackoutFabric.netHeight || '_______ سم'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {selectedOrderForWorksheet.notes && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs">
                <strong>📝 ملاحظات فنية للخياط:</strong> {selectedOrderForWorksheet.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
