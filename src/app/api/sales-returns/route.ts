import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { generateUniqueSalesReturnNumber } from '@/lib/uniqueCode';
import { getTodayDateStr } from '@/lib/dateUtils';
import { assertPagePermission } from '@/lib/permissionsServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const returns = await prisma.salesReturn.findMany({
      where: branchWhere(scope),
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, returns });
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
    const {
      id, returnNumber, date, invoiceNumber, customerName, customerPhone,
      branch, reason, itemsDetail, refundAmount, refundMethod, notes,
    } = body;

    if (!customerName || !refundAmount) {
      return NextResponse.json({ success: false, error: 'اسم العميل ومبلغ المرتجع مطلوبان' }, { status: 400 });
    }

    // #FIX (مبدأ عدم تطابق الأكواد): id هو مفتاح التعديل الحقيقى الوحيد — مش رقم
    // المرتجع. رقم المرتجع الجديد بيتولّد ويتحقق منه فعليًا من قاعدة البيانات.
    const existingById = id ? await prisma.salesReturn.findUnique({ where: { id } }) : null;

    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل مرتجع فرع آخر' }, { status: 403 });
    }

    let ret;
    if (existingById) {
      ret = await prisma.salesReturn.update({
        where: { id: existingById.id },
        data: {
          reason: reason !== undefined ? reason : undefined,
          itemsDetail: itemsDetail !== undefined ? itemsDetail : undefined,
          refundAmount: refundAmount !== undefined ? Number(refundAmount) : undefined,
          refundMethod: refundMethod || undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });
    } else {
      let retNum = (returnNumber || '').trim();
      if (!retNum || (await prisma.salesReturn.findUnique({ where: { returnNumber: retNum } }))) {
        retNum = await generateUniqueSalesReturnNumber();
      }
      ret = await prisma.salesReturn.create({
        data: {
          id: `RET-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          returnNumber: retNum,
          date: date || getTodayDateStr(),
          invoiceNumber: invoiceNumber || '—',
          customerName,
          customerPhone: customerPhone || '',
          branch: effectiveCreateBranch(scope, branch),
          reason: reason || '',
          itemsDetail: itemsDetail || '',
          refundAmount: Number(refundAmount) || 0,
          refundMethod: refundMethod || 'نقدي',
          notes: notes || '',
        },
      });
    }

    return NextResponse.json({ success: true, return: ret });
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

    const existing = await prisma.salesReturn.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'المرتجع غير موجود' }, { status: 404 });
    }
    // #GUARD: موظف مقيّد ميقدرش يمسح مرتجع من فرع تاني حتى لو عرف الـ id.
    if (!scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بحذف مرتجع من فرع آخر' }, { status: 403 });
    }
    const perm = await assertPagePermission(request, 'p_fabric_sales', 'delete');
    if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

    await prisma.salesReturn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
