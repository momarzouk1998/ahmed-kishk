'use client';

import React from 'react';
import { formatDateOnly } from '@/lib/dateUtils';
import Logo from '@/components/Logo';
import { getBrandSettings } from '@/lib/brandSettings';

import WhatsAppShareButton from '@/components/WhatsAppShareButton';

export interface PrintRoomItem {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  sides: number;
  heavyFabricName?: string;
  heavyTapeType?: string;
  heavyTapePrice?: number;
  heavyMultiplier?: number;
  heavyMeters: number;
  heavyPrice: number;
  sheerFabricName?: string;
  sheerTapeType?: string;
  sheerTapePrice?: number;
  sheerMultiplier?: number;
  sheerMeters: number;
  sheerPrice: number;
  sheerLiningEnabled?: boolean;
  sheerLiningPricePerMeter?: number;
  blackoutFabricName?: string;
  blackoutTapeType?: string;
  blackoutTapePrice?: number;
  blackoutMultiplier?: number;
  blackoutMeters: number;
  blackoutPrice: number;
  installationCategory?: 'تراك' | 'مواسير فورجيه';
  installationType?: string;
  trackMeters: number;
  trackPrice: number;
  pipeTypeDescription?: string;
  pipeColor?: string;
  pipePricePerMeter?: number;
  pipeAccessories?: {
    doubleBrackets: number;
    singleBrackets: number;
    sideCaps: number;
    doubleRings: number;
    decorHangers: number;
  };
  blackoutTrackEnabled?: boolean;
  blackoutTrackPrice?: number;
  blackoutTrackMeters?: number;
  tapeMeters: number;
  tapePrice: number;
  tailorPricePerSide: number;
  installFee: number;
  transportFeeEnabled?: boolean;
  transportFee?: number;
  totalSellPrice: number;
}

export interface PrintContractData {
  id: string;
  inspectionId: string;
  customerName: string;
  phone: string;
  address: string;
  branch?: string;
  date: string;
  deliveryDate?: string;
  estimatorName: string;
  totalAmount: number;
  discountAmount?: number;
  depositPaid: number;
  remainingAmount: number;
  rooms: PrintRoomItem[];
}

interface ContractPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PrintContractData | null;
}

function getHardwareDescription(room: PrintRoomItem) {
  const isPipe = room.installationCategory === 'مواسير فورجيه' || (room.installationType && room.installationType.includes('مواسير'));
  const parts: string[] = [];

  if (isPipe) {
    const pipeMeters = (room.widthCm || 250) / 100;
    const pipeDesc = room.pipeTypeDescription || 'سادة';
    const pipeCol = room.pipeColor || 'فضى';
    const pipeP = room.pipePricePerMeter || 0;
    parts.push(`ماسورة فورجيه ${pipeDesc} ${pipeCol} (${pipeMeters}م × ${pipeP}ج)`);

    const acc = room.pipeAccessories;
    if (acc) {
      const accParts: string[] = [];
      if (acc.doubleBrackets > 0) accParts.push(`${acc.doubleBrackets} حامل مجوز`);
      if (acc.singleBrackets > 0) accParts.push(`${acc.singleBrackets} حامل مفرد`);
      if (acc.sideCaps > 0) accParts.push(`${acc.sideCaps} طبات`);
      if (acc.doubleRings > 0) accParts.push(`${acc.doubleRings} حلقات`);
      if (acc.decorHangers > 0) accParts.push(`${acc.decorHangers} شماعات`);
      if (accParts.length > 0) {
        parts.push(`إكسسوارات (${accParts.join(' + ')})`);
      }
    }

    if (room.blackoutTrackEnabled) {
      const bTrackPrice = room.blackoutTrackPrice || 100;
      parts.push(`تراك بلاك آوت (${pipeMeters}م × ${bTrackPrice}ج)`);
    }
  } else {
    const trackP = room.trackPrice || 0;
    const trackM = room.trackMeters || (room.widthCm || 250) / 100;
    parts.push(`تراك ألومنيوم (${trackM}م × ${trackP}ج)`);
  }

  return parts.join(' + ');
}

function getRoomBreakdown(room: PrintRoomItem) {
  const heavyFabricCost = room.heavyMeters * (room.heavyPrice || 0);
  const sheerFabricCost = room.sheerMeters * (room.sheerPrice || 0);
  const blackoutFabricCost = room.blackoutMeters * (room.blackoutPrice || 0);
  const liningCost = (room.sheerLiningEnabled && room.sheerLiningPricePerMeter) ? room.sheerMeters * room.sheerLiningPricePerMeter : 0;
  const roomTotal = room.totalSellPrice;
  const fittingsTotal = Math.max(0, roomTotal - heavyFabricCost - sheerFabricCost - blackoutFabricCost - liningCost);
  const heavyTapeP = room.heavyTapePrice ?? room.tapePrice ?? 0;
  const sheerTapeP = room.sheerTapePrice ?? room.tapePrice ?? 0;
  const blackoutTapeP = room.blackoutTapePrice ?? 0;
  const tapeParts: string[] = [];
  if (room.heavyMeters > 0) tapeParts.push(`${room.heavyMeters}م×${heavyTapeP}ج`);
  if (room.sheerMeters > 0) tapeParts.push(`${room.sheerMeters}م×${sheerTapeP}ج`);
  if (room.blackoutMeters > 0 && blackoutTapeP > 0) tapeParts.push(`${room.blackoutMeters}م×${blackoutTapeP}ج`);
  const tapeDescription = tapeParts.join(' + ') || `${room.tapeMeters}م × ${room.tapePrice || 0}ج`;
  return { fittingsTotal, roomTotal, tapeDescription };
}

export default function ContractPrintModal({ isOpen, onClose, data }: ContractPrintModalProps) {
  if (!isOpen || !data) return null;
  const brand = getBrandSettings();

  // #FIX: مبقاش بيعيد حساب الإجمالي من الصفر (كان بيتجاهل الخصم كمان) — بيستخدم
  // totalAmount/remainingAmount المحفوظين فعليًا، نفس الأرقام الظاهرة فى صفحة التسعير.
  const calculatedTotal = data.totalAmount;
  const calculatedRemaining = data.remainingAmount;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    let roomsRowsHtml = '';
    (data.rooms || []).forEach((room, rIdx) => {
      roomsRowsHtml += `
        <tr style="background:#fffbeb; font-weight:bold; border:1px solid #cbd5e1;">
          <td colspan="5" style="padding:5px 8px; text-align:right; color:#78350f; font-size:11pt; border:1px solid #cbd5e1;">
            ${rIdx + 1}. ${room.name} — (عرض: ${room.widthCm} سم × ارتفاع: ${room.heightCm} سم | ${room.sides === 2 ? 'جنبين' : 'جنب واحد'})
          </td>
        </tr>
      `;

      if (room.heavyMeters > 0) {
        roomsRowsHtml += `
          <tr>
            <td style="font-weight:700; color:#334155; font-size:11pt;">1. قماش الجوانب (الثقيل)</td>
            <td style="font-size:11pt;">${room.heavyFabricName || 'قطيفة جاجوار تركيات'} <span style="font-size:9.5pt; color:#64748b;">(شريط ${room.heavyTapeType || '٣ فتلة'} ×${room.heavyMultiplier ?? 2.0})</span></td>
            <td style="text-align:center; font-family:monospace; font-weight:700; font-size:11.5pt;">${room.heavyMeters} م</td>
            <td style="text-align:center; font-family:monospace; font-size:11pt;">${room.heavyPrice || 0} ج</td>
            <td style="text-align:center; font-family:monospace; font-weight:800; color:#0f172a; font-size:11.5pt;">${(room.heavyMeters * (room.heavyPrice || 0)).toLocaleString()} ج</td>
          </tr>
        `;
      }

      if (room.sheerMeters > 0) {
        roomsRowsHtml += `
          <tr>
            <td style="font-weight:700; color:#334155; font-size:11pt;">2. قماش الخلفية (الشيفون)</td>
            <td style="font-size:11pt;">${room.sheerFabricName || 'شيفون حرير فاخر'} <span style="font-size:9.5pt; color:#64748b;">(شريط ${room.sheerTapeType || 'ويفي'} ×${room.sheerMultiplier ?? 2.5})</span></td>
            <td style="text-align:center; font-family:monospace; font-weight:700; font-size:11.5pt;">${room.sheerMeters} م</td>
            <td style="text-align:center; font-family:monospace; font-size:11pt;">${room.sheerPrice || 0} ج</td>
            <td style="text-align:center; font-family:monospace; font-weight:800; color:#0f172a; font-size:11.5pt;">${(room.sheerMeters * (room.sheerPrice || 0)).toLocaleString()} ج</td>
          </tr>
        `;
        if (room.sheerLiningEnabled && room.sheerLiningPricePerMeter) {
          const liningTotal = room.sheerMeters * room.sheerLiningPricePerMeter;
          roomsRowsHtml += `
            <tr style="background:#eff6ff;">
              <td style="font-weight:700; color:#1d4ed8; font-size:10.5pt; padding-right:20px;">↳ 🧵 بطانة شيفون</td>
              <td style="font-size:10.5pt; color:#1e40af;">بطانة إضافية</td>
              <td style="text-align:center; font-family:monospace; font-weight:700; font-size:11pt;">${room.sheerMeters} م</td>
              <td style="text-align:center; font-family:monospace; font-size:11pt;">${room.sheerLiningPricePerMeter} ج</td>
              <td style="text-align:center; font-family:monospace; font-weight:800; color:#1d4ed8; font-size:11.5pt;">${liningTotal.toLocaleString()} ج</td>
            </tr>
          `;
        }
      }

      if (room.blackoutMeters > 0 && room.blackoutFabricName) {
        roomsRowsHtml += `
          <tr>
            <td style="font-weight:700; color:#334155; font-size:11pt;">3. عازل البلاك آوت</td>
            <td style="font-size:11pt;">${room.blackoutFabricName || 'بلاك آوت عازل'} <span style="font-size:9.5pt; color:#64748b;">(معامل ×${room.blackoutMultiplier ?? 1.20})</span></td>
            <td style="text-align:center; font-family:monospace; font-weight:700; font-size:11.5pt;">${room.blackoutMeters} م</td>
            <td style="text-align:center; font-family:monospace; font-size:11pt;">${room.blackoutPrice || 0} ج</td>
            <td style="text-align:center; font-family:monospace; font-weight:800; color:#0f172a; font-size:11.5pt;">${(room.blackoutMeters * (room.blackoutPrice || 0)).toLocaleString()} ج</td>
          </tr>
        `;
      }

      // Accessories
      const installF = room.installFee || 0;
      const { fittingsTotal, roomTotal, tapeDescription } = getRoomBreakdown(room);
      const hardwareDesc = getHardwareDescription(room);
      const transportDesc = (room.transportFeeEnabled && (room.transportFee || 0) > 0) ? ` + نقل (${room.transportFee}ج)` : '';

      roomsRowsHtml += `
        <tr style="background:#f8fafc; font-size:10pt; color:#475569;">
          <td style="font-weight:700;">التجهيزات والمصنعيات</td>
          <td colspan="3">
            ${hardwareDesc} + شريط (${tapeDescription}) + تركيب (${installF}ج)${transportDesc}
          </td>
          <td style="text-align:center; font-family:monospace; font-weight:700; color:#0f172a; font-size:11pt;">${fittingsTotal.toLocaleString()} ج</td>
        </tr>
        <tr style="background:#f1f5f9; font-weight:900; border-bottom:2px solid #cbd5e1;">
          <td colspan="4" style="text-align:left; padding-left:10px; color:#0f172a; font-size:11pt;">إجمالي تكلفة ${room.name}:</td>
          <td style="text-align:center; font-family:monospace; font-size:12pt; color:#b45309; background:#fef3c7;">${roomTotal.toLocaleString()} ج</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>عقد ومقايسة - ${data.customerName}</title>
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
          .financial-card {
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 8px;
          }
          .fin-grid {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 5px;
          }
          .fin-box {
            flex: 1;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            text-align: center;
            background: #ffffff;
          }
          .fin-label {
            font-size: 8pt;
            font-weight: 700;
            color: #64748b;
            display: block;
            margin-bottom: 2px;
          }
          .fin-val {
            font-size: 12pt;
            font-weight: 900;
            font-family: monospace;
            color: #0f172a;
          }
          .fin-box-paid {
            background: #f0fdf4;
            border-color: #86efac;
          }
          .fin-box-paid .fin-label { color: #166534; }
          .fin-box-paid .fin-val { color: #14532d; }
          .fin-box-remain {
            background: #fff1f2;
            border-color: #fca5a5;
          }
          .fin-box-remain .fin-label { color: #9f1239; }
          .fin-box-remain .fin-val { color: #881337; }
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
                <div class="company-name">${brand.storeName}</div>
                <div class="doc-subtitle">عقد توريد وتركيب ستائر ومقايسة معتمدة</div>
              </div>
            </div>
            <div class="header-meta">
              <div class="meta-badge">عقد: ${data.id}</div>
              <div class="meta-date">تاريخ التعاقد: ${data.date ? formatDateOnly(data.date) : new Date().toISOString().split('T')[0]}</div>
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
              <td class="info-label">عنوان التركيب:</td>
              <td class="info-val">${data.address || 'غير محدد'}</td>
              <td class="info-label">الفرع:</td>
              <td class="info-val">${data.branch || 'الفرع الرئيسي'}</td>
            </tr>
            <tr>
              <td class="info-label">مسؤول المبيعات:</td>
              <td class="info-val">${data.estimatorName || 'أحمد كشك'}</td>
              <td class="info-label">موعد التسليم:</td>
              <td class="info-val">${data.deliveryDate ? formatDateOnly(data.deliveryDate) : 'مجدول حسب العقد'}</td>
            </tr>
          </table>

          <!-- Items Table -->
          <div class="section-title">
            تفاصيل غرف المقايسة والأقمشة المختارة (${data.rooms?.length || 0} غرف):
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25%;">البند / الطبقة</th>
                <th>الأقمشة والمواصفات المختارة</th>
                <th style="width: 12%;">الأمتار</th>
                <th style="width: 14%;">سعر الوحدة</th>
                <th style="width: 15%;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${roomsRowsHtml}
            </tbody>
          </table>

          <!-- Financial Breakdown Card -->
          <div class="financial-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:9pt; font-weight:800; color:#0f172a;">الملخص المالي والتحصيل:</span>
              <span style="font-size:8pt; font-weight:700; color:#166534; background:#dcfce7; border:1px solid #bbf7d0; padding:2px 6px; border-radius:4px;">
                ✓ العقد معتمد ومسدد العربون
              </span>
            </div>
            <div class="fin-grid">
              <div class="fin-box">
                <span class="fin-label">إجمالي مقايسة العقد</span>
                <span class="fin-val">${data.totalAmount.toLocaleString()} <span style="font-size:8pt;">ج.م</span></span>
              </div>
              ${(data.discountAmount || 0) > 0 ? `
              <div class="fin-box">
                <span class="fin-label">الخصم الممنوح</span>
                <span class="fin-val">${(data.discountAmount || 0).toLocaleString()} <span style="font-size:8pt;">ج.م</span></span>
              </div>
              ` : ''}
              <div class="fin-box fin-box-paid">
                <span class="fin-label">العربون المسدد (المدفوع)</span>
                <span class="fin-val">${data.depositPaid.toLocaleString()} <span style="font-size:8pt;">ج.م</span></span>
              </div>
              <div class="fin-box fin-box-remain">
                <span class="fin-label">المتبقي للتحصيل عند التركيب</span>
                <span class="fin-val">${data.remainingAmount.toLocaleString()} <span style="font-size:8pt;">ج.م</span></span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-bar">
            <span>${brand.storeName}</span>
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
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-2xl">description</span>
            <h2 className="font-display font-black text-base sm:text-lg text-slate-900">معاينة مقايسة وعقد العميل (A4)</h2>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppShareButton
              title="العقد والمقايسة"
              customerName={data.customerName}
              phone={data.phone}
              detailsText={`عقد ومقايسة رقم: ${data.id}\nالعميل: ${data.customerName}\nالإجمالي: ${calculatedTotal} ج.م\nالمدفوع: ${data.depositPaid || 0} ج.م\nالمتبقي: ${calculatedRemaining} ج.م`}
              targetElementId="printable-contract-sheet"
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
        <div id="printable-contract-sheet" className="border-2 border-slate-900 rounded-xl p-5 bg-white text-slate-900 space-y-3 font-sans">
          {/* Header Branding */}
          <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                <Logo size="md" />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-950 leading-tight">{brand.storeName}</h1>
                <p className="text-xs font-bold text-amber-700">عقد توريد وتركيب ستائر ومقايسة معتمدة</p>
              </div>
            </div>
            <div className="text-left font-mono text-xs">
              <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-black text-slate-900">
                عقد: {data.id}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                تاريخ: {data.date ? formatDateOnly(data.date) : new Date().toISOString().split('T')[0]}
              </div>
            </div>
          </div>

          {/* Customer Info Table */}
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
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">عنوان التركيب:</td>
                  <td className="p-2 font-bold text-slate-900">{data.address || '—'}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">الفرع:</td>
                  <td className="p-2 font-bold text-slate-900">{data.branch || 'الفرع الرئيسي'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">مسؤول التسعير:</td>
                  <td className="p-2 font-bold text-slate-900">{data.estimatorName || 'أحمد كشك'}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">موعد التسليم:</td>
                  <td className="p-2 font-mono text-slate-900">{data.deliveryDate ? formatDateOnly(data.deliveryDate) : 'مجدول حسب العقد'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rooms Table */}
          <div className="space-y-1.5 pt-1">
            <span className="font-black text-xs text-slate-900 block">
              تفاصيل غرف المقايسة والأقمشة المختارة ({data.rooms?.length || 0} غرف):
            </span>
            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-950 text-white font-bold text-center">
                  <th className="p-2 border border-slate-700 w-1/4">البند / الطبقة</th>
                  <th className="p-2 border border-slate-700 text-right">الأقمشة والمواصفات المختارة</th>
                  <th className="p-2 border border-slate-700 font-mono w-20">الأمتار</th>
                  <th className="p-2 border border-slate-700 font-mono w-24">سعر الوحدة</th>
                  <th className="p-2 border border-slate-700 font-mono w-24">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((room, rIdx) => (
                  <React.Fragment key={room.id}>
                    <tr className="bg-amber-50/70 font-bold border-t border-b border-amber-200">
                      <td colSpan={5} className="p-2 text-amber-950">
                        {rIdx + 1}. {room.name} — (عرض: {room.widthCm} سم × ارتفاع: {room.heightCm} سم | {room.sides === 2 ? 'جنبين' : 'جنب واحد'})
                      </td>
                    </tr>

                    {room.heavyMeters > 0 && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-700">1. قماش الجوانب (الثقيل)</td>
                        <td className="p-2 text-slate-900">
                          {room.heavyFabricName || 'قطيفة جاجوار تركيات'}
                          <span className="text-[11px] text-slate-500 block">شريط {room.heavyTapeType || '٣ فتلة'} (معامل ×{room.heavyMultiplier ?? 2.0})</span>
                        </td>
                        <td className="p-2 text-center font-mono font-bold">{room.heavyMeters} م</td>
                        <td className="p-2 text-center font-mono">{room.heavyPrice} ج</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">{(room.heavyMeters * room.heavyPrice).toLocaleString()} ج</td>
                      </tr>
                    )}

                    {room.sheerMeters > 0 && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-700">2. قماش الخلفية (الشيفون)</td>
                        <td className="p-2 text-slate-900">
                          {room.sheerFabricName || 'شيفون حرير فاخر'}
                          <span className="text-[11px] text-slate-500 block">شريط {room.sheerTapeType || 'ويفي'} (معامل ×{room.sheerMultiplier ?? 2.5})</span>
                        </td>
                        <td className="p-2 text-center font-mono font-bold">{room.sheerMeters} م</td>
                        <td className="p-2 text-center font-mono">{room.sheerPrice} ج</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">{(room.sheerMeters * room.sheerPrice).toLocaleString()} ج</td>
                      </tr>
                    )}

                    {room.sheerMeters > 0 && room.sheerLiningEnabled && room.sheerLiningPricePerMeter ? (
                      <tr className="border-b border-blue-200 bg-blue-50/50">
                        <td className="p-2 font-bold text-blue-800 pr-5">↳ 🧵 بطانة شيفون</td>
                        <td className="p-2 text-blue-700 text-xs">بطانة إضافية</td>
                        <td className="p-2 text-center font-mono font-bold text-blue-800">{room.sheerMeters} م</td>
                        <td className="p-2 text-center font-mono text-blue-800">{room.sheerLiningPricePerMeter} ج</td>
                        <td className="p-2 text-center font-mono font-bold text-blue-900">{(room.sheerMeters * room.sheerLiningPricePerMeter).toLocaleString()} ج</td>
                      </tr>
                    ) : null}



                    {room.blackoutMeters > 0 && room.blackoutFabricName && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-700">3. عازل البلاك آوت</td>
                        <td className="p-2 text-slate-900">
                          {room.blackoutFabricName || 'بلاك آوت عازل'}
                          <span className="text-[11px] text-slate-500 block">(معامل ×{room.blackoutMultiplier ?? 1.20})</span>
                        </td>
                        <td className="p-2 text-center font-mono font-bold">{room.blackoutMeters} م</td>
                        <td className="p-2 text-center font-mono">{room.blackoutPrice} ج</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">{(room.blackoutMeters * room.blackoutPrice).toLocaleString()} ج</td>
                      </tr>
                    )}

                    {(() => {
                      const instF = room.installFee || 0;
                      const { fittingsTotal, roomTotal, tapeDescription } = getRoomBreakdown(room);
                      const hardwareDesc = getHardwareDescription(room);
                      const transportDesc = (room.transportFeeEnabled && (room.transportFee || 0) > 0) ? ` + نقل (${room.transportFee}ج)` : '';

                      return (
                        <>
                          <tr className="border-b border-slate-200 text-xs bg-slate-50/50">
                            <td className="p-2 font-bold text-slate-600">التجهيزات والمصنعيات</td>
                            <td colSpan={3} className="p-2 text-slate-600">
                              {hardwareDesc} + شريط ({tapeDescription}) + تركيب ({instF}ج){transportDesc}
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-slate-900">
                              {fittingsTotal.toLocaleString()} ج
                            </td>
                          </tr>

                          <tr className="bg-slate-100 font-black border-b-2 border-slate-300">
                            <td colSpan={4} className="p-2 text-left pl-4 text-slate-900">إجمالي تكلفة {room.name}:</td>
                            <td className="p-2 text-center font-mono text-amber-950 bg-amber-100/60 font-bold">{roomTotal.toLocaleString()} ج</td>
                          </tr>
                        </>
                      );
                    })()}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-black text-xs text-slate-900">الملخص المالي والتحصيل:</span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                ✓ العقد معتمد ومسدد العربون
              </span>
            </div>
            <div className={`grid ${(data.discountAmount || 0) > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center`}>
              <div className="bg-white border border-slate-200 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">إجمالي مقايسة العقد</span>
                <span className="font-mono font-black text-base text-slate-900 block">{calculatedTotal.toLocaleString()} ج.م</span>
              </div>
              {(data.discountAmount || 0) > 0 && (
                <div className="bg-rose-50/80 border border-rose-200 p-2 rounded-lg">
                  <span className="text-[10px] text-rose-700 font-bold block mb-0.5">الخصم الممنوح</span>
                  <span className="font-mono font-black text-base text-rose-800 block">{(data.discountAmount || 0).toLocaleString()} ج.م</span>
                </div>
              )}
              <div className="bg-emerald-50/80 border border-emerald-200 p-2 rounded-lg">
                <span className="text-[10px] text-emerald-800 font-bold block mb-0.5">العربون المسدد</span>
                <span className="font-mono font-black text-base text-emerald-950 block">{(data.depositPaid || 0).toLocaleString()} ج.م</span>
              </div>
              <div className="bg-rose-50/80 border border-rose-200 p-2 rounded-lg">
                <span className="text-[10px] text-rose-800 font-bold block mb-0.5">المتبقي للتحصيل</span>
                <span className="font-mono font-black text-base text-rose-950 block">{calculatedRemaining.toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{brand.storeName}</span>
            <span>هاتف: 01063821000</span>
            <span>نظام كشك لإدارة خطوط الإنتاج</span>
          </div>
        </div>
      </div>
    </div>
  );
}
