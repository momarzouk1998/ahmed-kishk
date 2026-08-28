'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

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
  status: 'جاري الخياطة' | 'تمت الخياطة' | 'جاهز للتسليم' | 'في الإكسسوارات' | 'في التركيبات' | 'في التسليمات';
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
    status: 'جاري الخياطة',
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
          name: 'خلفية شيفون مطرز',
          code: 'SH-40',
          meters: 5.00,
          pieces: 'قطعتين',
          tapeType: 'شريط ويفي 8سم',
          netHeight: '263 سم',
        },
      },
    ],
  },
  {
    id: 'TLR-102',
    orderId: 'ORD-004',
    customerName: 'د. سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، بيفرلي هيلز',
    branch: 'الفرع الرئيسي',
    deliveryDate: '2026-09-08',
    tailorName: 'حسن إبراهيم',
    status: 'تمت الخياطة',
    notes: 'تأكيد كشكشة الشريط الويفي والكي النهائي بالبخار',
    createdAt: '2026-08-28',
    rooms: [
      {
        roomName: 'غرفة المعيشة',
        heavyFabric: {
          name: 'كتان هازل بني',
          code: 'LN-77',
          meters: 12.00,
          pieces: 'جنبين',
          tapeType: 'شريط ويفي حديث',
          netHeight: '290 سم',
        },
        sheerFabric: {
          name: 'تول ويفي أبيض',
          code: 'TW-10',
          meters: 12.00,
          pieces: 'قطعتين',
          tapeType: 'شريط ويفي حديث',
          netHeight: '288 سم',
        },
      },
    ],
  },
];

export default function PipelineTailoringPage() {
  const [orders, setOrders] = useState<TailoringJobOrder[]>(initialTailoringOrders);
  const [activeTab, setActiveTab] = useState<'WORKSHOP' | 'SEWN' | 'HISTORY'>('WORKSHOP');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForWorksheet, setSelectedOrderForWorksheet] = useState<TailoringJobOrder | null>(null);

  const tabFiltered = orders.filter(o => {
    if (activeTab === 'WORKSHOP') {
      return o.status === 'جاري الخياطة';
    } else if (activeTab === 'SEWN') {
      return o.status === 'تمت الخياطة' || o.status === 'جاهز للتسليم';
    } else {
      return o.status === 'في الإكسسوارات' || o.status === 'في التركيبات' || o.status === 'في التسليمات';
    }
  });

  const filtered = tabFiltered.filter(o =>
    o.customerName.includes(searchQuery) || o.id.includes(searchQuery) || o.orderId.includes(searchQuery)
  );

  const updateOrderStatus = (id: string, newStatus: TailoringJobOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const workshopCount = orders.filter(o => o.status === 'جاري الخياطة').length;
  const sewnCount = orders.filter(o => o.status === 'تمت الخياطة' || o.status === 'جاهز للتسليم').length;
  const historyCount = orders.filter(o => o.status === 'في الإكسسوارات' || o.status === 'في التركيبات' || o.status === 'في التسليمات').length;

  return (
    <PageShell title="الورشة والتفصيل">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-200">
              المرحلة 5
            </span>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">الورشة والتفصيل</h1>
          </div>
        </div>

        <div className="flex border-b border-slate-200 gap-2">
          <button onClick={() => setActiveTab('WORKSHOP')} className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 ${activeTab === 'WORKSHOP' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'}`}>
            <span>الورشة</span>
            <span className="bg-slate-100 px-2 rounded-full text-[11px]">{workshopCount}</span>
          </button>
          <button onClick={() => setActiveTab('SEWN')} className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 ${activeTab === 'SEWN' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'}`}>
            <span>تم الخياطة</span>
            <span className="bg-slate-100 px-2 rounded-full text-[11px]">{sewnCount}</span>
          </button>
          <button onClick={() => setActiveTab('HISTORY')} className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 ${activeTab === 'HISTORY' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'}`}>
            <span>السجل</span>
            <span className="bg-slate-100 px-2 rounded-full text-[11px]">{historyCount}</span>
          </button>
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الكود، اسم القماش..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'WORKSHOP' ? 'لا توجد أوامر تفصيل جارية' : activeTab === 'SEWN' ? 'لا توجد قطع بانتظار الجاهزية' : 'السجل فارغ'}
            </h3>
          </div>
        ) : activeTab === 'HISTORY' ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[750px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">كود التفصيل</th>
                    <th className="p-3.5">كود الطلب</th>
                    <th className="p-3.5">العميل والهاتف</th>
                    <th className="p-3.5">تاريخ الاستلام</th>
                    <th className="p-3.5">مسؤول الورشة</th>
                    <th className="p-3.5 text-center">ورقة الورشة</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-3.5 font-mono font-bold text-amber-800">{order.id}</td>
                      <td className="p-3.5 font-mono text-slate-500">{order.orderId}</td>
                      <td className="p-3.5 font-bold text-slate-900">{order.customerName} ({order.phone})</td>
                      <td className="p-3.5 font-mono font-bold text-rose-800">{order.deliveryDate}</td>
                      <td className="p-3.5 text-slate-700">{order.tailorName}</td>
                      <td className="p-3.5 text-center">
                        <button onClick={() => setSelectedOrderForWorksheet(order)} className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold">🖨️ ورقة الورشة</button>
                      </td>
                      <td className="p-3.5 text-center">
                        <a href={`https://wa.me/2${order.phone}`} target="_blank" rel="noreferrer" className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200">💬 واتساب</a>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-amber-800">{order.id} • {order.orderId}</span>
                      <h3 className="font-bold text-base text-slate-900">{order.customerName}</h3>
                      <p className="text-xs text-rose-800 font-bold font-mono">📅 تاريخ الاستلام: {order.deliveryDate}</p>
                    </div>
                    <button onClick={() => setSelectedOrderForWorksheet(order)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl">🖨️ ورقة الورشة</button>
                  </div>
                  <div className="my-3 space-y-2.5">
                    <span className="text-[11px] font-black text-slate-700 block">🧵 تفاصيل التفصيل لكل غرفة:</span>
                    {order.rooms.map((room, rIdx) => (
                      <div key={rIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                        <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1">{room.roomName}</span>
                        {room.heavyFabric && <div className="text-amber-950"><strong>ثقيل:</strong> {room.heavyFabric.name}</div>}
                        {room.sheerFabric && <div className="text-blue-950"><strong>خلفية:</strong> {room.sheerFabric.name}</div>}
                      </div>
                    ))}
                  </div>
                  {order.notes && <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs"><strong>📝 ملاحظات:</strong> {order.notes}</div>}
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <a href={`https://wa.me/2${order.phone}`} target="_blank" rel="noreferrer" className="w-full bg-emerald-50 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold flex justify-center">💬 إرسال تحديث للعميل (واتساب)</a>
                  {activeTab === 'WORKSHOP' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'تمت الخياطة')}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                    >
                      تمت الخياطة ←
                    </button>
                  )}

                  {activeTab === 'SEWN' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'في التسليمات')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                    >
                      جاهز للتسليم ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🖨️ Printable Tailoring Worksheet Modal (ورقة الورشة والتفصيل للخياط) */}
      {selectedOrderForWorksheet && (
        <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Printable CSS styles for PDF / Print */}
          <style>{`
            @media print {
              html, body {
                background: white !important;
                color: black !important;
                overflow: visible !important;
              }
              .modal-overlay {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                display: block !important;
              }
              #printable-tailoring-worksheet {
                position: static !important;
                display: block !important;
                visibility: visible !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div id="printable-tailoring-worksheet" className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200 my-8">
            {/* Header */}
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

            {/* Customer & Delivery Information */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div><strong>اسم العميل:</strong> {selectedOrderForWorksheet.customerName}</div>
              <div><strong>رقم الهاتف:</strong> {selectedOrderForWorksheet.phone}</div>
              <div className="text-rose-900 font-bold"><strong>📅 موعد الاستلام:</strong> {selectedOrderForWorksheet.deliveryDate}</div>
              <div><strong>العنوان:</strong> {selectedOrderForWorksheet.address}</div>
              <div><strong>الفرع:</strong> {selectedOrderForWorksheet.branch}</div>
              <div><strong>مسؤول الخياطة:</strong> {selectedOrderForWorksheet.tailorName}</div>
            </div>

            {/* Room-by-Room Detailed Worksheet */}
            <div className="space-y-4">
              <h3 className="font-black text-sm text-slate-950 border-b border-slate-300 pb-1">
                🧵 تفاصيل الخياطة والقطع والارتفاعات المطلوبة لكل غرفة:
              </h3>

              {selectedOrderForWorksheet.rooms.map((room, rIdx) => (
                <div key={rIdx} className="border-2 border-slate-300 rounded-xl p-3.5 space-y-3 bg-slate-50/40">
                  <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex justify-between items-center">
                    <span>{room.roomName}</span>
                    <span className="text-[11px] text-amber-400">تعليمات الخياطة</span>
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
                          <td className="p-2 border border-slate-300 text-center font-mono font-black text-sm">
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
                          <td className="p-2 border border-slate-300 text-center font-mono font-black text-sm">
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
                          <td className="p-2 border border-slate-300 text-center font-mono font-black text-sm">
                            {room.blackoutFabric.netHeight || '_______ سم'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Notes & Instructions Box */}
            <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-xl space-y-1.5 text-xs">
              <h4 className="font-black text-amber-950 text-xs">📝 ملاحظات وتعليمات الورشة والفصل:</h4>
              <p className="font-bold text-slate-800 leading-relaxed min-h-[35px]">
                {selectedOrderForWorksheet.notes || 'لا توجد ملاحظات إضافية. يرجى التزام المقاسات المحددة للثنيات وإجراء الكي النهائي والتغليف.'}
              </p>
            </div>

            {/* Signatures & Footer */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
              <div>
                <div><strong>اسم الخياط / مسؤول الورشة:</strong> {selectedOrderForWorksheet.tailorName}</div>
                <div><strong>التوقيع بالاستلام الجاهز:</strong> ________________________</div>
              </div>
              <div className="flex gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-soft transition-colors cursor-pointer"
                >
                  🖨️ طباعة الورقة الآن
                </button>
                <button
                  onClick={() => setSelectedOrderForWorksheet(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
