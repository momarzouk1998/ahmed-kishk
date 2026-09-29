import { formatDateOnly, getTodayDateStr } from '@/lib/dateUtils';
import { getBrandSettings } from '@/lib/brandSettings';
import { getBranchConfig } from '@/lib/branches';

export interface CollectionReceiptData {
  id: string;
  date?: string;
  customerName: string;
  phone?: string;
  amount: number;
  method?: string;
  treasury?: string;
  notes?: string;
  branch?: string;
  /** رصيد العميل الحالي المتبقي عليه بعد السند ده — اختياري، لو مش موجود بيتجاهل السطر. */
  remainingAfter?: number;
}

/**
 * إيصال تحصيل — طباعة حرارية (كاشير) 80مم، نفس ستايل إيصال البيع بالظبط، عشان
 * الزبون لما يسدد باقي حسابه يقدر ياخد إيصال ورقي فورًا زي أي فاتورة كاشير.
 */
export function printCollectionReceipt(data: CollectionReceiptData) {
  const w = window.open('', '_blank');
  if (!w) { window.print(); return; }

  const brand = getBrandSettings();
  const branchCfg = getBranchConfig(data.branch);

  const now = new Date();
  const formattedDateTime = data.date
    ? (data.date.includes('T') || data.date.includes(':')
        ? new Date(data.date).toLocaleDateString('ar-EG') + ' - ' + new Date(data.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : formatDateOnly(data.date) + ' - ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }))
    : now.toLocaleDateString('ar-EG') + ' - ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const branchLandline = branchCfg.landline ? `ت: ${branchCfg.landline}` : '';
  const branchMobile = branchCfg.phone ? `م: ${branchCfg.phone}` : '';
  const branchPhones = [branchLandline, branchMobile].filter(Boolean).join(' | ');

  const methodIcon = (m: string) => {
    if (m.includes('فودافون')) return '📱';
    if (m.includes('إنستا') || m.includes('انستا')) return '⚡';
    if (m.includes('فيزا') || m.includes('كارت')) return '💳';
    if (m.includes('شيك')) return '🏦';
    return '💵';
  };

  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8"><title>إيصال تحصيل ${data.id}</title>
    <style>
      @page { size: 80mm 297mm; margin: 0; }
      * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
      body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; direction:rtl; color:#000; font-size:11pt; width:68mm; max-width:68mm; margin:0 auto; padding: 2mm 1.5mm; font-weight:700; }
      .center { text-align:center; }
      .brand { font-weight:900; font-size:14pt; letter-spacing:-0.2px; color:#000; }
      .branch-title { font-weight:900; font-size:12.5pt; margin-top:0.5mm; color:#000; }
      .address-line { font-size:11pt; color:#000; font-weight:900; margin-top:0.8mm; line-height:1.25; }
      .phones-line { font-size:11pt; color:#000; font-weight:900; margin-top:0.8mm; line-height:1.25; font-family:monospace, sans-serif; }
      .divider { border-top:1.5px dashed #000; margin:1.5mm 0; }
      .badge { text-align:center; font-weight:900; font-size:12.5pt; background:#f0f0f0; border:1.5px solid #000; border-radius:2mm; padding:1.5mm 0; margin:1.5mm 0; }
      .row { display:flex; justify-content:space-between; font-size:11pt; font-weight:900; color:#000; margin-top:1mm; }
      .row .lbl { color:#333; }
      .amount-box { text-align:center; border:2px solid #000; border-radius:2mm; padding:2.5mm 0; margin:2mm 0; }
      .amount-box .lbl { font-size:11pt; font-weight:900; }
      .amount-box .val { font-size:18pt; font-weight:900; font-family:monospace; margin-top:1mm; }
      .foot { text-align:center; color:#000; margin-top:2.5mm; line-height:1.3; }
      .policy-box { border:1.5px solid #000; border-radius:1.5mm; padding:1.5mm 1mm; font-weight:900; font-size:10.5pt; color:#000; margin-top:1.5mm; line-height:1.25; background:#fff; }
    </style></head><body>
      <div class="center">
        <div class="brand">${brand.storeName || 'مؤسسة كشك للأقمشة والستائر'}</div>
        <div class="branch-title">👑 ${branchCfg.name}</div>
        <div class="address-line">📍 ${branchCfg.address}</div>
        ${branchPhones ? `<div class="phones-line">📞 ${branchPhones}</div>` : ''}
      </div>
      <div class="divider"></div>
      <div class="badge">🧾 إيصال تحصيل</div>
      <div class="row"><span class="lbl">رقم السند:</span><span style="font-family:monospace;">${data.id}</span></div>
      <div class="row"><span class="lbl">التاريخ:</span><span style="font-family:monospace;">${formattedDateTime}</span></div>
      <div class="divider"></div>
      <div class="row"><span class="lbl">العميل:</span><span>${data.customerName}</span></div>
      ${data.phone ? `<div class="row"><span class="lbl">الهاتف:</span><span style="font-family:monospace; direction:ltr;">${data.phone}</span></div>` : ''}
      <div class="divider"></div>
      <div class="amount-box">
        <div class="lbl">${methodIcon(data.method || '')} المبلغ المحصّل (${data.method || 'نقدي'})</div>
        <div class="val">${(Number(data.amount) || 0).toLocaleString()} ج</div>
      </div>
      ${data.treasury ? `<div class="row"><span class="lbl">الخزينة:</span><span>${data.treasury}</span></div>` : ''}
      ${data.remainingAfter !== undefined ? `<div class="row"><span class="lbl">المتبقي على العميل:</span><span style="font-family:monospace;">${(Number(data.remainingAfter) || 0).toLocaleString()} ج</span></div>` : ''}
      ${data.notes ? `<div class="row"><span class="lbl">ملاحظات:</span><span>${data.notes}</span></div>` : ''}
      <div class="divider"></div>
      <div class="foot">
        <div style="font-weight:900; font-size:11pt; color:#000;">شكراً لتعاملكم مع مؤسسة كشك للأقمشة والستائر ✨</div>
        <div class="policy-box">هذا الإيصال دليل استلام المبلغ الموضح أعلاه فقط</div>
      </div>
    </body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 300);
}
