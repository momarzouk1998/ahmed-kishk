// فلترة قائمة فواتير المبيعات على السيرفر (بحث + تقسيم صفحات) — نفس شروط صفحة
// fabric-sales/page.tsx بالظبط (filteredInvoices / filteredOnlineInvoices / matchesDateGeneric)،
// بس مترجمة لشروط قاعدة بيانات عشان الصفحة متنزّلش كل الفواتير.
// كل التواريخ فى الجدول بصيغة YYYY-MM-DD وكل الفروع/طرق الدفع بقيم ثابتة (اتأكدنا من
// الداتابيز 16-10-2026)، فمقارنة النصوص فى الداتابيز = نفس مقارنة الصفحة.
import { getTodayDateStr, getYesterdayDateStr } from '@/lib/dateUtils';
import { getBranchVariants } from '@/lib/branchScope';

export type SalesDateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

export interface SalesListParams {
  tab: 'invoices' | 'online';
  dateFilter: SalesDateFilter;
  from: string;
  to: string;
  branch: string;
  payment: string;
  search: string;
}

const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function dateWhere(filter: SalesDateFilter, from: string, to: string): any | null {
  // نفس ترتيب matchesDateGeneric: لو فيه from/to بيغلبوا الفلتر.
  if (from || to) {
    const cond: any = {};
    if (from) cond.gte = from;
    if (to) cond.lte = to;
    return { date: cond };
  }
  const today = getTodayDateStr();
  if (filter === 'today') return { date: today };
  if (filter === 'yesterday') return { date: getYesterdayDateStr() };
  if (filter === 'week') {
    // diffDays بين 0 و 7 ⇐ التاريخ من (النهارده - 7 أيام) لحد النهارده.
    const start = new Date(new Date(today).getTime() - 7 * 86400000).toISOString().slice(0, 10);
    return { date: { gte: start, lte: today } };
  }
  if (filter === 'month') return { date: { startsWith: today.substring(0, 7) } };
  return null; // all / custom من غير تواريخ = كله
}

function paymentWhere(payment: string): any | null {
  if (!payment || payment === 'all') return null;
  const ors: any[] = [{ paymentType: payment }];
  const has = (s: string, insensitive = false) => ({ paymentType: { contains: s, ...(insensitive ? { mode: 'insensitive' } : {}) } });
  if (payment === 'نقدي') ors.push({ paymentType: { in: ['نقدي', 'كاش', 'نقدي (كاش)'] } });
  if (payment === 'إنستاباي') ors.push(has('إنستا'), has('انستا'), has('insta', true));
  if (payment === 'فودافون كاش') ors.push(has('فودافون'), has('vodafone', true));
  if (payment === 'فيزا / كارت') ors.push(has('فيزا'), has('كارت'), has('visa', true));
  if (payment === 'بالآجل / دفعات') ors.push(has('آجل'), has('دفعات'));
  if (payment === 'دفع متعدد / مزيج') ors.push(has('متعدد'), has('مزيج'));
  return { OR: ors };
}

/** where-clause لقائمة الفواتير (بيتضاف عليه عزل الفرع بتاع المستخدم بره). */
export function buildSalesListWhere(p: SalesListParams): any {
  const and: any[] = [];
  const from = isYmd(p.from) ? p.from : '';
  const to = isYmd(p.to) ? p.to : '';
  const dw = dateWhere(p.dateFilter, from, to);
  if (dw) and.push(dw);

  if (p.tab === 'online') {
    and.push({ isOnlineOrder: true });
    if (p.search.trim()) {
      const s = p.search;
      and.push({
        OR: [
          { customerName: { contains: s, mode: 'insensitive' } },
          { invoiceNumber: { contains: s, mode: 'insensitive' } },
          { trackingNumber: { contains: s, mode: 'insensitive' } },
          { shippingAddress: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s } },
          { AND: [{ phone: '' }, { receiverPhone: { contains: s } }] },
        ],
      });
    }
    return { AND: and };
  }

  and.push({ isOnlineOrder: false });
  if (p.search.trim()) {
    const s = p.search;
    and.push({
      OR: [
        { customerName: { contains: s, mode: 'insensitive' } },
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
      ],
    });
  }
  const pw = paymentWhere(p.payment);
  if (pw) and.push(pw);
  if (p.branch && p.branch !== 'ALL' && p.branch !== 'الكل') {
    and.push({ branch: { in: getBranchVariants(p.branch) } });
  }
  return { AND: and };
}

/** تجميع مصادر طلبات الأونلاين — منقول حرفيًا من orderSourcesCount فى الصفحة. */
export function countOrderSources(rows: { orderSource?: string | null }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  rows.forEach(inv => {
    let src = (inv.orderSource || '').trim();
    if (!src) src = 'غير محدد';
    else if (src.includes('واتساب') || src.toLowerCase().includes('whatsapp')) src = 'واتساب';
    else if (src.includes('فيس') || src.toLowerCase().includes('facebook')) src = 'فيسبوك';
    else if (src.includes('انستا') || src.toLowerCase().includes('instagram')) src = 'إنستجرام';
    else if (src.includes('تيك') || src.toLowerCase().includes('tiktok')) src = 'تيك توك';
    else if (src.includes('موقع') || src.includes('أونلاين')) src = 'الموقع';
    counts[src] = (counts[src] || 0) + 1;
  });
  return counts;
}
