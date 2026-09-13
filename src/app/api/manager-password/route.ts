import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { verifyBranchPricePassword } from '@/lib/branchPricePasswords';

export const dynamic = 'force-dynamic';

// POST { password } — تحقق من باسورد أسعار فرع الموظف الحالى (يستخدمه مودال فتح تعديل السعر)
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ ok: false, error: 'غير مصرح' }, { status: 401 });

    const body = await request.json();
    const pwd = String(body?.password || '').trim();
    if (!pwd) return NextResponse.json({ ok: false, error: 'كلمة السر مطلوبة' }, { status: 400 });

    // #FEATURE: باسورد منفصل لكل فرع (بيديره مدير الفرع)، بدل باسورد واحد مشترك للنظام
    // كله. الموظف بيتحقق دايمًا ضد باسورد فرعه هو تحديدًا، مش أي فرع تاني.
    const branch = user.branch || 'الفرع الرئيسي';
    const ok = await verifyBranchPricePassword(branch, pwd);
    if (!ok) return NextResponse.json({ ok: false, error: 'كلمة سر مدير الفرع غير صحيحة' }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}
