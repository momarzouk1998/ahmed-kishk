'use client';

import React from 'react';
import Logo from '@/components/Logo';

export interface AccessoryItem {
  name: string;
  qty: number;
  prepared: boolean;
  detail: string;
}

export interface AccessoryPrintData {
  id: string;
  orderId?: string;
  customerName: string;
  phone: string;
  address: string;
  branch?: string;
  status?: string;
  items: AccessoryItem[];
  [key: string]: any;
}

interface AccessoriesPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AccessoryPrintData | null;
}

export default function AccessoriesPrintModal({ isOpen, onClose, data }: AccessoriesPrintModalProps) {
  if (!isOpen || !data) return null;

  const totalItemsCount = (data.items || []).reduce((sum, it) => sum + Number(it.qty || 0), 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    let itemsHtml = '';
    (data.items || []).forEach((item, idx) => {
      itemsHtml += `
        <tr>
          <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
          <td style="font-weight:bold; color:#0f172a;">${item.name}</td>
          <td style="color:#475569;">${item.detail || '—'}</td>
          <td style="text-align:center; font-family:monospace; font-weight:900; font-size:10pt; color:#0f172a;">${item.qty} ${item.name.includes('مجرى') || item.name.includes('تراك') || item.name.includes('مواسير') ? 'متر' : 'قطعة'}</td>
          <td style="text-align:center; font-weight:700; color:${item.prepared ? '#166534' : '#b45309'};">${item.prepared ? '✓ جهزت' : 'قيد التجهيز'}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>أمر صرف إكسسوارات - ${data.customerName}</title>
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
            font-size: 9.5pt;
            line-height: 1.3;
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
          .items-table tr:nth-child(even) {
            background-color: #f8fafc;
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
                <div class="doc-subtitle">أمر ورقة الإكسسوارات والتراكات والمواسير (أمين المخزن)</div>
              </div>
            </div>
            <div class="header-meta">
              <div class="meta-badge">طلب: ${data.orderId || data.id}</div>
              <div class="meta-date">تاريخ الطباعة: ${new Date().toISOString().split('T')[0]}</div>
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
          </table>

          <!-- Items Table -->
          <div class="section-title">
            أطقم التراكات والمواسير والحوامل المطلوب صرفها وتجهيزها (${data.items?.length || 0} بنود):
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 32%;">اسم الإكسسوار / التراك / الماسورة</th>
                <th>التفاصيل والتشطيب واللون</th>
                <th style="width: 14%;">الكمية</th>
                <th style="width: 14%;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
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
            <span className="material-symbols-outlined text-amber-600 text-2xl">build_circle</span>
            <h2 className="font-display font-black text-base sm:text-lg text-slate-900">معاينة أمر صرف الإكسسوارات (A4)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-950 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🖨️ طباعة ورقة الإكسسوارات (A4)</span>
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
        <div className="border-2 border-slate-900 rounded-xl p-5 bg-white text-slate-900 space-y-3 font-sans">
          {/* Header Branding */}
          <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                <Logo size="md" />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-950 leading-tight">مؤسسة أحمد كشك للأقمشة والستائر</h1>
                <p className="text-xs font-bold text-amber-700">أمر ورقة الإكسسوارات والتراكات والمواسير (أمين المخزن)</p>
              </div>
            </div>
            <div className="text-left font-mono text-xs">
              <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-black text-slate-900">
                طلب: {data.orderId || data.id}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                تاريخ: {new Date().toISOString().split('T')[0]}
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
              </tbody>
            </table>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 pt-1">
            <span className="font-black text-xs text-slate-900 block">
              أطقم التراكات والمواسير والحوامل المطلوب صرفها وتجهيزها ({data.items?.length || 0} بنود):
            </span>
            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-950 text-white font-bold text-center">
                  <th className="p-2 border border-slate-700 w-8">#</th>
                  <th className="p-2 border border-slate-700 text-right w-1/3">اسم الإكسسوار / التراك / الماسورة</th>
                  <th className="p-2 border border-slate-700 text-right">التفاصيل والتشطيب واللون</th>
                  <th className="p-2 border border-slate-700 font-mono w-24">الكمية</th>
                  <th className="p-2 border border-slate-700 w-24">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2 text-center font-bold border border-slate-300">{idx + 1}</td>
                    <td className="p-2 font-bold text-slate-900 border border-slate-300">{item.name}</td>
                    <td className="p-2 border border-slate-300 text-slate-700">{item.detail || '—'}</td>
                    <td className="p-2 text-center font-mono font-black text-slate-950 border border-slate-300">{item.qty} قطعة</td>
                    <td className={`p-2 text-center font-bold text-xs border border-slate-300 ${item.prepared ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {item.prepared ? '✓ جهزت' : 'قيد التجهيز'}
                    </td>
                  </tr>
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
