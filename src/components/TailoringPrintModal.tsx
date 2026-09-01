'use client';

import React from 'react';
import { formatDateOnly } from '@/lib/dateUtils';
import Logo from '@/components/Logo';

import WhatsAppShareButton from '@/components/WhatsAppShareButton';

export interface TailoringPrintData {
  id: string;
  orderId?: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  tailorName?: string;
  deliveryDate?: string;
  createdAt?: string;
  rooms: any[];
  [key: string]: any;
}

interface TailoringPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TailoringPrintData | null;
}

export default function TailoringPrintModal({ isOpen, onClose, data }: TailoringPrintModalProps) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    let roomsHtml = '';
    (data.rooms || []).forEach((room: any, rIdx: number) => {
      roomsHtml += `
        <tr style="background:#fffbeb; font-weight:bold; border:1px solid #cbd5e1;">
          <td colspan="5" style="padding:5px 8px; text-align:right; color:#78350f; font-size:11pt; border:1px solid #cbd5e1;">
            ${rIdx + 1}. ${room.roomName || room.name || `غرفة ${rIdx + 1}`}
          </td>
        </tr>
      `;

      if (room.heavyFabric) {
        roomsHtml += `
          <tr>
            <td style="font-weight:700; color:#334155; font-size:11pt;">قماش الجوانب (الثقيل)</td>
            <td style="font-weight:bold; font-size:11pt;">${room.heavyFabric.name}</td>
            <td style="text-align:center; font-family:monospace; font-weight:700; font-size:11.5pt;">${room.heavyFabric.meters} م (${room.heavyFabric.pieces || 'جنبين'})</td>
            <td style="text-align:center; font-size:11pt;">${room.heavyFabric.tapeType || '٣ فتلة'}</td>
            <td style="text-align:center; font-family:monospace; font-weight:900; font-size:12pt; color:#0f172a;">${room.heavyFabric.heightCm || 270} سم</td>
          </tr>
        `;
      }

      if (room.sheerFabric) {
        const liningNote = (room.sheerFabric as any).hasLining ? ` <span style="background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; border-radius:4px; padding:1px 5px; font-size:9pt; font-weight:900;">🧵 مع بطانة</span>` : '';
        roomsHtml += `
          <tr>
            <td style="font-weight:700; color:#334155; font-size:11pt;">قماش الخلفية (الشيفون)${liningNote}</td>
            <td style="font-weight:bold; font-size:11pt;">${room.sheerFabric.name}</td>
            <td style="text-align:center; font-family:monospace; font-weight:700; font-size:11.5pt;">${room.sheerFabric.meters} م (${room.sheerFabric.pieces || 'قطعة واحدة'})</td>
            <td style="text-align:center; font-size:11pt;">${room.sheerFabric.tapeType || 'ويفي'}</td>
            <td style="text-align:center; font-family:monospace; font-weight:900; font-size:12pt; color:#0f172a;">${room.sheerFabric.heightCm || 270} سم</td>
          </tr>
        `;
      }

      if (room.blackoutFabric) {
        roomsHtml += `
          <tr>
            <td style="font-weight:700; color:#334155; font-size:11pt;">عازل البلاك آوت</td>
            <td style="font-weight:bold; font-size:11pt;">${room.blackoutFabric.name}</td>
            <td style="text-align:center; font-family:monospace; font-weight:700; font-size:11.5pt;">${room.blackoutFabric.meters} م (${room.blackoutFabric.pieces || 'قطعة واحدة'})</td>
            <td style="text-align:center; font-size:11pt;">${room.blackoutFabric.tapeType || 'جراب'}</td>
            <td style="text-align:center; font-family:monospace; font-weight:900; font-size:12pt; color:#0f172a;">${room.blackoutFabric.heightCm || 270} سم</td>
          </tr>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>أمر تفصيل ورشة - ${data.customerName}</title>
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
            padding: 5px;
          }
          .sheet-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 12px 14px;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .logo-title-group {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .brand-logo-container {
            width: 44px;
            height: 44px;
            min-width: 44px;
            max-width: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 2px;
            background: #ffffff;
          }
          .brand-logo-container img {
            width: 100%;
            height: 100%;
            max-width: 40px;
            max-height: 40px;
            object-fit: contain;
            display: block;
          }
          .company-name {
            font-size: 14pt;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.1;
          }
          .doc-subtitle {
            font-size: 9pt;
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
            font-size: 9.5pt;
            color: #0f172a;
            display: inline-block;
          }
          .meta-date {
            font-size: 8pt;
            color: #64748b;
            margin-top: 2px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
          }
          .info-table td {
            padding: 5px 8px;
            border: 1px solid #cbd5e1;
            font-size: 9pt;
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
            font-size: 10pt;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .items-table th, .items-table td {
            border: 1px solid #334155;
            padding: 5px 6px;
            font-size: 8.5pt;
            vertical-align: middle;
          }
          .items-table th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 8.5pt;
            text-align: center;
          }
          .footer-bar {
            border-top: 1px solid #cbd5e1;
            padding-top: 5px;
            display: flex;
            justify-content: space-between;
            font-size: 7.5pt;
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
              <div class="brand-logo-container">
                <img src="/logo.png" alt="أحمد كشك" style="width:40px; height:40px; max-width:40px; max-height:40px; object-fit:contain; display:block;" onerror="this.onerror=null; this.parentNode.innerHTML='<svg viewBox=\\'0 0 100 100\\' width=\\'40\\' height=\\'40\\' fill=\\'none\\' xmlns=\\'http://www.w3.org/2000/svg\\'><circle cx=\\'50\\' cy=\\'50\\' r=\\'46\\' stroke=\\'#0f172a\\' stroke-width=\\'6\\'/><path d=\\'M25 72 L45 28 L53 28 L73 72 M33 56 L65 56\\' stroke=\\'#0f172a\\' stroke-width=\\'7\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><path d=\\'M48 22 L48 78 M48 50 L68 28 M48 50 L72 72\\' stroke=\\'#0f172a\\' stroke-width=\\'7\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/></svg>';" />
              </div>
              <div>
                <div class="company-name">مؤسسة أحمد كشك للأقمشة والستائر</div>
                <div class="doc-subtitle">أمر ورقة الورشة والتفصيل (للخياط والورشة)</div>
              </div>
            </div>
            <div class="header-meta">
              <div class="meta-badge">طلب: ${data.orderId || data.id}</div>
              <div class="meta-date">موعد الاستلام: ${data.deliveryDate ? formatDateOnly(data.deliveryDate) : 'مجدول'}</div>
            </div>
          </div>

          <!-- Customer Info Table -->
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
              <td class="info-label">مسؤول الخياطة:</td>
              <td class="info-val">${data.tailorName || 'أبو فهد الخياط'}</td>
              <td class="info-label">تاريخ الطلب:</td>
              <td class="info-val">${data.createdAt ? formatDateOnly(data.createdAt) : 'غير محدد'}</td>
            </tr>
          </table>

          <!-- Items Table -->
          <div class="section-title">
            تعليمات الخياطة والارتفاعات الصافية المطلوبة:
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 22%;">الطبقة / البند</th>
                <th>اسم القماش والمواصفة</th>
                <th style="width: 20%;">الكمية والقطع</th>
                <th style="width: 16%;">نوع الشريط والتشطيب</th>
                <th style="width: 16%;">الارتفاع الصافي</th>
              </tr>
            </thead>
            <tbody>
              ${roomsHtml}
            </tbody>
          </table>

          <!-- Footer -->
          <div class="footer-bar">
            <span>مؤسسة أحمد كشك للأقمشة والستائر الفاخرة</span>
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
    <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-slate-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-2xl">precision_manufacturing</span>
            <h2 className="font-display font-black text-base sm:text-lg text-slate-900">معاينة أمر تفصيل الورشة (A4)</h2>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppShareButton
              title="أمر تفصيل ورشة الستائر"
              customerName={data.customerName}
              phone={data.phone}
              detailsText={`أمر تفصيل الورشة: ${data.orderId || data.id}\nالعميل: ${data.customerName}\nتاريخ التسليم: ${data.deliveryDate || 'غير محدد'}\nعدد الغرف المطلوبة: ${data.rooms?.length || 0}`}
              targetElementId="printable-tailoring-sheet"
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

        {/* Live Preview Matching Print Layout */}
        <div id="printable-tailoring-sheet" className="border-2 border-slate-900 rounded-xl p-5 bg-white text-slate-900 space-y-3 font-sans">
          {/* Header Branding */}
          <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                <Logo size="md" />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-950 leading-tight">مؤسسة أحمد كشك للأقمشة والستائر</h1>
                <p className="text-xs font-bold text-amber-700">أمر ورقة الورشة والتفصيل (للخياط والورشة)</p>
              </div>
            </div>
            <div className="text-left font-mono text-xs">
              <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-black text-slate-900">
                طلب: {data.orderId || data.id}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                موعد الاستلام: {data.deliveryDate ? formatDateOnly(data.deliveryDate) : 'مجدول'}
              </div>
            </div>
          </div>

          {/* Customer Info Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-right text-xs">
              <tbody>
                <tr>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70 w-[14%]">اسم العميل:</td>
                  <td className="p-2 font-black text-slate-900 w-[36%]">{data.customerName}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70 w-[14%]">رقم الهاتف:</td>
                  <td className="p-2 font-mono font-bold text-slate-900 w-[36%]" dir="ltr">{data.phone}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">العنوان:</td>
                  <td className="p-2 font-bold text-slate-900">{data.address || '—'}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">الفرع:</td>
                  <td className="p-2 font-bold text-slate-900">{data.branch || 'الفرع الرئيسي'}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">مسؤول الخياطة:</td>
                  <td className="p-2 font-bold text-slate-900">{data.tailorName || 'أبو فهد الخياط'}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">تاريخ الطلب:</td>
                  <td className="p-2 font-mono text-slate-900">{data.createdAt ? formatDateOnly(data.createdAt) : 'غير محدد'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 pt-1">
            <span className="font-black text-xs text-slate-900 block">
              تعليمات الخياطة والارتفاعات الصافية المطلوبة:
            </span>
            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-950 text-white font-bold text-center">
                  <th className="p-2 border border-slate-700 w-1/4">الطبقة / البند</th>
                  <th className="p-2 border border-slate-700 text-right">اسم القماش والمواصفة</th>
                  <th className="p-2 border border-slate-700 font-mono w-28">الكمية والقطع</th>
                  <th className="p-2 border border-slate-700 w-28">نوع الشريط والتشطيب</th>
                  <th className="p-2 border border-slate-700 font-mono w-24">الارتفاع الصافي</th>
                </tr>
              </thead>
              <tbody>
                {(data.rooms || []).map((room: any, rIdx: number) => (
                  <React.Fragment key={rIdx}>
                    <tr className="bg-amber-50/70 font-bold border-t border-b border-amber-200">
                      <td colSpan={5} className="p-2 text-amber-950">
                        {rIdx + 1}. {room.roomName || room.name || `غرفة ${rIdx + 1}`}
                      </td>
                    </tr>

                    {room.heavyFabric && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-700">قماش الجوانب (الثقيل)</td>
                        <td className="p-2 font-bold text-slate-900">{room.heavyFabric.name}</td>
                        <td className="p-2 text-center font-mono font-bold">{room.heavyFabric.meters} م ({room.heavyFabric.pieces || 'جنبين'})</td>
                        <td className="p-2 text-center">{room.heavyFabric.tapeType || '٣ فتلة'}</td>
                        <td className="p-2 text-center font-mono font-black text-slate-950">{room.heavyFabric.heightCm || 270} سم</td>
                      </tr>
                    )}

                    {room.sheerFabric && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-700">قماش الخلفية (الشيفون)</td>
                        <td className="p-2 font-bold text-slate-900">{room.sheerFabric.name}</td>
                        <td className="p-2 text-center font-mono font-bold">{room.sheerFabric.meters} م ({room.sheerFabric.pieces || 'قطعة واحدة'})</td>
                        <td className="p-2 text-center">{room.sheerFabric.tapeType || 'ويفي'}</td>
                        <td className="p-2 text-center font-mono font-black text-slate-950">{room.sheerFabric.heightCm || 270} سم</td>
                      </tr>
                    )}

                    {room.blackoutFabric && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-700">عازل البلاك آوت</td>
                        <td className="p-2 font-bold text-slate-900">{room.blackoutFabric.name}</td>
                        <td className="p-2 text-center font-mono font-bold">{room.blackoutFabric.meters} م ({room.blackoutFabric.pieces || 'قطعة واحدة'})</td>
                        <td className="p-2 text-center">{room.blackoutFabric.tapeType || 'جراب'}</td>
                        <td className="p-2 text-center font-mono font-black text-slate-950">{room.blackoutFabric.heightCm || 270} سم</td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>مؤسسة أحمد كشك للأقمشة والستائر</span>
            <span>هاتف: 01063821000</span>
            <span>نظام كشك لإدارة خطوط الإنتاج</span>
          </div>
        </div>
      </div>
    </div>
  );
}
