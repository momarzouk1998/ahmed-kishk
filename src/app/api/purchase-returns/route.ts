import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { generateUniquePurchaseReturnNumber } from '@/lib/uniqueCode';
import { getTodayDateStr } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const returns = await prisma.purchaseReturn.findMany({
      where: branchWhere(scope),
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, returns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
      id, returnNumber, date, invoiceNumber, supplierName, supplierPhone,
      branch, reason, itemsDetail, refundAmount, refundMethod, notes,
    } = body;

    if (!supplierName || !refundAmount) {
      return NextResponse.json({ success: false, error: 'اسم المورد ومبلغ المرتجع مطلوبان' }, { status: 400 });
    }

    // #FIX (مبدأ عدم تطابق الأكواد): كان retId بيتحدد من returnNumber مباشرة لو
    // id مش متبعوت — يعني تعارض فى الرقم كان بيتحول تلقائيًا لتعارض فى الـ id
    // ويعمل upsert (تعديل صامت) بدل ما يترفض أو يتولّد له رقم بديل. دلوقتى:
    // id هو مفتاح التعديل الحقيقى الوحيد، ورقم المرتجع الجديد بيتولّد ويتحقق منه
    // فعليًا من قاعدة البيانات عند الإنشاء.
    const existingById = id ? await prisma.purchaseReturn.findUnique({ where: { id } }) : null;

    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل مرتجع فرع آخر' }, { status: 403 });
    }

    let ret;
    if (existingById) {
      ret = await prisma.purchaseReturn.update({
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
      if (!retNum || (await prisma.purchaseReturn.findUnique({ where: { returnNumber: retNum } }))) {
        retNum = await generateUniquePurchaseReturnNumber();
      }
      ret = await prisma.purchaseReturn.create({
        data: {
          id: `PRET-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          returnNumber: retNum,
          date: date || getTodayDateStr(),
          invoiceNumber: invoiceNumber || '—',
          supplierName,
          supplierPhone: supplierPhone || '',
          branch: effectiveCreateBranch(scope, branch),
          reason: reason || '',
          itemsDetail: itemsDetail || '',
          refundAmount: Number(refundAmount) || 0,
          refundMethod: refundMethod || 'نقدي (كاش)',
          notes: notes || '',
        },
      });
    }

    return NextResponse.json({ success: true, return: ret });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    // #GUARD: موظف مقيّد ميقدرش يمسح مرتجع من فرع تاني حتى لو عرف الـ id.
    if (!scope.isAdmin) {
      const existing = await prisma.purchaseReturn.findUnique({ where: { id } });
      if (existing && existing.branch !== scope.branch) {
        return NextResponse.json({ success: false, error: 'غير مصرح بحذف مرتجع من فرع آخر' }, { status: 403 });
      }
    }

    await prisma.purchaseReturn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
