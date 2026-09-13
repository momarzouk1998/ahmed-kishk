import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { getTodayDateStr } from '@/lib/dateUtils';
import { assertPagePermission } from '@/lib/permissionsServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
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

    // دمج أوردرات خط الإنتاج (Pipeline Orders) لضمان ظهور العقود المحولة للقص والورشة
    try {
      const pipelineOrders = await prisma.pipelineOrder.findMany({
        where: branchWhere(scope),
        orderBy: { updatedAt: 'desc' },
      });
      let fallbackOrders: any[] = [];
      try {
        const pStore = await prisma.systemStore.findUnique({
          where: { key: 'ahmed_kishk_pipeline_orders_v5' },
        });
        if (pStore && Array.isArray(pStore.data)) {
          fallbackOrders = pStore.data as any[];
        }
      } catch {}

      if (scope && !scope.isAdmin) {
        fallbackOrders = fallbackOrders.filter((o: any) => o?.branch === scope.branch);
      }

      const allPipeline = [...fallbackOrders, ...pipelineOrders];
      allPipeline.forEach(o => {
        if (!o) return;
        const key = o.orderId || o.id;
        if (!key) return;
        const existing = qMap.get(key) || qMap.get(o.id) || qMap.get(o.orderId) || Array.from(qMap.values()).find(q => q.customerName && o.customerName && q.customerName === o.customerName);
        if (existing) {
          qMap.set(existing.id, {
            ...existing,
            status: o.status || existing.status,
            depositPaid: Math.max(Number(existing.depositPaid) || 0, Number(o.depositPaid) || 0),
            remainingAmount: Number(o.remainingAmount) !== undefined ? Number(o.remainingAmount) : existing.remainingAmount,
            paymentMethod: o.paymentMethod || existing.paymentMethod,
            splitPayments: o.splitPayments || existing.splitPayments,
          });
        } else {
          qMap.set(key, {
            id: key,
            inspectionId: o.inspectionId || key,
            customerName: o.customerName || '',
            phone: o.phone || '',
            address: o.address || '',
            branch: o.branch,
            status: o.status || 'في المقص',
            totalAmount: Number(o.totalAmount) || 0,
            discountAmount: Number(o.discountAmount) || 0,
            depositPaid: Number(o.depositPaid) || 0,
            remainingAmount: Number(o.remainingAmount) || 0,
            paymentMethod: o.paymentMethod || 'نقدي (كاش)',
            splitPayments: o.splitPayments,
            treasury: o.treasury,
            date: o.createdAt ? String(o.createdAt).split('T')[0] : getTodayDateStr(),
            deliveryDate: o.deliveryDate,
            inspectionDate: o.inspectionDate,
            installationDate: o.installationDate,
            estimatorName: o.technicianName || 'أحمد كشك',
            rooms: o.rooms || [],
          });
        }
      });
    } catch {}

    const combined = Array.from(qMap.values());

    // مزامنة المبالغ المسددة من سندات التحصيل فى شاشة العملاء (جدول CustomerCollection الحقيقي)
    let collectionsList: any[] = [];
    try {
      collectionsList = await prisma.customerCollection.findMany();
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
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const body = await request.json();
    const rawList = Array.isArray(body.quotations) ? body.quotations : (Array.isArray(body) ? body : [body]);

    const results = [];
    for (const item of rawList) {
      if (!item || !item.id) continue;
      const { id, inspectionId, customerName, phone, address, branch, status, totalAmount, discountAmount, depositPaid, remainingAmount, paymentMethod, splitPayments, treasury, date, deliveryDate, inspectionDate, installationDate, estimatorName, rooms } = item;
      const effBranch = effectiveCreateBranch(scope, branch);

      // #GUARD: موظف مقيّد ميقدرش يعدّل عرض سعر تابع لفرع تاني حتى لو عرف الـ id.
      const existingQuotation = await prisma.quotationOrder.findUnique({ where: { id }, select: { branch: true, totalAmount: true } });
      if (existingQuotation && !scope.isAdmin && existingQuotation.branch !== scope.branch) {
        continue; // تجاهل هذا العنصر بصمت — باقي عناصر نفس الطلب (لو دفعة) لسه تتنفذ
      }

      // #GUARD: تعديل صافى عرض سعر موجود يتطلب صلاحية "تعديل الأسعار" فعليًا على
      // السيرفر، مش بس إخفاء الحقل فى الواجهة.
      if (existingQuotation && totalAmount !== undefined && Number(totalAmount) !== existingQuotation.totalAmount) {
        const pricePerm = await assertPagePermission(request, 'p_pricing', 'edit_price');
        if (!pricePerm.ok) continue; // تجاهل هذا العنصر — باقي عناصر الدفعة لسه تتنفذ
      }

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
          discountAmount: Number(discountAmount) || 0,
          depositPaid: Number(depositPaid) || 0,
          remainingAmount: Number(remainingAmount) || 0,
          paymentMethod: paymentMethod || 'نقدي (كاش)',
          splitPayments: splitPayments || undefined,
          treasury: treasury || undefined,
          date: date || getTodayDateStr(),
          deliveryDate: deliveryDate ? String(deliveryDate) : null,
          inspectionDate: inspectionDate ? String(inspectionDate) : null,
          installationDate: installationDate ? String(installationDate) : null,
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
          discountAmount: discountAmount !== undefined ? Number(discountAmount) : undefined,
          depositPaid: depositPaid !== undefined ? Number(depositPaid) : undefined,
          remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
          paymentMethod: paymentMethod || undefined,
          splitPayments: splitPayments !== undefined ? splitPayments : undefined,
          treasury: treasury !== undefined ? treasury : undefined,
          date: date !== undefined ? (date ? String(date) : undefined) : undefined,
          deliveryDate: deliveryDate !== undefined ? (deliveryDate ? String(deliveryDate) : null) : undefined,
          inspectionDate: inspectionDate !== undefined ? (inspectionDate ? String(inspectionDate) : null) : undefined,
          installationDate: installationDate !== undefined ? (installationDate ? String(installationDate) : null) : undefined,
          estimatorName: estimatorName || undefined,
          rooms: rooms !== undefined ? rooms : undefined,
        },
      });
      results.push(quotation);
    }

    return NextResponse.json({ success: true, quotation: results[0], quotations: results });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
