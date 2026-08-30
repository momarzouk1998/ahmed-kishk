'use client';

import React from 'react';
import { formatDateOnly } from '@/lib/dateUtils';
import { InspectionData, Room } from '@/lib/inspectionsStore';
import Logo from '@/components/Logo';

interface InspectionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InspectionData | null;
}

export default function InspectionPrintModal({ isOpen, onClose, data }: InspectionPrintModalProps) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const printableContent = document.getElementById('printable-inspection-modal');
    if (!printableContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>كشف مقاسات - ${data.customerName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 10px;
            background: white;
            color: black;
            direction: rtl;
            font-size: 11pt;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #334155;
            padding: 7px 8px;
            font-size: 9.5pt;
            color: #000;
            vertical-align: middle;
            text-align: right;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 800;
          }
          .no-print {
            display: none !important;
          }
          button, input {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${printableContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-inspection-modal, #printable-inspection-modal * {
            visibility: visible !important;
          }
          #printable-inspection-modal {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12px !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="printable-inspection-modal"
        className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-5 text-slate-900 border border-slate-200 my-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Action Controls Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[22px]">print</span>
            <h3 className="font-black text-sm text-slate-900">معاينة طباعة كشف المقاسات (A4)</h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🖨️ بدء الطباعة / حفظ PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق ✕
            </button>
          </div>
        </div>

        {/* Printable Official Header */}
        <div className="flex justify-between items-center pb-4 border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 border border-slate-800 rounded-xl p-1 flex items-center justify-center">
              <Logo size="md" />
            </div>
            <div>
              <h1 className="font-black text-lg sm:text-xl text-slate-950">مؤسسة أحمد كشك للأقمشة والستائر</h1>
              <p className="text-xs font-bold text-amber-800">كشف مقاسات ومعاينة هندسية ميدانية</p>
            </div>
          </div>
          <div className="text-left font-mono text-xs">
            <div className="bg-slate-100 px-3 py-1 rounded-md border border-slate-300 font-black text-slate-900 inline-block">
              رقم المعاينة: {data.id}
            </div>
            <div className="text-slate-500 mt-1">
              تاريخ الطباعة: {new Date().toISOString().split('T')[0]}
            </div>
          </div>
        </div>

        {/* Customer & Technician Information Box */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">اسم العميل:</span>
            <strong className="text-slate-900 text-sm">{data.customerName}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">رقم الهاتف:</span>
            <strong className="text-slate-900 font-mono text-sm" dir="ltr">{data.phone}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">العنوان:</span>
            <strong className="text-slate-900">{data.address || '—'}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">الفرع:</span>
            <strong className="text-slate-900">{data.branch || 'الفرع الرئيسي'}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">الفني المسؤول:</span>
            <strong className="text-slate-900">{data.technician || 'أحمد كشك'}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-bold block mb-0.5">موعد المعاينة:</span>
            <strong className="text-slate-900 font-mono">{data.scheduledAt || 'غير محدد'}</strong>
          </div>
        </div>

        {/* Rooms Detailed Measurement Table */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-xs text-slate-900">
              تفاصيل مقاسات الغرف المسجلة ({data.rooms?.length || 0} غرف):
            </h4>
          </div>

          <table className="w-full text-right text-xs border-collapse border border-slate-300">
            <thead className="bg-slate-100 font-bold border-b-2 border-slate-900">
              <tr>
                <th className="p-2 text-center border border-slate-300 w-8">#</th>
                <th className="p-2 border border-slate-300">اسم الغرفة</th>
                <th className="p-2 border border-slate-300 text-center">المكان</th>
                <th className="p-2 border border-slate-300 text-center font-mono">العرض (سم)</th>
                <th className="p-2 border border-slate-300 text-center font-mono">الارتفاع (سم)</th>
                <th className="p-2 border border-slate-300 text-center">الجوانب</th>
                <th className="p-2 border border-slate-300">طريقة التركيب</th>
                <th className="p-2 border border-slate-300">نوع ومكان السقف</th>
                <th className="p-2 border border-slate-300">ملاحظات فنية</th>
              </tr>
            </thead>
            <tbody>
              {(data.rooms || []).map((room: Room, idx: number) => (
                <tr key={room.id || idx} className="border-b border-slate-300 hover:bg-slate-50">
                  <td className="p-2 text-center font-bold border border-slate-300">{idx + 1}</td>
                  <td className="p-2 font-bold border border-slate-300 text-slate-900">{room.name}</td>
                  <td className="p-2 text-center border border-slate-300">{room.type || 'شباك'}</td>
                  <td className="p-2 text-center font-mono font-black text-sm border border-slate-300">{room.widthCm}</td>
                  <td className="p-2 text-center font-mono font-black text-sm border border-slate-300">{room.heightCm}</td>
                  <td className="p-2 text-center border border-slate-300">{room.sides === 2 ? 'جنبين (2)' : 'جنب واحد'}</td>
                  <td className="p-2 border border-slate-300">{room.installationType}</td>
                  <td className="p-2 border border-slate-300">{room.ceilingType}</td>
                  <td className="p-2 text-[11px] border border-slate-300 text-slate-700">{room.notes || '—'}</td>
                </tr>
              ))}
              {(!data.rooms || data.rooms.length === 0) && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-slate-500 italic">
                    لا توجد غرف مسجلة في كشف المعاينة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* General Notes if present */}
        {data.notes && (
          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs">
            <strong className="text-amber-950 block mb-1">ملاحظات عامة على المعاينة:</strong>
            <p className="text-slate-800 whitespace-pre-line">{data.notes}</p>
          </div>
        )}

        {/* Signatures & Approvals Section */}
        <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-8">
            <span className="font-bold text-slate-900 block">توقيع الفني المسؤول:</span>
            <div className="border-b border-dashed border-slate-400 w-44 mx-auto"></div>
          </div>
          <div className="space-y-8">
            <span className="font-bold text-slate-900 block">توقيع وموافقة العميل:</span>
            <div className="border-b border-dashed border-slate-400 w-44 mx-auto"></div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-[10px] text-center text-slate-400 pt-2 font-mono">
          مؤسسة أحمد كشك للأقمشة والستائر الفاخرة • هاتف: 01063821000 • نظام كشك لإدارة خطوط الإنتاج
        </div>
      </div>
    </div>
  );
}
