'use client';

import React from 'react';
import { formatDate } from '@/lib/dateUtils';
import { InspectionData, Room } from '@/lib/inspectionsStore';
import Logo from '@/components/Logo';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';
import { getBrandSettings } from '@/lib/brandSettings';

interface InspectionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InspectionData | null;
}

export default function InspectionPrintModal({ isOpen, onClose, data }: InspectionPrintModalProps) {
  if (!isOpen || !data) return null;
  const brand = getBrandSettings();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const roomsHtml = (data.rooms && data.rooms.length > 0)
      ? data.rooms.map((room: Room, idx: number) => `
          <tr>
            <td style="text-align:center; font-weight:bold; font-size:11pt;">${idx + 1}</td>
            <td style="font-weight:bold; color:#0f172a; font-size:11pt;">${room.name || 'غرفة'}</td>
            <td style="text-align:center; font-size:10.5pt;">${room.type || 'شباك'}</td>
            <td style="text-align:center; font-weight:900; font-family:monospace; font-size:12pt; color:#0f172a;">${room.widthCm}</td>
            <td style="text-align:center; font-weight:900; font-family:monospace; font-size:12pt; color:#0f172a;">${room.heightCm}</td>
            <td style="text-align:center; font-size:10.5pt;">${room.sides === 2 ? 'جنبين (2)' : 'جنب واحد (1)'}</td>
            <td style="font-size:10.5pt;">${room.installationType || 'تراك سقف'}</td>
            <td style="font-size:10.5pt;">${room.ceilingType || 'سقف عادي'}</td>
            <td style="font-size:9.5pt; color:#475569;">${room.notes || '—'}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="9" style="text-align:center; padding:15px; color:#64748b;">لا توجد غرف مسجلة في هذا الكشف</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>كشف مقاسات - ${data.customerName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A5 portrait;
            margin: 4mm 5mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Cairo', system-ui, -apple-system, sans-serif;
            background: #ffffff;
            color: #0f172a;
            direction: rtl;
            font-size: 11pt;
            line-height: 1.35;
            padding: 2px;
          }
          .sheet-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #0f172a;
            border-radius: 6px;
            padding: 10px 12px;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .title-area h1 {
            font-size: 13pt;
            font-weight: 900;
          }
          .title-area p {
            font-size: 10.5pt;
            font-weight: 800;
            color: #b45309;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          th, td {
            border: 1px solid #0f172a;
            padding: 4px 6px;
            font-size: 10.5pt;
          }
          th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 11pt;
          }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          <div class="header-row">
            <div class="title-area">
              <h1>${brand.storeName}</h1>
              <p>كشف مقاسات ومعاينة هندسية (A5)</p>
            </div>
            <div>
              <strong>كشف: ${data.id}</strong><br>
              <small>التاريخ: ${new Date().toISOString().split('T')[0]}</small>
            </div>
          </div>
          <p><strong>اسم العميل:</strong> ${data.customerName} | <strong>الهاتف:</strong> ${data.phone}</p>
          <p><strong>العنوان:</strong> ${data.address || '—'} | <strong>الفرع:</strong> ${data.branch || 'الفرع الرئيسي'}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الغرفة</th>
                <th>المكان</th>
                <th>العرض</th>
                <th>الارتفاع</th>
                <th>الجوانب</th>
                <th>التركيب</th>
                <th>السقف</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${roomsHtml}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const shareDetailsText = `كشف مقاسات: ${data.id}\nالعميل: ${data.customerName}\nالعنوان: ${data.address || '—'}\nعدد الغرف: ${data.rooms?.length || 0}`;

  return (
    <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-4 text-slate-900 border border-slate-200 my-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[24px]">print</span>
            <h3 className="font-black text-sm sm:text-base text-slate-900">معاينة كشف المقاسات الميداني (A5)</h3>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppShareButton
              title="كشف المقاسات"
              customerName={data.customerName}
              phone={data.phone}
              detailsText={shareDetailsText}
              targetElementId="printable-inspection-sheet"
            />
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-950 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🖨️ طباعة (A5)</span>
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

        {/* Live Preview of the Clean Single-Page Sheet */}
        <div id="printable-inspection-sheet" className="border-2 border-slate-900 rounded-xl p-5 bg-white text-slate-900 space-y-3 font-sans">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                <Logo size="md" />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-950 leading-tight">{brand.storeName}</h1>
                <p className="text-xs font-bold text-amber-700">كشف مقاسات ومعاينة هندسية ميدانية</p>
              </div>
            </div>
            <div className="text-left font-mono text-xs">
              <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-black text-slate-900">
                كشف: {data.id}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">تاريخ: {new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>

          {/* Info Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-right text-xs">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70 w-[14%]">اسم العميل:</td>
                  <td className="p-2 font-black text-slate-900 w-[36%]">{data.customerName}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70 w-[14%]">رقم الهاتف:</td>
                  <td className="p-2 font-mono font-bold text-slate-900 w-[36%]" dir="ltr">{data.phone}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">العنوان:</td>
                  <td className="p-2 font-bold text-slate-900">{data.address || '—'}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">الفرع:</td>
                  <td className="p-2 font-bold text-slate-900">{data.branch || 'الفرع الرئيسي'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">الفني:</td>
                  <td className="p-2 font-bold text-slate-900">{data.technician || 'أحمد كشك'}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">الموعد:</td>
                  <td className="p-2 font-mono text-slate-900">{data.scheduledAt || 'غير محدد'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rooms Table */}
          <div className="space-y-1.5 pt-1">
            <span className="font-black text-xs text-slate-900 block">مقاسات الغرف المسجلة ({data.rooms?.length || 0} غرف):</span>
            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-950 text-white font-bold text-center">
                  <th className="p-2 border border-slate-700 w-8">#</th>
                  <th className="p-2 border border-slate-700 text-right">الغرفة</th>
                  <th className="p-2 border border-slate-700">المكان</th>
                  <th className="p-2 border border-slate-700 font-mono">العرض (سم)</th>
                  <th className="p-2 border border-slate-700 font-mono">الارتفاع (سم)</th>
                  <th className="p-2 border border-slate-700">الجوانب</th>
                  <th className="p-2 border border-slate-700">طريقة التركيب</th>
                  <th className="p-2 border border-slate-700">نوع السقف</th>
                  <th className="p-2 border border-slate-700">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {(data.rooms || []).map((room: Room, idx: number) => (
                  <tr key={room.id || idx} className="border-b border-slate-300 hover:bg-slate-50">
                    <td className="p-2 text-center font-bold border border-slate-300">{idx + 1}</td>
                    <td className="p-2 font-bold text-slate-900 border border-slate-300">{room.name}</td>
                    <td className="p-2 text-center border border-slate-300">{room.type || 'شباك'}</td>
                    <td className="p-2 text-center font-mono font-black text-slate-950 border border-slate-300">{room.widthCm}</td>
                    <td className="p-2 text-center font-mono font-black text-slate-950 border border-slate-300">{room.heightCm}</td>
                    <td className="p-2 text-center border border-slate-300">{room.sides === 2 ? 'جنبين' : 'جنب'}</td>
                    <td className="p-2 border border-slate-300">{room.installationType}</td>
                    <td className="p-2 border border-slate-300">{room.ceilingType}</td>
                    <td className="p-2 text-[11px] text-slate-600 border border-slate-300">{room.notes || '—'}</td>
                  </tr>
                ))}
                {(!data.rooms || data.rooms.length === 0) && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-slate-400 italic">لا توجد غرف مسجلة في هذا الكشف</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes if present */}
          {data.notes && (
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-950">
              <strong>ملاحظات عامة:</strong> {data.notes}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{brand.storeName}</span>
            <span>هاتف: 01063821000</span>
            <span>نظام كشك لإدارة خطوط الإنتاج</span>
          </div>
        </div>
      </div>
    </div>
  );
}
