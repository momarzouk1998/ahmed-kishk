import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const quotations = await prisma.quotationOrder.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });

    let fallbackQuotations: any[] = [];
    try {
      const store = await prisma.systemStore.findUnique({
        where: { key: 'ahmed_kishk_quotations_data_v4' },
      });
      if (store && Array.isArray(store.data)) {
        fallbackQuotations = store.data as any[];
      }
    } catch {}

    // نفس عزل الفرع على النسخة الاحتياطية فى SystemStore حتى لا يتسرب سجل قديم منها
    if (scope && !scope.isAdmin) {
      fallbackQuotations = fallbackQuotations.filter((q: any) => q?.branch === scope.branch);
    }

    const qMap = new Map<string, any>();
    fallbackQuotations.forEach(q => {
      if (q && q.id) qMap.set(q.id, q);
    });
    quotations.forEach(q => {
      if (q && q.id) qMap.set(q.id, q);
    });

    const combined = Array.from(qMap.values());

    // مزامنة المبالغ المسددة من سندات التحصيل فى شاشة العملاء
    let collectionsList: any[] = [];
    try {
      const colStore = await prisma.systemStore.findUnique({
        where: { key: 'ahmed_kishk_collections_v3' },
      });
      if (colStore && Array.isArray(colStore.data)) {
        collectionsList = colStore.data as any[];
      }
    } catch {}

    const normPhone = (p: string | null | undefined) => (p || '').replace(/\D/g, '').slice(-10);
    const normName = (n: string | null | undefined) => (n || '').trim().toLowerCase();

    const collectionsByCust = new Map<string, number>();
    for (const col of collectionsList) {
      const key = normPhone(col.phone) || normName(col.customerName);
      if (!key) continue;
      collectionsByCust.set(key, (collectionsByCust.get(key) || 0) + (Number(col.amount) || 0));
    }

    const updatedCombined = combined.map(q => {
      const key = normPhone(q.phone) || normName(q.customerName);
      const colAmt = key ? (collectionsByCust.get(key) || 0) : 0;
      const initialDep = Number(q.depositPaid) || 0;
      const effectivePaid = Math.max(initialDep, colAmt);
      const totalAmt = Number(q.totalAmount) || 0;
      const remaining = Math.max(0, totalAmt - effectivePaid);
      return {
        ...q,
        depositPaid: effectivePaid,
        remainingAmount: remaining,
      };
    });

    return NextResponse.json({ success: true, quotations: updatedCombined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const body = await request.json();
    const rawList = Array.isArray(body.quotations) ? body.quotations : (Array.isArray(body) ? body : [body]);

    const results = [];
    for (const item of rawList) {
      if (!item || !item.id) continue;
      const { id, inspectionId, customerName, phone, address, branch, status, totalAmount, depositPaid, remainingAmount, date, deliveryDate, estimatorName, rooms } = item;
      const effBranch = effectiveCreateBranch(scope, branch);

      const quotation = await prisma.quotationOrder.upsert({
        where: { id },
        create: {
          id,
          inspectionId: inspectionId || id,
          customerName: customerName || '',
          phone: phone || '',
          address: address || '',
          branch: effBranch,
          status: status || 'بانتظار التسعير',
          totalAmount: Number(totalAmount) || 0,
          depositPaid: Number(depositPaid) || 0,
          remainingAmount: Number(remainingAmount) || 0,
          date: date || new Date().toISOString().split('T')[0],
          deliveryDate: deliveryDate ? String(deliveryDate) : null,
          estimatorName: estimatorName || 'أحمد كشك',
          rooms: rooms || [],
        },
        update: {
          customerName: customerName || undefined,
          phone: phone || undefined,
          address: address || undefined,
          branch: scope && !scope.isAdmin ? scope.branch : (branch || undefined),
          status: status || undefined,
          totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
          depositPaid: depositPaid !== undefined ? Number(depositPaid) : undefined,
          remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
          deliveryDate: deliveryDate !== undefined ? (deliveryDate ? String(deliveryDate) : null) : undefined,
          estimatorName: estimatorName || undefined,
          rooms: rooms !== undefined ? rooms : undefined,
        },
      });
      results.push(quotation);
    }

    return NextResponse.json({ success: true, quotation: results[0], quotations: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
