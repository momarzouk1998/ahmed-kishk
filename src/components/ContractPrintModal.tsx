'use client';

import React from 'react';

export interface PrintRoomItem {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  sides: number;
  heavyFabricName?: string;
  heavyTapeType?: string;
  heavyMultiplier?: number;
  heavyMeters: number;
  heavyPrice: number;
  sheerFabricName?: string;
  sheerTapeType?: string;
  sheerMultiplier?: number;
  sheerMeters: number;
  sheerPrice: number;
  blackoutFabricName?: string;
  blackoutMultiplier?: number;
  blackoutMeters: number;
  blackoutPrice: number;
  trackMeters: number;
  trackPrice: number;
  tapeMeters: number;
  tapePrice: number;
  tailorPricePerSide: number;
  installFee: number;
  totalSellPrice: number;
}

export interface PrintContractData {
  id: string;
  inspectionId: string;
  customerName: string;
  phone: string;
  address: string;
  date: string;
  deliveryDate?: string;
  estimatorName: string;
  totalAmount: number;
  depositPaid: number;
  remainingAmount: number;
  rooms: PrintRoomItem[];
}

interface ContractPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PrintContractData | null;
}

export default function ContractPrintModal({ isOpen, onClose, data }: ContractPrintModalProps) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs print:p-0 print:bg-white print:static">
      <style flex-inline>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-contract-modal, #printable-contract-modal * {
            visibility: visible !important;
          }
          #printable-contract-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      <div id="printable-contract-modal" className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-slate-200 print:max-h-none print:shadow-none print:border-none print:p-4">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-gold text-2xl">description</span>
            <h2 className="font-display font-black text-lg text-slate-900">معاينة مقايسة وعقد العميل</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              طباعة العقد (PDF)
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Contract Document Header */}
        <div className="space-y-6">
          {/* Header Branding */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="font-display font-black text-2xl text-slate-950">أحمد كشك</h1>
              <p className="text-xs font-bold text-amber-700">مؤسسة أحمد كشك للأقمشة والستائر الفاخرة</p>
              <p className="text-[11px] text-slate-500 mt-1">الفرع الرئيسي | القاهرة، مصر</p>
            </div>
            <div className="text-left font-mono">
              <p className="text-xs text-slate-700 font-bold">تاريخ التعاقد: {data.date}</p>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-bold block">اسم العميل:</span>
              <strong className="text-slate-900 text-sm">{data.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">رقم الهاتف:</span>
              <strong className="text-slate-900 font-mono text-sm" dir="ltr">{data.phone}</strong>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <span className="text-slate-400 font-bold block">عنوان التركيب:</span>
              <strong className="text-slate-900">{data.address}</strong>
            </div>
            <div>
              <span className="text-amber-800 font-bold block">موعد التركيب:</span>
              <strong className="text-slate-900 font-mono text-sm block mt-0.5">{data.deliveryDate || 'غير محدد'}</strong>
            </div>
          </div>

          {/* Detailed Rooms Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 border-r-4 border-brand-gold pr-2">تفاصيل غرف المقايسة والأقمشة المختارة:</h3>
            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300">الغرفة والمقاسات</th>
                  <th className="p-2 border border-slate-300">الأقمشة والأصناف المختارة</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">الأمتار</th>
                  <th className="p-2 border border-slate-300 text-left font-mono">سعر المتر/الوحدة</th>
                  <th className="p-2 border border-slate-300 text-left font-mono">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((room, rIdx) => (
                  <React.Fragment key={room.id}>
                    {/* Room main row header */}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={5} className="p-2 border border-slate-300 text-slate-900 bg-amber-50/60">
                        {rIdx + 1}. {room.name} — (عرض: {room.widthCm}سم × ارتفاع: {room.heightCm}سم | {room.sides === 2 ? 'جنبين' : 'جنب واحد'})
                      </td>
                    </tr>

                    {/* 1. Heavy fabric row (1st) */}
                    {room.heavyMeters > 0 && (
                      <tr className="border border-slate-200">
                        <td className="p-2 border border-slate-200 text-slate-500 font-bold">1. قماش الجوانب (الثقيل)</td>
                        <td className="p-2 border border-slate-200 text-slate-900 font-bold">
                          {room.heavyFabricName || 'قطيفة جاجوار تركيات'}
                          <span className="text-[11px] text-slate-500 block font-normal">شريط {room.heavyTapeType || '٣ فتلة'} (معامل ×{room.heavyMultiplier ?? 2.0})</span>
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono">{room.heavyMeters} م</td>
                        <td className="p-2 border border-slate-200 text-left font-mono">{room.heavyPrice} ج</td>
                        <td className="p-2 border border-slate-200 text-left font-mono font-bold">{(room.heavyMeters * room.heavyPrice).toLocaleString()} ج</td>
                      </tr>
                    )}

                    {/* 2. Sheer fabric row (2nd) */}
                    {room.sheerMeters > 0 && (
                      <tr className="border border-slate-200">
                        <td className="p-2 border border-slate-200 text-slate-500 font-bold">2. قماش الخلفية (الشيفون)</td>
                        <td className="p-2 border border-slate-200 text-slate-900 font-bold">
                          {room.sheerFabricName || 'شيفون حرير فاخر'}
                          <span className="text-[11px] text-slate-500 block font-normal">شريط {room.sheerTapeType || 'ويفي'} (معامل ×{room.sheerMultiplier ?? 2.5})</span>
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono">{room.sheerMeters} م</td>
                        <td className="p-2 border border-slate-200 text-left font-mono">{room.sheerPrice} ج</td>
                        <td className="p-2 border border-slate-200 text-left font-mono font-bold">{(room.sheerMeters * room.sheerPrice).toLocaleString()} ج</td>
                      </tr>
                    )}

                    {/* 3. Blackout fabric row (3rd) */}
                    {room.blackoutMeters > 0 && room.blackoutFabricName && (
                      <tr className="border border-slate-200">
                        <td className="p-2 border border-slate-200 text-slate-500 font-bold">3. طبقة البلاك آوت العازل</td>
                        <td className="p-2 border border-slate-200 text-slate-900 font-bold">
                          {room.blackoutFabricName || 'بلاك آوت عازل حراري'}
                          <span className="text-[11px] text-slate-500 block font-normal">(معامل ×{room.blackoutMultiplier ?? 1.20})</span>
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono">{room.blackoutMeters} م</td>
                        <td className="p-2 border border-slate-200 text-left font-mono">{room.blackoutPrice} ج</td>
                        <td className="p-2 border border-slate-200 text-left font-mono font-bold">{(room.blackoutMeters * room.blackoutPrice).toLocaleString()} ج</td>
                      </tr>
                    )}

                    {/* Accessories & Tailoring summary row */}
                    <tr className="border border-slate-200 text-[11px] text-slate-600 bg-slate-50/30">
                      <td className="p-2 border border-slate-200 font-bold">التجهيزات والمصنعيات</td>
                      <td colSpan={3} className="p-2 border border-slate-200">
                        مجرى/ماسورة ({room.trackMeters}م × {room.trackPrice}ج) + شريط كشكشة ({room.tapeMeters}م × {room.tapePrice}ج) + خياطة الورشة ({room.sides} جنب × {room.tailorPricePerSide}ج) + رسوم التركيب ({room.installFee}ج)
                      </td>
                      <td className="p-2 border border-slate-200 text-left font-mono font-bold text-slate-900">
                        {(
                          (room.trackMeters * room.trackPrice) +
                          (room.tapeMeters * room.tapePrice) +
                          (room.sides * room.tailorPricePerSide) +
                          room.installFee
                        ).toLocaleString()} ج
                      </td>
                    </tr>

                    {/* Room Total */}
                    <tr className="bg-slate-100 font-black border-b-2 border-slate-300">
                      <td colSpan={4} className="p-2 border border-slate-300 text-left">إجمالي تكلفة {room.name}:</td>
                      <td className="p-2 border border-slate-300 text-left font-mono text-amber-950 bg-amber-100/60">{room.totalSellPrice.toLocaleString()} ج</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Table */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-slate-900 text-white p-4 rounded-xl">
            <div className="space-y-1 text-xs text-slate-300">
              <p>مسؤول المبيعات والتسعير: <strong className="text-white">{data.estimatorName}</strong></p>
              <p>حالة العقد: <strong className="text-amber-400">معتمد ومسدد العربون</strong></p>
            </div>
            <div className="w-full sm:w-64 space-y-1.5 text-xs font-mono text-left">
              <div className="flex justify-between border-b border-slate-700 pb-1">
                <span className="text-slate-400">إجمالي مقايسة العقد:</span>
                <strong className="text-base text-white">{data.totalAmount.toLocaleString()} جنيه</strong>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-1">
                <span className="text-emerald-400">العربون المدفوع:</span>
                <strong className="text-base text-emerald-400">{data.depositPaid.toLocaleString()} جنيه</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-rose-400 font-bold">المتبقي للتحصيل عند التركيب:</span>
                <strong className="text-lg text-rose-400 font-black">{data.remainingAmount.toLocaleString()} جنيه</strong>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
