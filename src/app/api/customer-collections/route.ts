import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { getTodayDateStr } from '@/lib/dateUtils';
import { syncCustomerOrdersFromCollections } from '@/lib/customerCollectionsSync';
import { assertPagePermission } from '@/lib/permissionsServer';

export const dynamic = 'force-dynamic';

// ⚠️ يستبدل التصميم القديم اللي كان بيخزّن كل سندات التحصيل لكل العملاء فى
// مصفوفة JSON واحدة مشتركة (SystemStore key: ahmed_kishk_collections_v3)، وأي
// إضافة/تعديل/حذف كانت تستبدل المصفوفة **كاملة** — فلو مستخدمين اتنين ضافوا سند
// لعميلين مختلفين فى نفس اللحظة تقريبًا، اللي يحفظ تاني كان يمحي سند التاني
// بصمت ومن غير أي رسالة خطأ. كل سند دلوقتى صف مستقل حقيقي فى CustomerCollection.

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const collections = await prisma.customerCollection.findMany({
      where: branchWhere(scope),
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, collections });
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
    const { id, date, customerId, customerName, phone, branch, amount, method, treasury, notes } = body;

    if (!customerId || !customerName || !amount) {
      return NextResponse.json({ success: false, error: 'العميل والمبلغ مطلوبان' }, { status: 400 });
    }

    const existingById = id ? await prisma.customerCollection.findUnique({ where: { id } }) : null;
    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل سند فرع آخر' }, { status: 403 });
    }

    const collectionId = id || `COL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const collection = await prisma.customerCollection.upsert({
      where: { id: collectionId },
      create: {
        id: collectionId,
        date: date || getTodayDateStr(),
        customerId,
        customerName,
        phone: phone || '',
        branch: effectiveCreateBranch(scope, branch),
        amount: Number(amount) || 0,
        method: method || 'نقدي',
        treasury: treasury || 'خزينة الفرع الرئيسي (سعد زغلول)',
        notes: notes || '',
      },
      update: {
        date: date || undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        method: method || undefined,
        treasury: treasury || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    // بعد حفظ السند، أعِد حساب مديونية عروض الأسعار/أوردرات خط الإنتاج التابعة
    // لنفس العميل بناءً على إجمالي سنداته الحقيقي فى الجدول (مش مصفوفة كاملة).
    await syncCustomerOrdersFromCollections(collection.customerName, collection.phone);

    return NextResponse.json({ success: true, collection });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب للحذف' }, { status: 400 });
    }

    const existing = await prisma.customerCollection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: true }); // محذوف بالفعل — لا داعى لخطأ
    }
    if (!scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بحذف سند فرع آخر' }, { status: 403 });
    }
    const perm = await assertPagePermission(request, 'p_customers', 'delete');
    if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

    await prisma.customerCollection.delete({ where: { id } });
    await syncCustomerOrdersFromCollections(existing.customerName, existing.phone);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
