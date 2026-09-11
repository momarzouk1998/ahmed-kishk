'use client';

import React from 'react';
import { formatDateOnly } from '@/lib/dateUtils';
import Logo from '@/components/Logo';
import { getBrandSettings } from '@/lib/brandSettings';
import { getBranchConfig } from '@/lib/branches';

export interface SalesInvoiceItem {
  code: string;
  name: string;
  meters: number;
  pricePerMeter: number;
  totalPrice: number;
}

export interface FabricSalesInvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  phone?: string;
  customerPhone?: string;
  branch: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  discountType: 'EGP' | 'PERCENT';
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'فيزا / كارت' | 'بالآجل / دفعات' | 'دفع متعدد / مزيج' | string;
  splitPayments?: {
    cash?: number;
    instapay?: number;
    vodafone?: number;
    visa?: number;
  };
  paidAmount: number;
  remainingAmount: number;
  status: 'تم السداد بالكامل' | 'مسدد جزئياً' | 'آجل / غير مسدد';
  notes?: string;
  isOnlineOrder?: boolean;
  shippingFee?: number;
  shippingCompany?: string;
  trackingNumber?: string;
  shippingAddress?: string;
  receiverPhone?: string;
  orderSource?: string;
}

interface FabricSalesPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: FabricSalesInvoiceData | null;
}

export default function FabricSalesPrintModal({ isOpen, onClose, data }: FabricSalesPrintModalProps) {
  if (!isOpen || !data) return null;
  const brand = getBrandSettings();
  const branchCfg = getBranchConfig(data.branch);

  // Helper to extract ONLY active payment methods
  const getActivePaymentLines = () => {
    const lines: { label: string; amount: number; icon: string }[] = [];
    if (data.splitPayments && (data.paymentMethod === 'دفع متعدد / مزيج' || data.paymentMethod?.includes('متعدد'))) {
      if (Number(data.splitPayments.cash) > 0) lines.push({ label: 'كاش', amount: Number(data.splitPayments.cash), icon: '💵' });
      if (Number(data.splitPayments.instapay) > 0) lines.push({ label: 'إنستاباي', amount: Number(data.splitPayments.instapay), icon: '⚡' });
      if (Number(data.splitPayments.vodafone) > 0) lines.push({ label: 'فودافون كاش', amount: Number(data.splitPayments.vodafone), icon: '📱' });
      if (Number(data.splitPayments.visa) > 0) lines.push({ label: 'فيزا', amount: Number(data.splitPayments.visa), icon: '💳' });
    } else {
      const meth = data.paymentMethod || 'نقدي';
      if (data.paidAmount > 0) {
        let icon = '💵';
        if (meth.includes('إنستا')) icon = '⚡';
        else if (meth.includes('فودافون')) icon = '📱';
        else if (meth.includes('فيزا')) icon = '💳';
        lines.push({ label: meth, amount: data.paidAmount, icon });
      }
    }
    return lines;
  };

  // 80mm طباعة على طابعة كاشير ثرمال
  const handlePrintCashier = () => {
    const w = window.open('', '_blank');
    if (!w) { window.print(); return; }

    const now = new Date();
    const formattedDateTime = data.date
      ? (data.date.includes('T') || data.date.includes(':')
          ? new Date(data.date).toLocaleDateString('ar-EG') + ' - ' + new Date(data.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          : formatDateOnly(data.date) + ' - ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }))
      : now.toLocaleDateString('ar-EG') + ' - ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const rows = (data.items || []).map((it, i) => `
      <tr style="border-bottom: 1px solid #000;">
        <td style="padding: 1.5mm 1mm; text-align:right;">
          <div style="font-weight:900; font-size:8.5pt; line-height:1.2;">${it.name}</div>
        </td>
        <td style="text-align:center; font-family:monospace; font-weight:900; font-size:8.5pt; padding: 1.5mm 0.5mm; border-right: 1px solid #000; border-left: 1px solid #000;">
          ${it.meters}م
        </td>
        <td style="text-align:center; font-family:monospace; font-weight:bold; font-size:8pt; padding: 1.5mm 0.5mm; border-left: 1px solid #000;">
          ${it.pricePerMeter}
        </td>
        <td style="text-align:left; font-family:monospace; font-weight:900; font-size:8.5pt; padding: 1.5mm 1mm; white-space:nowrap;">
          ${it.totalPrice.toLocaleString()} ج
        </td>
      </tr>
    `).join('');

    const activePayments = getActivePaymentLines();
    const paymentRowsHtml = activePayments.map(p => `
      <tr>
        <td class="lbl" style="font-size:8pt; padding-right:1mm;">${p.icon} مسدد ${p.label}:</td>
        <td class="v" style="font-size:8.5pt;">${p.amount.toLocaleString()} ج</td>
      </tr>
    `).join('');

    const branchPhones = [branchCfg.landline ? `ت: ${branchCfg.landline}` : '', branchCfg.phone ? `م: ${branchCfg.phone}` : ''].filter(Boolean).join(' | ');

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>فاتورة ${data.invoiceNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; direction:rtl; color:#000; font-size:8.5pt; width:68mm; max-width:68mm; margin:0 auto; padding: 2mm 1.5mm; }
        .center { text-align:center; }
        .brand { font-weight:900; font-size:11pt; letter-spacing:-0.2px; }
        .branch-title { font-weight:800; font-size:9.5pt; margin-top:0.5mm; }
        .sub { font-size:7.5pt; color:#222; margin-top:0.5mm; line-height:1.2; }
        .divider { border-top:1px dashed #000; margin:1.5mm 0; }
        .items-table { width:100%; border-collapse:collapse; border:1.5px solid #000; margin:1.5mm 0; }
        .items-table th, .items-table td { vertical-align:middle; }
        .items-table thead th { background:#f0f0f0 !important; font-size:7.5pt; font-weight:900; padding:1.2mm 0.5mm; border-bottom:1.5px solid #000; }
        .totals { width:100%; border-collapse:collapse; margin-top:1mm; }
        .totals td { padding: 0.8mm 0.5mm; font-size:8.5pt; }
        .totals .lbl { color:#111; font-weight:700; }
        .totals .v { text-align:left; font-family:monospace; font-weight:900; white-space:nowrap; padding-left:1mm; }
        .total-row td { font-size:10pt; font-weight:900; border-top:1.5px solid #000; border-bottom:1.5px solid #000; padding:1.5mm 0.5mm; }
        .foot { text-align:center; font-size:7.5pt; color:#222; margin-top:2.5mm; line-height:1.3; }
      </style></head><body>
        <div class="center">
          <div class="brand">${brand.storeName || 'مؤسسة كشك للأقمشة والستائر'}</div>
          <div class="branch-title">👑 ${branchCfg.name}</div>
          <div class="sub">${branchCfg.address}</div>
          ${branchPhones ? `<div class="sub" style="font-family:monospace; font-weight:bold;">${branchPhones}</div>` : ''}
        </div>
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; font-size:8pt; font-weight:bold;">
          <span>رقم: <b style="font-family:monospace;">${data.invoiceNumber}</b></span>
          <span style="font-size:7.5pt;">${formattedDateTime}</span>
        </div>
        <div style="font-size:8.5pt; margin-top:1mm; display:flex; justify-content:space-between;">
          <span>العميل: <b>${data.customerName || 'عميل نقدي'}</b></span>
          ${(data.phone || data.customerPhone) ? `<span style="font-family:monospace; direction:ltr; font-weight:bold; font-size:8pt;">${data.phone || data.customerPhone}</span>` : ''}
        </div>
        <div class="divider"></div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:38%; text-align:right; padding-right:1mm;">الصنف</th>
              <th style="width:18%; text-align:center; border-right: 1px solid #000; border-left: 1px solid #000;">الأمتار</th>
              <th style="width:18%; text-align:center; border-left: 1px solid #000;">سعر المتر</th>
              <th style="width:26%; text-align:left; padding-left:1mm;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="divider"></div>
        <table class="totals">
          <tr><td class="lbl">إجمالي قبل الخصم:</td><td class="v">${(data.subtotal || 0).toLocaleString()} ج</td></tr>
          ${data.discountAmount > 0 ? `<tr><td class="lbl">قيمة الخصم:</td><td class="v">-${data.discountAmount.toLocaleString()} ج</td></tr>` : ''}
          ${data.isOnlineOrder ? `<tr><td class="lbl">مصاريف الشحن:</td><td class="v">+${(data.shippingFee || 110).toLocaleString()} ج</td></tr>` : ''}
          <tr class="total-row"><td>الصافي المستحق:</td><td class="v">${data.totalAmount.toLocaleString()} ج</td></tr>
          ${paymentRowsHtml}
          <tr><td class="lbl" style="font-weight:900;">إجمالي المدفوع:</td><td class="v" style="font-weight:900;">${data.paidAmount.toLocaleString()} ج</td></tr>
          ${data.remainingAmount > 0 ? `<tr><td class="lbl" style="font-weight:900; color:#000;">المتبقي آجل:</td><td class="v" style="font-weight:900;">${data.remainingAmount.toLocaleString()} ج</td></tr>` : ''}
        </table>
        <div class="divider"></div>
        <div class="foot">
          <div style="font-weight:bold; font-size:8pt;">شكراً لتعاملكم مع مؤسسة كشك للأقمشة والستائر ✨</div>
          <div>البضاعة المباعة لا ترد ولا تستبدل بعد القص</div>
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

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
          <td>
            <strong style="color:#0f172a; display:block;">${item.name}</strong>
          </td>
          <td style="text-align:center; font-family:monospace; font-weight:700;">${item.pricePerMeter} ج</td>
          <td style="text-align:center; font-family:monospace; font-weight:900; color:#0f172a;">${item.meters} م</td>
          <td style="text-align:center; font-family:monospace; font-weight:900; color:#0f172a;">${item.totalPrice.toLocaleString()} ج</td>
        </tr>
      `;
    });

    const activePayments = getActivePaymentLines();
    const branchPhones = [branchCfg.landline ? `ت: ${branchCfg.landline}` : '', branchCfg.phone ? `م: ${branchCfg.phone}` : ''].filter(Boolean).join(' | ');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة مبيعات - ${data.invoiceNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 8mm 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; background: #ffffff; color: #0f172a; direction: rtl; font-size: 9.5pt; line-height: 1.3; padding: 5px; }
          .sheet-container { width: 100%; max-width: 100%; margin: 0 auto; border: 2px solid #0f172a; border-radius: 8px; padding: 12px 14px; background: #ffffff; }
          .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
          .logo-title-group { display: flex; align-items: center; gap: 10px; }
          .company-name { font-size: 14pt; font-weight: 900; color: #0f172a; line-height: 1.1; }
          .doc-subtitle { font-size: 9pt; font-weight: 700; color: #b45309; margin-top: 2px; }
          .header-meta { text-align: left; font-family: monospace; }
          .meta-badge { background: #f1f5f9; border: 1px solid #94a3b8; padding: 3px 8px; border-radius: 5px; font-weight: 800; font-size: 9.5pt; color: #0f172a; display: inline-block; }
          .meta-date { font-size: 8pt; color: #64748b; margin-top: 2px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
          .info-table td { padding: 5px 8px; border: 1px solid #cbd5e1; font-size: 9pt; }
          .info-label { font-weight: 700; color: #475569; width: 14%; background: #f1f5f9; }
          .info-val { font-weight: 800; color: #0f172a; width: 36%; }
          .section-title { font-size: 10pt; font-weight: 900; color: #0f172a; margin-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .items-table th, .items-table td { border: 1px solid #334155; padding: 5px 6px; font-size: 8.5pt; vertical-align: middle; }
          .items-table th { background-color: #0f172a !important; color: #ffffff !important; font-weight: 800; font-size: 8.5pt; text-align: center; }
          .items-table tr:nth-child(even) { background-color: #f8fafc; }
          .financial-card { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; }
          .fin-grid { display: flex; justify-content: space-between; gap: 8px; margin-top: 5px; }
          .fin-box { flex: 1; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; text-align: center; background: #ffffff; }
          .fin-label { font-size: 8pt; font-weight: 700; color: #64748b; display: block; margin-bottom: 2px; }
          .fin-val { font-size: 12pt; font-weight: 900; font-family: monospace; color: #0f172a; }
          .footer-bar { border-top: 1px solid #cbd5e1; padding-top: 5px; display: flex; justify-content: space-between; font-size: 8pt; color: #475569; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          <div class="header-row">
            <div class="logo-title-group">
              <div>
                <div class="company-name">${brand.storeName}</div>
                <div class="doc-subtitle">فاتورة مبيعات أقمشة • ${branchCfg.name}</div>
              </div>
            </div>
            <div class="header-meta">
              <div class="meta-badge">فاتورة: ${data.invoiceNumber}</div>
              <div class="meta-date">التاريخ: ${data.date ? formatDateOnly(data.date) : new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td class="info-label">اسم العميل:</td>
              <td class="info-val">${data.customerName}</td>
              <td class="info-label">رقم الهاتف:</td>
              <td class="info-val" style="font-family:monospace; direction:ltr; text-align:right;">${data.phone || data.customerPhone || '—'}</td>
            </tr>
            <tr>
              <td class="info-label">الفرع:</td>
              <td class="info-val">${branchCfg.name} (${branchCfg.address})</td>
              <td class="info-label">طريقة السداد:</td>
              <td class="info-val">
                ${activePayments.length > 0 ? activePayments.map(p => `${p.icon} ${p.label}: ${p.amount.toLocaleString()} ج`).join(' | ') : (data.paymentMethod || 'نقدي')}
              </td>
            </tr>
          </table>

          <div class="section-title">
            الأصناف والأقمشة المشتراة (${data.items?.length || 0} أصناف):
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th style="text-align:right;">الصنف</th>
                <th style="width: 15%;">سعر المتر</th>
                <th style="width: 15%;">الأمتار</th>
                <th style="width: 18%;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="financial-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:9pt; font-weight:800; color:#0f172a;">الملخص المالي للفاتورة:</span>
              <span style="font-size:8pt; font-weight:700; color:#166534; background:#dcfce7; border:1px solid #bbf7d0; padding:2px 6px; border-radius:4px;">
                ${data.status}
              </span>
            </div>
            <div class="fin-grid">
              <div class="fin-box">
                <span class="fin-label">إجمالي الفاتورة</span>
                <span class="fin-val">${data.totalAmount.toLocaleString()} <span style="font-size:8pt;">ج.م</span></span>
              </div>
              <div class="fin-box" style="background:#f0fdf4; border-color:#86efac;">
                <span class="fin-label" style="color:#166534;">المسدد (المدفوع)</span>
                <span class="fin-val" style="color:#14532d;">${data.paidAmount.toLocaleString()} <span style="font-size:8pt;">ج.م</span></span>
              </div>
              <div class="fin-box" style="background:#fff1f2; border-color:#fca5a5;">
                <span class="fin-label" style="color:#9f1239;">المتبقي</span>
                <span class="fin-val" style="color:#881337;">${data.remainingAmount.toLocaleString()} <span style="font-size:8pt;">ج.م</span></span>
              </div>
            </div>
          </div>

          <div class="footer-bar">
            <span>${brand.storeName} • ${branchCfg.name}</span>
            <span>${branchPhones}</span>
            <span>البضاعة المباعة لا ترد ولا تستبدل بعد القص</span>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const handlePrintWaybill = () => {
    const w = window.open('', '_blank');
    if (!w) { window.print(); return; }

    const now = new Date();
    const formattedDateTime = data.date
      ? (data.date.includes('T') || data.date.includes(':')
          ? new Date(data.date).toLocaleDateString('ar-EG') + ' - ' + new Date(data.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          : formatDateOnly(data.date) + ' - ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }))
      : now.toLocaleDateString('ar-EG') + ' - ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const isCod = data.remainingAmount > 0;
    const codAmount = isCod ? data.remainingAmount : 0;

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>بوليصة شحن ${data.invoiceNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; direction:rtl; color:#000; font-size:8.5pt; width:68mm; max-width:68mm; margin:0 auto; padding: 2mm 1.5mm; }
        .center { text-align:center; }
        .brand { font-weight:900; font-size:11pt; }
        .waybill-title { background:#000; color:#fff; font-weight:900; font-size:10pt; padding:1.5mm; border-radius:2mm; margin:2mm 0; text-align:center; }
        .divider { border-top:1px dashed #000; margin:2mm 0; }
        .box { border:1.5px solid #000; border-radius:2mm; padding:2mm; margin:2mm 0; }
        .box-title { font-weight:900; font-size:8.5pt; border-bottom:1px solid #000; padding-bottom:1mm; margin-bottom:1mm; }
        .lbl { color:#333; font-size:8pt; }
        .val { font-weight:bold; font-size:9pt; }
        .cod-badge { background:#fef08a; border:2px solid #000; padding:2mm; text-align:center; font-size:10pt; font-weight:900; border-radius:2mm; margin:2mm 0; }
        .foot { text-align:center; font-size:7.5pt; color:#222; margin-top:2mm; }
      </style></head><body>
        <div class="center">
          <div class="brand">${brand.storeName || 'مؤسسة كشك للأقمشة والستائر'}</div>
          <div style="font-size:8pt; font-weight:bold;">الفرع التجاري والأونلاين 🌐</div>
        </div>
        <div class="waybill-title">📦 بوليصة شحن طرد أونلاين</div>
        
        <div style="display:flex; justify-content:space-between; font-size:8pt; font-weight:bold;">
          <span>رقم الشحنة: <b style="font-family:monospace;">${data.invoiceNumber}</b></span>
          <span>${data.trackingNumber ? `تتبع: ${data.trackingNumber}` : ''}</span>
        </div>
        <div style="font-size:7.5pt; color:#444; text-align:left;">${formattedDateTime}</div>

        <div class="box">
          <div class="box-title">👤 بيانات المستلم (العميل)</div>
          <div><span class="lbl">الاسم: </span><span class="val">${data.customerName}</span></div>
          <div><span class="lbl">الهاتف: </span><span class="val" style="font-family:monospace; direction:ltr; display:inline-block;">${data.phone || data.customerPhone || '—'}</span></div>
          ${data.receiverPhone ? `<div><span class="lbl">هاتف بديل: </span><span class="val" style="font-family:monospace; direction:ltr; display:inline-block;">${data.receiverPhone}</span></div>` : ''}
          <div><span class="lbl">العنوان والمحافظة: </span><span class="val">${data.shippingAddress || branchCfg.address || '—'}</span></div>
          <div><span class="lbl">شركة الشحن: </span><span class="val">${data.shippingCompany || 'بوسطة'}</span></div>
        </div>

        <div class="cod-badge">
          ${isCod ? `المطلوب تحصيله عند الاستلام: ${codAmount.toLocaleString()} ج` : `✅ مسدد مسبقاً بالكامل (0 ج)`}
        </div>

        <div class="box" style="font-size:8pt;">
          <div class="box-title">📦 تفاصيل المحتويات</div>
          <div><span class="lbl">عدد الأصناف: </span><span class="val">${data.items?.length || 0} أصناف أقمشة</span></div>
          <div><span class="lbl">إجمالي الأمتار: </span><span class="val">${(data.items || []).reduce((s, it) => s + it.meters, 0)} متر</span></div>
          <div><span class="lbl">مصاريف الشحن: </span><span class="val">${(data.shippingFee || 110).toLocaleString()} ج</span></div>
        </div>

        <div class="divider"></div>
        <div class="foot">
          <div>مؤسسة كشك للأقمشة والستائر ✨</div>
          <div>خدمة العملاء: 01280042900 / 01220999355</div>
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const activePayments = getActivePaymentLines();
  const branchPhones = [branchCfg.landline ? `ت: ${branchCfg.landline}` : '', branchCfg.phone ? `م: ${branchCfg.phone}` : ''].filter(Boolean).join(' | ');

  return (
    <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-slate-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-2xl">receipt_long</span>
            <h2 className="font-display font-black text-base sm:text-lg text-slate-900">
              معاينة فاتورة المبيعات {data.isOnlineOrder && <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-lg border border-indigo-300">📦 شحن أونلاين</span>}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintCashier}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow flex items-center gap-1.5 cursor-pointer transition-colors"
              title="طباعة على طابعة الكاشير الحرارية 80 مم"
            >
              <span>🧾 فاتورة (80mm)</span>
            </button>
            <button
              type="button"
              onClick={handlePrintWaybill}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow flex items-center gap-1.5 cursor-pointer transition-colors"
              title="طباعة بوليصة شحن للطرد وشركة الشحن"
            >
              <span>📦 بوليصة شحن (Waybill)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-950 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="طباعة على ورق A4 عادى"
            >
              <span>🖨️ A4</span>
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
                <h1 className="font-black text-lg text-slate-950 leading-tight">{brand.storeName}</h1>
                <p className="text-xs font-bold text-amber-700">فاتورة مبيعات أقمشة • 👑 {branchCfg.name}</p>
                <p className="text-[11px] text-slate-500">{branchCfg.address} {branchPhones ? `(${branchPhones})` : ''}</p>
              </div>
            </div>
            <div className="text-left font-mono text-xs">
              <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-black text-slate-900">
                فاتورة: {data.invoiceNumber}
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
                <tr>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70 w-[14%]">اسم العميل:</td>
                  <td className="p-2 font-black text-slate-900 w-[36%]">{data.customerName}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70 w-[14%]">رقم الهاتف:</td>
                  <td className="p-2 font-mono font-bold text-slate-900 w-[36%]" dir="ltr">{data.phone || data.customerPhone || '—'}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">الفرع:</td>
                  <td className="p-2 font-bold text-slate-900">{branchCfg.name}</td>
                  <td className="p-2 font-bold text-slate-500 bg-slate-100/70">وسائل الدفع المستخدمة:</td>
                  <td className="p-2 font-bold text-slate-900">
                    {activePayments.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activePayments.map((p, i) => (
                          <span key={i} className="bg-slate-100 border border-slate-300 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            {p.icon} {p.label}: <span className="font-mono text-emerald-800">{p.amount.toLocaleString()} ج</span>
                          </span>
                        ))}
                      </div>
                    ) : (data.paymentMethod || 'نقدي')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 pt-1">
            <span className="font-black text-xs text-slate-900 block">
              الأصناف والأقمشة المشتراة ({data.items?.length || 0} أصناف):
            </span>
            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-950 text-white font-bold text-center">
                  <th className="p-2 border border-slate-700 w-8">#</th>
                  <th className="p-2 border border-slate-700 text-right">الصنف</th>
                  <th className="p-2 border border-slate-700 font-mono w-24">سعر المتر</th>
                  <th className="p-2 border border-slate-700 font-mono w-24">الأمتار</th>
                  <th className="p-2 border border-slate-700 font-mono w-28">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2 text-center font-bold border border-slate-300">{idx + 1}</td>
                    <td className="p-2 border border-slate-300">
                      <strong className="font-bold text-slate-900 block">{item.name}</strong>
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-700 border border-slate-300">{item.pricePerMeter} ج</td>
                    <td className="p-2 text-center font-mono font-black text-slate-950 border border-slate-300">{item.meters} م</td>
                    <td className="p-2 text-center font-mono font-black text-slate-950 border border-slate-300">{item.totalPrice.toLocaleString()} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-black text-xs text-slate-900">الملخص المالي للفاتورة:</span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                {data.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white border border-slate-200 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">إجمالي الفاتورة</span>
                <span className="font-mono font-black text-base text-slate-900 block">{data.totalAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 p-2 rounded-lg">
                <span className="text-[10px] text-emerald-800 font-bold block mb-0.5">المسدد (المدفوع)</span>
                <span className="font-mono font-black text-base text-emerald-950 block">{data.paidAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="bg-rose-50/80 border border-rose-200 p-2 rounded-lg">
                <span className="text-[10px] text-rose-800 font-bold block mb-0.5">المتبقي</span>
                <span className="font-mono font-black text-base text-rose-950 block">{data.remainingAmount.toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500 font-bold">
            <span>{brand.storeName} • {branchCfg.name}</span>
            <span>{branchPhones}</span>
            <span>البضاعة المباعة لا ترد ولا تستبدل بعد القص</span>
          </div>
        </div>
      </div>
    </div>
  );
}
