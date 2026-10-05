import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getBranchScope } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

const DEFAULT_RESET_PASSWORD = '123456';

// ريست باسورد أي موظف — للمدير العام فقط. بدون newPassword بيرجّع الباسورد
// الافتراضي (123456) والموظف يغيّره بنفسه من الملف الشخصي بعد أول دخول.
export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    if (!scope.isAdmin) {
      return NextResponse.json({ success: false, error: 'إعادة تعيين كلمة السر للمدير العام فقط' }, { status: 403 });
    }

    const body = await request.json();
    const phone = String(body?.phone || '').trim().replace(/\s/g, '');
    const newPassword = String(body?.newPassword || '').trim() || DEFAULT_RESET_PASSWORD;

    if (!phone) {
      return NextResponse.json({ success: false, error: 'رقم هاتف الموظف مطلوب' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'كلمة السر لازم تكون 6 أحرف/أرقام على الأقل' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'مفيش حساب دخول بالرقم ده' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });

    return NextResponse.json({ success: true, name: user.name, newPassword });
  } catch (error) {
    console.error('reset-password failed:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
