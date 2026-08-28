'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { getStoredPipelineOrders, updatePipelineOrderStatus } from '@/lib/pipelineStore';

interface RoomFabricItem {
  roomName: string;
  heavyFabric?: { name: string; code: string; meters: number };
  sheerFabric?: { name: string; code: string; meters: number };
  blackoutFabric?: { name: string; code: string; meters: number };
}

interface CuttingOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  cutterName: string;
  rooms: RoomFabricItem[];
  status: 'بانتظار القص' | 'تم القص وجاهز للخياطة';
  createdAt: string;
}

const initialOrders: CuttingOrder[] = [
  {
    id: 'CUT-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    branch: 'الفرع الرئيسي',
    cutterName: 'عم مصطفى البياع',
    status: 'بانتظار القص',
    createdAt: '2026-08-28',
    rooms: [
      {
        roomName: 'غرفة (1) - الصالة الرئيسية',
        heavyFabric: { name: 'قطيفة تركي ثقيل', code: 'V-990', meters: 6.30 },
        sheerFabric: { name: 'تول خفيف مطرز', code: 'T-402', meters: 8.75 },
        blackoutFabric: { name: 'بلاك آوت عازل', code: 'BL-101', meters: 2.25 },
      },
      {
        roomName: 'غرفة (2) - غرفة النوم الرئيسية',
        heavyFabric: { name: 'قطيفة تركي ثقيل', code: 'V-990', meters: 4.50 },
        sheerFabric: { name: 'تول خفيف مطرز', code: 'T-402', meters: 5.00 },
        blackoutFabric: { name: 'بلاك آوت عازل', code: 'BL-101', meters: 3.00 },
      },
    ],
  },
  {
    id: 'CUT-102',
    orderId: 'ORD-002',
    customerName: 'شركة المعمار لترميم الفيصلية',
    phone: '01155556666',
    address: 'مصر الجديدة، شارع الثورة',
    branch: 'فرع عرابي',
    cutterName: 'أحمد شحاتة',
    status: 'تم القص وجاهز للخياطة',
    createdAt: '2026-08-27',
    rooms: [
      {
        roomName: 'قاعة الاجتماعات الرئيسية',
        blackoutFabric: { name: 'بلاك آوت عازل ضوء', code: 'BL-900', meters: 16.00 },
      },
    ],
  },
  {
    id: 'CUT-103',
    orderId: 'ORD-004',
    customerName: 'د. سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، بيفرلي هيلز',
    branch: 'الفرع الرئيسي',
    cutterName: 'حسن إبراهيم',
    status: 'بانتظار القص',
    createdAt: '2026-08-28',
    rooms: [
      {
        roomName: 'غرفة المعيشة',
        heavyFabric: { name: 'كتان هازل بني', code: 'LN-77', meters: 12.00 },
        sheerFabric: { name: 'تول ويفي أبيض', code: 'TW-10', meters: 12.00 },
      },
    ],
  },
];

export default function PipelineCuttingPage() {
  const [orders, setOrders] = useState<CuttingOrder[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<CuttingOrder | null>(null);

  useEffect(() => {
    const stored = getStoredPipelineOrders();
    if (stored && stored.length > 0) {
      setOrders(stored as any);
    }
  }, []);

  const isSent = (status: any) => status !== 'بانتظار القص';

  const tabFiltered = orders.filter(o => activeTab === 'OPEN' ? !isSent(o.status) : isSent(o.status));
  const filtered = tabFiltered.filter(o => {
    const matchesSearch = o.customerName.includes(searchQuery) || o.id.includes(searchQuery) || o.orderId.includes(searchQuery);
    const matchesBranch = selectedBranch === 'ALL' || o.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const updateOrderStatus = (id: string, newStatus: CuttingOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    updatePipelineOrderStatus(id, 'في الورشة', 'جاري الخياطة');
  };

  const openCount = orders.filter(o => !isSent(o.status)).length;
  const sentCount = orders.filter(o => isSent(o.status)).length;

  // Calculate Fabric Summary for an Order
  const getFabricTotals = (rooms: RoomFabricItem[]) => {
    const totals: Record<string, { name: string; code: string; meters: number }> = {};
    rooms.forEach(r => {
      [r.heavyFabric, r.sheerFabric, r.blackoutFabric].forEach(f => {
        if (f) {
          const key = f.name;
          if (!totals[key]) {
            totals[key] = { name: f.name, code: f.code, meters: 0 };
          }
          totals[key].meters += f.meters;
        }
      });
    });
    return Object.values(totals);
  };

  return (
    <PageShell title="قص القماش والأثواب" badge="المرحلة 4">
      <div className="flex flex-col gap-5">
        {/* 2-Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'OPEN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">content_cut</span>
            <span>القص</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
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
              {sentCount}
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
              placeholder="بحث باسم العميل، رقم الهاتف أو اسم القماش..."
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

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-1">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد أوامر قص جارية حالياً' : 'سجل المقصوص فارغ'}
            </h3>
          </div>
        ) : activeTab === 'SENT' ? (
          /* TAB 2: Table Format (جدول السجل) */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[750px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">العميل والهاتف</th>
                    <th className="p-3.5">العنوان والفرع</th>
                    <th className="p-3.5">الأقمشة المقصوصة والمجموع</th>
                    <th className="p-3.5 text-center">ورقة القص</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => {
                    const totals = getFabricTotals(order.rooms);
                    return (
                      <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{order.customerName} ({order.phone})</td>
                        <td className="p-3.5 text-slate-700">{order.address} ({order.branch})</td>
                        <td className="p-3.5 text-slate-800">
                          <div className="flex flex-wrap gap-1">
                            {totals.map((t, idx) => (
                              <span key={idx} className="bg-amber-50 text-amber-950 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                {t.name} ({t.meters}م)
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setSelectedOrderForPrint(order)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors"
                          >
                            🖨️ طباعة
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <a
                            href={`https://wa.me/2${order.phone}?text=${encodeURIComponent(`مرحباً ${order.customerName}، تم قص أقمشة أوردر الستائر الخاص بكم بنجاح بمؤسسة أحمد كشك وجاري تحويله للورشة. شكراً لثقتكم بنا!`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200"
                          >
                            💬 واتساب
                          </a>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            تم القص والتحويل للورشة
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1: Active Cards (أمر القص المجمع لكل غرفة) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(order => {
              const totals = getFabricTotals(order.rooms);
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                  <div>
                    {/* Customer Header */}
                    <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">{order.customerName}</h3>
                        <p className="text-xs text-slate-500">{order.address}</p>
                      </div>
                      <button
                        onClick={() => setSelectedOrderForPrint(order)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>🖨️ ورقة قص القماش (للبياع)</span>
                      </button>
                    </div>

                    {/* Breakdown Per Room */}
                    <div className="my-3 space-y-2.5">
                      <span className="text-[11px] font-black text-slate-700 block">✂️ الأقمشة والأمتار المطلوبة لكل غرفة على حدة:</span>
                      {order.rooms.map((room, rIdx) => (
                        <div key={rIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                          <span className="font-bold text-xs text-slate-900 block border-b border-slate-200/80 pb-1">{room.roomName}</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                            {room.heavyFabric && (
                              <div className="bg-amber-100/70 text-amber-950 p-1.5 rounded-lg border border-amber-200/60 flex justify-between items-center">
                                <span className="font-bold">ثقيل:</span>
                                <strong className="font-mono font-black text-sm">{room.heavyFabric.meters}م</strong>
                              </div>
                            )}
                            {room.sheerFabric && (
                              <div className="bg-blue-50 text-blue-950 p-1.5 rounded-lg border border-blue-200/60 flex justify-between items-center">
                                <span className="font-bold">تول:</span>
                                <strong className="font-mono font-black text-sm">{room.sheerFabric.meters}م</strong>
                              </div>
                            )}
                            {room.blackoutFabric && (
                              <div className="bg-slate-200/70 text-slate-900 p-1.5 rounded-lg border border-slate-300 flex justify-between items-center">
                                <span className="font-bold">بلاك آوت:</span>
                                <strong className="font-mono font-black text-sm">{room.blackoutFabric.meters}م</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Total Fabrics Summary */}
                    <div className="bg-amber-500/10 border border-amber-400/30 p-2.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-amber-950">إجمالي الأمتار المجمعة للطلب:</span>
                      <div className="flex flex-wrap gap-2">
                        {totals.map((t, idx) => (
                          <span key={idx} className="bg-white font-bold text-slate-900 border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs font-mono">
                            {t.name}: <strong className="text-amber-800">{t.meters}م</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <a
                      href={`https://wa.me/2${order.phone}?text=${encodeURIComponent(`مرحباً ${order.customerName}، نود إعلامك بأن أوردر الستائر الخاص بكم في مرحلة قص القماش حالياً بمؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      💬 إرسال تحديث للعميل (واتساب)
                    </a>

                    <button
                      onClick={() => updateOrderStatus(order.id, 'تم القص وجاهز للخياطة')}
                      className="w-full bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-colors"
                    >
                      تم قص القماش ←
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🖨️ Printable Order Cut Sheet Modal (ورقة قص القماش للبياع) */}
      {selectedOrderForPrint && (
        <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Printable CSS styles */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-cut-sheet-modal,
              #printable-cut-sheet-modal * {
                visibility: visible !important;
              }
              #printable-cut-sheet-modal {
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

          <div id="printable-cut-sheet-modal" className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200 my-8">
            {/* Printable Header */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-900">
              <div>
                <h2 className="font-display font-black text-xl text-slate-950">مؤسسة أحمد كشك للأقمشة والستائر</h2>
                <p className="text-xs font-bold text-amber-800">أمر ورقة قص القماش (للبياع / أمين المخزن)</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>التاريخ:</strong> {selectedOrderForPrint.createdAt}</div>
              </div>
            </div>

            {/* Customer Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div><strong>اسم العميل:</strong> <span className="font-bold text-sm text-slate-900">{selectedOrderForPrint.customerName}</span></div>
              <div><strong>الفرع:</strong> <span className="font-bold">{selectedOrderForPrint.branch}</span></div>
            </div>

            {/* Detailed Table Per Room */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs text-slate-900">بيانات الأقمشة والأمتار المطلوب قصها لكل غرفة:</h3>
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                  <tr>
                    <th className="p-2 border border-slate-300 w-1/3">اسم الغرفة</th>
                    <th className="p-2 border border-slate-300">نوع القماش</th>
                    <th className="p-2 border border-slate-300 text-center w-28">الأمتار المطلوب</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrderForPrint.rooms.map((room, rIdx) => {
                    const fabrics = [
                      room.heavyFabric ? { type: 'ثقيل', ...room.heavyFabric } : null,
                      room.sheerFabric ? { type: 'تول', ...room.sheerFabric } : null,
                      room.blackoutFabric ? { type: 'بلاك آوت', ...room.blackoutFabric } : null,
                    ].filter(Boolean);

                    return fabrics.map((f: any, fIdx) => (
                      <tr key={`${rIdx}-${fIdx}`} className="border-b border-slate-200">
                        {fIdx === 0 && (
                          <td rowSpan={fabrics.length} className="p-2 font-bold border border-slate-300 bg-slate-50/50 align-top text-xs">
                            {room.roomName}
                          </td>
                        )}
                        <td className="p-2 border border-slate-300 font-bold text-xs">
                          {f.name}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-xs text-amber-950">
                          {f.meters}م
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Summary Box */}
            <div className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-xl space-y-1.5 text-xs">
              <h4 className="font-black text-amber-950 text-xs">ملخص إجمالي الأمتار :</h4>
              <div className="flex flex-wrap gap-2.5 font-mono font-bold text-slate-900">
                {getFabricTotals(selectedOrderForPrint.rooms).map((t, idx) => (
                  <span key={idx} className="bg-white border border-amber-300 px-3 py-1 rounded-lg shadow-2xs text-xs">
                    {t.name}: <strong className="text-amber-900 font-black">{t.meters}م</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-soft transition-colors cursor-pointer"
              >
                🖨️ طباعة الورقة الآن
              </button>
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
