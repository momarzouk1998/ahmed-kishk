import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere } from '@/lib/branchScope';
import { buildSalesListWhere, countOrderSources, SalesDateFilter } from '@/lib/salesListQuery';

export const dynamic = 'force-dynamic';

const DATE_FILTERS: SalesDateFilter[] = ['today', 'yesterday', 'week', 'month', 'custom', 'all'];

// نفس تطبيع GET /api/fabric-sales بالظبط (الدفع المتعدد من الملاحظات، paymentMethod).
function normalizeSale(s: any) {
  let splitPayments = s.splitPayments || undefined;
  if (!splitPayments && s.notes && s.notes.includes('[SPLIT:')) {
    try {
      const match = s.notes.match(/\[SPLIT:([^\]]+)\]/);
      if (match && match[1]) splitPayments = JSON.parse(match[1]);
    } catch {}
  }
  const cleanNotes = s.notes ? s.notes.replace(/\[SPLIT:[^\]]+\]/g, '').trim() : '';
  return { ...s, notes: cleanNotes, splitPayments, paymentMethod: s.paymentType || s.paymentMethod || 'نقدي' };
}

// GET ?tab=invoices|online&dateFilter=&from=&to=&branch=&payment=&search=&page=&pageSize=
// → صفحة واحدة من الفواتير المفلترة + العدد الكلي + الإجماليات (نفس أرقام الصفحة) —
// بدل ما الصفحة تنزّل كل الفواتير وتفلتر على الموبايل.
export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });

    const q = new URL(request.url).searchParams;
    const tab = q.get('tab') === 'online' ? 'online' : 'invoices';
    const df = (q.get('dateFilter') || 'today') as SalesDateFilter;
    const params = {
      tab: tab as 'invoices' | 'online',
      dateFilter: DATE_FILTERS.includes(df) ? df : 'today',
      from: q.get('from') || '',
      to: q.get('to') || '',
      branch: q.get('branch') || 'ALL',
      payment: q.get('payment') || 'all',
      search: q.get('search') || '',
    };
    const pageSize = Math.min(500, Math.max(1, Number(q.get('pageSize')) || 30));
    const page = Math.max(1, Number(q.get('page')) || 1);

    const scopeWhere = branchWhere(scope);
    const where = { AND: [scopeWhere, buildSalesListWhere(params)] };

    // أرقام الإجماليات: أعمدة صغيرة بس لكل الفواتير المفلترة، بنفس ترتيب الصفحة (updatedAt desc)
    // ونفس طريقة الجمع، عشان الناتج يطابق الصفحة بالظبط.
    const [rows, allCount, onlineCount] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, totalAmount: true, paidAmount: true, remainingAmount: true, shippingFee: true, isOnlineOrder: true, orderSource: true },
      }),
      prisma.salesInvoice.count({ where: scopeWhere }),
      prisma.salesInvoice.count({ where: { AND: [scopeWhere, { isOnlineOrder: true }] } }),
    ]);

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageIds = rows.slice((safePage - 1) * pageSize, safePage * pageSize).map(r => r.id);
    const full = pageIds.length ? await prisma.salesInvoice.findMany({ where: { id: { in: pageIds } } }) : [];
    const byId = new Map(full.map(r => [r.id, r]));
    const items = pageIds.map(id => byId.get(id)).filter(Boolean).map(normalizeSale);

    const metrics = tab === 'online'
      ? {
        revenue: rows.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0),
        shipping: rows.reduce((s, i) => s + (Number(i.shippingFee) || (i.isOnlineOrder ? 110 : 0)), 0),
        paid: rows.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0),
        cod: rows.reduce((s, i) => s + (Number(i.remainingAmount) || 0), 0),
        orderSources: countOrderSources(rows),
      }
      : {
        revenue: rows.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0),
        paid: rows.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0),
        remaining: rows.reduce((s, i) => s + (Number(i.remainingAmount) || 0), 0),
      };

    return NextResponse.json({ success: true, items, total, page: safePage, pageSize, totalPages, metrics, counts: { all: allCount, online: onlineCount }, ids: q.get('withIds') === '1' ? rows.map(r => r.id) : undefined });
  } catch (error: any) {
    console.error('fabric-sales list error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
