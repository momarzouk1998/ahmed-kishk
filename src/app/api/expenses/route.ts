import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { verifyAuthCookie } from '@/lib/auth';
import { getTodayDateStr } from '@/lib/dateUtils';
import { assertPagePermission } from '@/lib/permissionsServer';

export const dynamic = 'force-dynamic';

// GET → مصروفات فرع المستخدم بس، أو كل الفروع للأدمن العام
export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    const expenses = await prisma.expense.findMany({
      where: branchWhere(scope),
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, expenses });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

// POST { id?, date, category, description, amount, paymentMethod, branch? } — إنشاء/تعديل
export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    const user = await verifyAuthCookie(request);
    const body = await request.json();
    const { id, date, category, description, amount, paymentMethod, branch } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 });
    }

    const existingById = id ? await prisma.expense.findUnique({ where: { id } }) : null;

    // #GUARD: موظف مقيّد ميقدرش يعدّل مصروف فرع تاني حتى لو عرف الـ id.
    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل مصروف من فرع آخر' }, { status: 403 });
    }

    let expense;
    if (existingById) {
      expense = await prisma.expense.update({
        where: { id: existingById.id },
        data: {
          date: date || undefined,
          category: category || undefined,
          description: description !== undefined ? description : undefined,
          amount: amount !== undefined ? Number(amount) : undefined,
          paymentMethod: paymentMethod || undefined,
        },
      });
    } else {
      expense = await prisma.expense.create({
        data: {
          date: date || getTodayDateStr(),
          branch: effectiveCreateBranch(scope, branch),
          category: category || 'أخرى',
          description: description || '',
          amount: Number(amount) || 0,
          paymentMethod: paymentMethod || 'نقدي',
          createdByName: user?.name || user?.phone || undefined,
        },
      });
    }

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

// DELETE ?id= → أدمن أو صاحب الفرع بس
export async function DELETE(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'المعرف مطلوب للحذف' }, { status: 400 });

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'المصروف غير موجود' }, { status: 404 });
    }
    if (!scope.isAdmin && existing.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بحذف مصروف من فرع آخر' }, { status: 403 });
    }
    const perm = await assertPagePermission(request, 'p_expenses', 'delete');
    if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
