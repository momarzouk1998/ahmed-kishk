import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { verifyBranchPricePassword, setBranchPricePassword } from '@/lib/branchPricePasswords';

export const dynamic = 'force-dynamic';

// POST { currentPassword, newPassword } — أي مستخدم (مدير الفرع عمليًا) يقدر يغيّر
// باسورد فرعه هو بس، بشرط إنه يعرف الباسورد الحالى أولاً (بديل عن اشتراط role=ADMIN،
// لأن الكاشير نفسه مش مفروض يعرف الباسورد الحالى أصلاً). التغيير بيظهر فورًا لصفحة
// /branches للأدمن لأنهم بيقروا من نفس التخزين المشترك (SystemStore).
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const body = await request.json();
    const currentPassword = String(body?.currentPassword || '').trim();
    const newPassword = String(body?.newPassword || '').trim();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'كلمة السر الحالية والجديدة مطلوبتان' }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'كلمة السر الجديدة يجب أن تكون 4 خانات على الأقل' }, { status: 400 });
    }

    const branch = user.branch || 'الفرع الرئيسي';
    const isCurrentValid = await verifyBranchPricePassword(branch, currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'كلمة السر الحالية غير صحيحة' }, { status: 401 });
    }

    await setBranchPricePassword(branch, newPassword);
    return NextResponse.json({ ok: true, branch });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
