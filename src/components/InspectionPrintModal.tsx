'use client';

import React from 'react';
import { formatDate } from '@/lib/dateUtils';
import { InspectionData, Room } from '@/lib/inspectionsStore';

interface InspectionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InspectionData | null;
}

export default function InspectionPrintModal({ isOpen, onClose, data }: InspectionPrintModalProps) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const roomsHtml = (data.rooms && data.rooms.length > 0)
      ? data.rooms.map((room: Room, idx: number) => `
          <tr>
            <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
            <td style="font-weight:bold; color:#0f172a;">${room.name || 'غرفة'}</td>
            <td style="text-align:center;">${room.type || 'شباك'}</td>
            <td style="text-align:center; font-weight:900; font-family:monospace; font-size:11pt; color:#0f172a;">${room.widthCm}</td>
            <td style="text-align:center; font-weight:900; font-family:monospace; font-size:11pt; color:#0f172a;">${room.heightCm}</td>
            <td style="text-align:center;">${room.sides === 2 ? 'جنبين (2)' : 'جنب واحد (1)'}</td>
            <td>${room.installationType || 'تراك سقف'}</td>
            <td>${room.ceilingType || 'سقف عادي'}</td>
            <td style="font-size:8.5pt; color:#475569;">${room.notes || '—'}</td>
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
            size: A4 portrait;
            margin: 8mm 10mm;
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
            font-size: 10pt;
            line-height: 1.3;
            padding: 5px;
          }
          .sheet-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 14px 16px;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .logo-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand-logo-badge {
            width: 44px;
            height: 44px;
            background: #0f172a;
            color: #d97706;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 14pt;
            border: 2px solid #d97706;
            font-family: sans-serif;
          }
          .company-name {
            font-size: 15pt;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.1;
          }
          .doc-subtitle {
            font-size: 9.5pt;
            font-weight: 700;
            color: #b45309;
            margin-top: 2px;
          }
          .header-meta {
            text-align: left;
            font-family: monospace;
          }
          .meta-badge {
            background: #f1f5f9;
            border: 1px solid #94a3b8;
            padding: 3px 8px;
            border-radius: 5px;
            font-weight: 800;
            font-size: 10pt;
            color: #0f172a;
            display: inline-block;
          }
          .meta-date {
            font-size: 8.5pt;
            color: #64748b;
            margin-top: 3px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
          }
          .info-table td {
            padding: 6px 10px;
            border: 1px solid #cbd5e1;
            font-size: 9.5pt;
          }
          .info-label {
            font-weight: 700;
            color: #475569;
            width: 14%;
            background: #f1f5f9;
          }
          .info-val {
            font-weight: 800;
            color: #0f172a;
            width: 36%;
          }
          .section-title {
            font-size: 10.5pt;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .rooms-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .rooms-table th, .rooms-table td {
            border: 1px solid #334155;
            padding: 6px 7px;
            font-size: 9pt;
            vertical-align: middle;
          }
          .rooms-table th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 9pt;
            text-align: center;
          }
          .rooms-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .notes-box {
            background: #fffbeb;
            border: 1px solid #fde68a;
            padding: 8px 10px;
            border-radius: 6px;
            font-size: 9pt;
            color: #78350f;
            margin-bottom: 10px;
          }
          .footer-bar {
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: #64748b;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          <!-- Header -->
          <div class="header-row">
            <div class="logo-title-group">
              <div class="brand-logo-badge">AK</div>
              <div>
                <div class="company-name">مؤسسة أحمد كشك للأقمشة والستائر</div>
                <div class="doc-subtitle">كشف مقاسات ومعاينة هندسية ميدانية</div>
              </div>
            </div>
            <div class="header-meta">
              <div class="meta-badge">كشف: ${data.id}</div>
              <div class="meta-date">تاريخ الطباعة: ${new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>

          <!-- Customer & Inspection Meta Grid -->
          <table class="info-table">
            <tr>
              <td class="info-label">اسم العميل:</td>
              <td class="info-val">${data.customerName}</td>
              <td class="info-label">رقم الهاتف:</td>
              <td class="info-val" style="font-family:monospace; direction:ltr; text-align:right;">${data.phone}</td>
            </tr>
            <tr>
              <td class="info-label">العنوان:</td>
              <td class="info-val">${data.address || 'غير محدد'}</td>
              <td class="info-label">الفرع:</td>
              <td class="info-val">${data.branch || 'الفرع الرئيسي'}</td>
            </tr>
            <tr>
              <td class="info-label">الفني المسؤول:</td>
              <td class="info-val">${data.technician || 'أحمد كشك'}</td>
              <td class="info-label">موعد المعاينة:</td>
              <td class="info-val">${data.scheduledAt || 'غير محدد'}</td>
            </tr>
          </table>

          <!-- Rooms Table -->
          <div class="section-title">
            <span>مقاسات الغرف المسجلة (${data.rooms?.length || 0} غرف):</span>
          </div>

          <table class="rooms-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>الغرفة</th>
                <th style="width: 55px;">المكان</th>
                <th style="width: 65px;">العرض (سم)</th>
                <th style="width: 70px;">الارتفاع (سم)</th>
                <th style="width: 65px;">الجوانب</th>
                <th>طريقة التركيب</th>
                <th>نوع السقف</th>
                <th>ملاحظات فنية</th>
              </tr>
            </thead>
            <tbody>
              ${roomsHtml}
            </tbody>
          </table>

          ${data.notes ? `
            <div class="notes-box">
              <strong>ملاحظات عامة:</strong> ${data.notes}
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer-bar">
            <span>أحمد كشك للأقمشة والستائر الفاخرة</span>
            <span>هاتف الإدارة: 01063821000</span>
            <span>نظام كشك لإدارة خطوط الإنتاج</span>
          </div>
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

  return (
    <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-4 text-slate-900 border border-slate-200 my-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[24px]">print</span>
            <h3 className="font-black text-sm sm:text-base text-slate-900">معاينة كشف المقاسات الميداني (A4)</h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-950 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🖨️ طباعة الآن (A4 صفحة واحدة)</span>
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
        <div className="border-2 border-slate-900 rounded-xl p-5 bg-white text-slate-900 space-y-3 font-sans">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-slate-950 text-amber-500 rounded-lg flex items-center justify-center font-black text-lg border-2 border-amber-500">
                AK
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-950 leading-tight">مؤسسة أحمد كشك للأقمشة والستائر</h1>
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
            <span>مؤسسة أحمد كشك للأقمشة والستائر</span>
            <span>هاتف: 01063821000</span>
            <span>نظام كشك لإدارة خطوط الإنتاج</span>
          </div>
        </div>
      </div>
    </div>
  );
}
