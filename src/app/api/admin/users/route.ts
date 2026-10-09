import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

// قائمة حسابات الدخول الحقيقية من قاعدة البيانات (بدون الباسورد) — للمدير العام فقط.
export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    if (!scope.isAdmin) return NextResponse.json({ success: false, error: 'للمدير العام فقط' }, { status: 403 });

    const users = await prisma.user.findMany({
      select: { id: true, name: true, phone: true, role: true, branch: true },
      orderBy: [{ branch: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('list users failed:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
